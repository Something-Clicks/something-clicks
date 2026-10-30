import { describe, expect, it, vi } from "vitest";
import { createMemoryStore } from "@/lib/store/memory";
import type { Store } from "@/lib/store/types";
import { handleSubmission, MIN_FILL_MS, RATE_LIMITS } from "@/lib/submissions";
import { attribution, validApplication, validContact, validReferral } from "./fixtures";

const NOW = 1_800_000_000_000;
const ctx = { ipHash: "abc123", attribution };

function setup(store: Store = createMemoryStore()) {
  const notify = vi.fn().mockResolvedValue(undefined);
  const log = vi.fn();
  return { store, notify, log, deps: { store, notify, log, now: () => NOW } };
}

describe("handleSubmission", () => {
  it("saves a valid application with attribution and consent, then notifies", async () => {
    const { store, notify, deps } = setup();
    const result = await handleSubmission("applications", { ...validApplication(), form_started_at: String(NOW - 60_000) }, ctx, deps);
    expect(result.status).toBe("ok");
    const [row] = await store.list("applications", {});
    expect(row).toMatchObject({
      business_name: "Wasatch Office Movers",
      email: "pat@example.com",
      consent_contact: true,
      consent_updates: false,
      status: "new",
      source_page: "/join",
      utm_campaign: "pilot",
    });
    expect(row).not.toHaveProperty("form_started_at");
    expect(row).not.toHaveProperty("company_website");
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ kind: "applications", id: row.id }));
    expect(await store.eventCounts(1)).toEqual([{ form: "application", event: "form_submit", count: 1 }]);
  });

  it("saves referral partners and contact messages", async () => {
    const { store, deps } = setup();
    expect((await handleSubmission("referrals", validReferral(), ctx, deps)).status).toBe("ok");
    expect((await handleSubmission("contacts", validContact(), ctx, deps)).status).toBe("ok");
    expect(await store.list("referrals", {})).toHaveLength(1);
    expect(await store.list("contacts", {})).toHaveLength(1);
  });

  it("fakes success for honeypot submissions without saving or notifying", async () => {
    const { store, notify, deps } = setup();
    const result = await handleSubmission("contacts", { ...validContact(), company_website: "http://spam" }, ctx, deps);
    expect(result).toEqual({ status: "ok", spam: true });
    expect(await store.list("contacts", {})).toHaveLength(0);
    expect(notify).not.toHaveBeenCalled();
  });

  it("fakes success for submissions faster than a person could type", async () => {
    const { store, deps } = setup();
    const result = await handleSubmission("contacts", { ...validContact(), form_started_at: String(NOW - MIN_FILL_MS + 1) }, ctx, deps);
    expect(result).toEqual({ status: "ok", spam: true });
    expect(await store.list("contacts", {})).toHaveLength(0);
  });

  it("returns field errors for invalid input and saves nothing", async () => {
    const { store, deps } = setup();
    const result = await handleSubmission("contacts", { ...validContact(), email: "nope" }, ctx, deps);
    expect(result.status).toBe("invalid");
    expect(result.status === "invalid" && result.errors.email).toBeTruthy();
    expect(await store.list("contacts", {})).toHaveLength(0);
  });

  it("rate limits repeated submissions from one visitor", async () => {
    const { store, deps } = setup();
    const max = RATE_LIMITS.contacts.max;
    for (let i = 0; i < max; i++) expect((await handleSubmission("contacts", validContact(), ctx, deps)).status).toBe("ok");
    expect((await handleSubmission("contacts", validContact(), ctx, deps)).status).toBe("rate_limited");
    // A different visitor is unaffected.
    expect((await handleSubmission("contacts", validContact(), { ...ctx, ipHash: "other" }, deps)).status).toBe("ok");
    expect(await store.list("contacts", {})).toHaveLength(max + 1);
  });

  it("does not count invalid attempts against the rate limit", async () => {
    const { deps } = setup();
    for (let i = 0; i < 10; i++) await handleSubmission("contacts", { ...validContact(), email: "bad" }, ctx, deps);
    expect((await handleSubmission("contacts", validContact(), ctx, deps)).status).toBe("ok");
  });

  it("reports an error when the database is unavailable", async () => {
    const store = { ...createMemoryStore(), insert: vi.fn().mockRejectedValue(new Error("db down")) };
    const { notify, log, deps } = setup(store);
    expect((await handleSubmission("contacts", validContact(), ctx, deps)).status).toBe("error");
    expect(notify).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });

  it("still succeeds when the email notification fails", async () => {
    const { store, notify, log, deps } = setup();
    notify.mockRejectedValue(new Error("resend down"));
    expect((await handleSubmission("contacts", validContact(), ctx, deps)).status).toBe("ok");
    expect(await store.list("contacts", {})).toHaveLength(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("notification"), expect.any(Error));
  });

  it("fails open if the rate limiter errors", async () => {
    const store = { ...createMemoryStore(), checkRateLimit: vi.fn().mockRejectedValue(new Error("rpc failed")) };
    const { deps } = setup(store);
    expect((await handleSubmission("contacts", validContact(), ctx, deps)).status).toBe("ok");
  });
});
