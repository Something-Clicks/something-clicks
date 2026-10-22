// Runs against a real Postgres with the migrations applied (see scripts/test-db.sh).
// Skipped when TEST_DATABASE_URL is not set. Every test runs in a transaction that is rolled back.
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite("database: credits, Stripe idempotency, RLS", () => {
  const db = new Client({ connectionString: url });
  const one = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
    (await db.query(sql, params)).rows[0] as T;

  beforeAll(() => db.connect());
  afterAll(() => db.end());
  beforeEach(() => db.query("begin"));
  afterEach(() => db.query("rollback"));

  async function makeBuyer(email = "buyer@example.com") {
    const { id: userId } = await one<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data) values ($1, '{"signup_as":"buyer"}') returning id`,
      [email],
    );
    const { id } = await one<{ id: string }>(
      `insert into buyers (user_id, company_name, contact_name, email, phone, terms_version, terms_agreed_at)
       values ($1, 'Sparkle Co', 'Alex', $2, '8015550100', 'v1', now()) returning id`,
      [userId, email],
    );
    return { buyerId: id, userId };
  }

  async function makePurchase(buyerId: string, session = "cs_1", credits = 5, amount = 50000) {
    await db.query(
      `insert into credit_purchases (buyer_id, pack_name, credits, amount_cents, stripe_checkout_session_id)
       values ($1, 'Pilot', $2, $3, $4)`,
      [buyerId, credits, amount, session],
    );
  }

  const balance = (buyerId: string) =>
    one<{ available: number; reserved: number; purchased: number; consumed: number }>(
      "select available, reserved, purchased, consumed from buyer_credit_balances where buyer_id = $1",
      [buyerId],
    );
  const credit = (session: string, amount = 50000, currency = "usd") =>
    one<{ r: string }>("select credit_purchase_paid($1, 'pi_1', $2, $3) as r", [session, amount, currency]).then((x) => x.r);
  const refund = (amount: number) =>
    one<{ r: string }>("select record_purchase_refund('pi_1', $1) as r", [amount]).then((x) => x.r);

  it("signup creates a buyer profile, and admin can never be self-assigned", async () => {
    const { userId } = await makeBuyer();
    expect((await one("select role from profiles where id = $1", [userId])).role).toBe("buyer");
    const { id } = await one<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data) values ('x@example.com', '{"signup_as":"admin"}') returning id`,
    );
    expect((await one("select role from profiles where id = $1", [id])).role).toBeNull();
  });

  it("credits a paid purchase exactly once", async () => {
    const { buyerId } = await makeBuyer();
    await makePurchase(buyerId);
    expect(await credit("cs_1")).toBe("credited");
    expect(await credit("cs_1")).toBe("already_credited");
    expect(await balance(buyerId)).toMatchObject({ available: 5, purchased: 5 });
    expect((await one("select count(*)::int as n from credit_ledger where buyer_id = $1", [buyerId])).n).toBe(1);
  });

  it("refuses to credit when Stripe's amount or currency differs", async () => {
    const { buyerId } = await makeBuyer();
    await makePurchase(buyerId);
    expect(await credit("cs_1", 100)).toBe("amount_mismatch");
    expect((await one("select status from credit_purchases")).status).toBe("needs_review");
    expect(await credit("cs_1", 50000, "eur")).toBe("amount_mismatch");
    expect((await balance(buyerId)).available).toBe(0);
  });

  it("returns not_found for sessions that aren't ours", async () => {
    expect(await credit("cs_unknown")).toBe("not_found");
  });

  it("status updates never move a paid purchase backwards", async () => {
    const { buyerId } = await makeBuyer();
    await makePurchase(buyerId);
    expect((await one("select set_purchase_status('cs_1', 'processing') as r")).r).toBe("updated");
    await credit("cs_1");
    expect((await one("select set_purchase_status('cs_1', 'failed') as r")).r).toBe("no_change");
    expect((await one("select status from credit_purchases")).status).toBe("paid");
  });

  it("refunds remove credits proportionally (rounded up) and replays change nothing", async () => {
    const { buyerId } = await makeBuyer();
    await makePurchase(buyerId);
    await credit("cs_1");
    expect(await refund(15000)).toBe("recorded"); // 30% of 5 credits = 1.5 -> 2
    expect((await balance(buyerId)).available).toBe(3);
    expect(await refund(15000)).toBe("no_change");
    expect(await refund(10000)).toBe("no_change");
    expect(await refund(50000)).toBe("recorded");
    expect((await balance(buyerId)).available).toBe(0);
    expect(await one("select status, credits_refunded from credit_purchases")).toMatchObject({
      status: "refunded",
      credits_refunded: 5,
    });
  });

  it("a refund on an uncredited purchase removes no credits", async () => {
    const { buyerId } = await makeBuyer();
    await makePurchase(buyerId);
    await db.query("update credit_purchases set stripe_payment_intent_id = 'pi_1'");
    expect(await refund(50000)).toBe("not_credited");
    expect((await balance(buyerId)).available).toBe(0);
  });

  it("ledger math: reserve, release, consume, adjustments", async () => {
    const { buyerId } = await makeBuyer();
    await makePurchase(buyerId);
    await credit("cs_1");
    const a1 = "00000000-0000-0000-0000-0000000000a1";
    const a2 = "00000000-0000-0000-0000-0000000000a2";
    await db.query(
      `insert into credit_ledger (buyer_id, entry_type, delta, appointment_id) values
        ($1, 'reserve', -1, $2), ($1, 'reserve', -1, $3), ($1, 'consume', 0, $2), ($1, 'release', 1, $3)`,
      [buyerId, a1, a2],
    );
    await db.query(`insert into credit_ledger (buyer_id, entry_type, delta, note) values ($1, 'adjustment', 2, 'goodwill')`, [buyerId]);
    expect(await balance(buyerId)).toEqual({ available: 6, reserved: 0, purchased: 5, consumed: 1 });
  });

  it("an appointment can be reserved once and settled once (release OR consume)", async () => {
    const { buyerId } = await makeBuyer();
    const a = "00000000-0000-0000-0000-0000000000b1";
    await db.query(`insert into credit_ledger (buyer_id, entry_type, delta, appointment_id) values ($1, 'reserve', -1, $2)`, [buyerId, a]);
    await db.query("savepoint s");
    await expect(
      db.query(`insert into credit_ledger (buyer_id, entry_type, delta, appointment_id) values ($1, 'reserve', -1, $2)`, [buyerId, a]),
    ).rejects.toThrow(/credit_ledger_one_reserve_per_appointment/);
    await db.query("rollback to savepoint s");
    await db.query(`insert into credit_ledger (buyer_id, entry_type, delta, appointment_id) values ($1, 'consume', 0, $2)`, [buyerId, a]);
    await expect(
      db.query(`insert into credit_ledger (buyer_id, entry_type, delta, appointment_id) values ($1, 'release', 1, $2)`, [buyerId, a]),
    ).rejects.toThrow(/credit_ledger_one_settlement_per_appointment/);
  });

  it("the ledger is append-only and rejects malformed entries", async () => {
    const { buyerId } = await makeBuyer();
    await db.query(`insert into credit_ledger (buyer_id, entry_type, delta, note) values ($1, 'adjustment', 1, 'x')`, [buyerId]);
    await db.query("savepoint s");
    await expect(db.query("update credit_ledger set delta = 100")).rejects.toThrow(/append-only/);
    await db.query("rollback to savepoint s");
    await expect(db.query("delete from credit_ledger")).rejects.toThrow(/append-only/);
    await db.query("rollback to savepoint s");
    await expect(
      db.query(`insert into credit_ledger (buyer_id, entry_type, delta, appointment_id) values ($1, 'reserve', -3, gen_random_uuid())`, [buyerId]),
    ).rejects.toThrow(/check/);
  });

  it("Stripe events: new, then retry after failure, then done", async () => {
    expect((await one("select begin_stripe_event('evt_1', 't') as r")).r).toBe("new");
    expect((await one("select begin_stripe_event('evt_1', 't') as r")).r).toBe("retry");
    await db.query("select finish_stripe_event('evt_1', false, 'boom')");
    expect((await one("select begin_stripe_event('evt_1', 't') as r")).r).toBe("retry");
    await db.query("select finish_stripe_event('evt_1', true)");
    expect((await one("select begin_stripe_event('evt_1', 't') as r")).r).toBe("done");
    expect((await one("select attempts from stripe_events where id = 'evt_1'")).attempts).toBe(4);
  });

  it("blocks a second live partner application from the same email", async () => {
    const insert = `insert into partner_applications (full_name, business_name, email, phone, partner_type, referral_plan, terms_version, terms_agreed_at)
                    values ('Jane', 'Biz', $1, '8015550100', 'leasing_agent', 'plan', 'v1', now()) returning id`;
    const { id } = await one<{ id: string }>(insert, ["jane@example.com"]);
    await db.query("savepoint s");
    await expect(db.query(insert, ["JANE@example.com"])).rejects.toThrow(/partner_applications_one_active_per_email/);
    await db.query("rollback to savepoint s");
    await db.query("update partner_applications set status = 'rejected' where id = $1", [id]);
    await db.query(insert, ["jane@example.com"]); // may re-apply after rejection
  });

  it("referrals cannot be shared without recorded consent", async () => {
    const base = `insert into referrals (source, business_name, contact_name, email, phone, address_line1, city, zip, address_key,
                    property_type, cleaning_frequency, is_decision_maker, status, consent_at, consent_text_version)
                  values ('direct', 'Acme', 'Pat', 'p@acme.com', '8015550100', '1 Main', 'SLC', '84101', 'k', 'office', 'weekly', true, $1, $2, $3)`;
    await db.query("savepoint s");
    await expect(db.query(base, ["waiting_for_match", null, null])).rejects.toThrow(/check/);
    await db.query("rollback to savepoint s");
    await db.query(base, ["waiting_for_match", new Date(), "2026-10-v1"]);
    await db.query(base, ["awaiting_business_confirmation", null, null]);
  });

  describe("row level security", () => {
    const asUser = async (userId: string | null) => {
      await db.query(`set local role ${userId ? "authenticated" : "anon"}`);
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    };

    it("buyers see only their own buyer row, purchases, and ledger", async () => {
      const a = await makeBuyer("a@example.com");
      const b = await makeBuyer("b@example.com");
      await makePurchase(a.buyerId, "cs_a");
      await makePurchase(b.buyerId, "cs_b");
      await asUser(a.userId);
      expect((await db.query("select id from buyers")).rows.map((r) => r.id)).toEqual([a.buyerId]);
      expect((await db.query("select stripe_checkout_session_id from credit_purchases")).rows).toEqual([
        { stripe_checkout_session_id: "cs_a" },
      ]);
      expect((await db.query("select buyer_id from buyer_credit_balances")).rows).toEqual([{ buyer_id: a.buyerId }]);
    });

    it("browsers cannot write money tables or read private tables", async () => {
      const a = await makeBuyer();
      await asUser(a.userId);
      await db.query("savepoint s");
      await expect(
        db.query(`insert into credit_ledger (buyer_id, entry_type, delta, note) values ($1, 'adjustment', 99, 'free')`, [a.buyerId]),
      ).rejects.toThrow(/permission denied/);
      await db.query("rollback to savepoint s");
      await expect(db.query("update buyers set status = 'approved'")).rejects.toThrow(/permission denied/);
      await db.query("rollback to savepoint s");
      await expect(db.query("select * from referrals")).rejects.toThrow(/permission denied/);
      await db.query("rollback to savepoint s");
      await expect(db.query("select credit_purchase_paid('cs_1', 'pi', 1, 'usd')")).rejects.toThrow(/permission denied/);
    });

    it("anonymous visitors see nothing private", async () => {
      await makeBuyer();
      await asUser(null);
      expect((await db.query("select * from buyers")).rows).toEqual([]);
      await db.query("savepoint s");
      await expect(db.query("select * from partner_applications")).rejects.toThrow(/permission denied/);
    });

    it("admins can read every buyer", async () => {
      await makeBuyer("a@example.com");
      await makeBuyer("b@example.com");
      const { id } = await one<{ id: string }>(`insert into auth.users (email) values ('admin@example.com') returning id`);
      await db.query("update profiles set role = 'admin' where id = $1", [id]);
      await asUser(id);
      expect((await db.query("select id from buyers")).rows).toHaveLength(2);
    });
  });
});
