import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromoteKitTest, promoteKitResultMessage } from "@/app/admin/settings/promotekit-test";
import { PROMOTEKIT_API_BASE, testPromoteKitConnection } from "@/lib/promotekit";

const KEY = "pk_test_SECRET_key_value_123";
const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8");
const respond = (status: number, body = '{"data":[{"email":"someone@example.com"}]}') =>
  vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch;

afterEach(() => vi.restoreAllMocks());

describe("testPromoteKitConnection", () => {
  it("makes exactly one read-only GET to list affiliates with Bearer auth", async () => {
    const fetchMock = respond(200);
    await testPromoteKitConnection(KEY, fetchMock);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(`${PROMOTEKIT_API_BASE}/affiliates`);
    expect(url).toBe("https://www.promotekit.com/api/v1/affiliates");
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`);
  });

  it.each([
    [200, { status: "connected" }],
    [204, { status: "connected" }],
    [401, { status: "unauthorized" }],
    [403, { status: "forbidden" }],
    [404, { status: "unexpected", httpStatus: 404 }],
    [429, { status: "unexpected", httpStatus: 429 }],
    [500, { status: "unexpected", httpStatus: 500 }],
  ])("maps HTTP %i to %o", async (code, expected) => {
    const body = code === 204 ? null : "{}";
    expect(await testPromoteKitConnection(KEY, respond(code, body as string))).toEqual(expected);
  });

  it("reports unreachable on a network error", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await testPromoteKitConnection(KEY, fetchMock)).toEqual({ status: "unreachable" });
  });

  it("reports unreachable on a timeout", async () => {
    const hang = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(init.signal?.reason))),
    ) as unknown as typeof fetch;
    expect(await testPromoteKitConnection(KEY, hang, 20)).toEqual({ status: "unreachable" });
  });

  it("reports not_configured without a key and makes no request", async () => {
    const fetchMock = respond(200);
    expect(await testPromoteKitConnection("", fetchMock)).toEqual({ status: "not_configured" });
    expect(await testPromoteKitConnection(undefined, fetchMock)).toEqual({ status: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads PROMOTEKIT_API_KEY by default", async () => {
    vi.stubEnv("PROMOTEKIT_API_KEY", KEY);
    const fetchMock = respond(200);
    await testPromoteKitConnection(undefined as unknown as string, fetchMock).catch(() => {});
    // undefined argument -> default parameter -> process.env.PROMOTEKIT_API_KEY
    const [, init] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`);
    vi.unstubAllEnvs();
  });

  it("never exposes the key or the response body, and logs nothing", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m));
    const outcomes = await Promise.all(
      [200, 401, 403, 500].map((code) => testPromoteKitConnection(KEY, respond(code))),
    );
    const serialized = JSON.stringify(outcomes);
    expect(serialized).not.toContain(KEY);
    expect(serialized).not.toContain("someone@example.com");
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe("admin connection test UI", () => {
  it("explains each result plainly without showing the key", () => {
    expect(promoteKitResultMessage({ status: "connected" }).text).toMatch(/^Connected\./);
    expect(promoteKitResultMessage({ status: "unauthorized" }).text).toMatch(/^401: PromoteKit rejected the API key/);
    expect(promoteKitResultMessage({ status: "forbidden" }).text).toMatch(/^403: The PromoteKit account has no active or trialing plan/);
    expect(promoteKitResultMessage({ status: "unreachable" }).text).toMatch(/^Couldn't reach PromoteKit/);
    expect(promoteKitResultMessage({ status: "not_configured" }).text).toContain("PROMOTEKIT_API_KEY isn't set");
    expect(promoteKitResultMessage({ status: "unexpected", httpStatus: 404 }).text).toContain("(404)");
  });

  it("renders the button with an announced result area", () => {
    const html = renderToStaticMarkup(<PromoteKitTest />);
    expect(html).toContain("Test PromoteKit connection");
    expect(html).toMatch(/role="status" aria-live="polite"/);
    expect(html).toContain("one read-only request (list affiliates)");
  });

  it("is on the admin settings page and the action is admin-only", () => {
    expect(read("src/app/admin/settings/page.tsx")).toContain("<PromoteKitTest />");
    expect(read("src/app/admin/actions.ts")).toMatch(
      /export async function checkPromoteKitConnection\(\)[^{]*\{\s*await requireAdmin\(\);\s*return testPromoteKitConnection\(\);/,
    );
  });

  it("leaves PromoteKit in mock mode and builds no partner integration", () => {
    expect(read(".env.example")).toContain("PROMOTEKIT_MODE=mock");
    const lib = read("src/lib/promotekit.ts");
    expect(lib).not.toMatch(/method:\s*"(POST|PUT|PATCH|DELETE)"/);
    expect(lib).not.toMatch(/\/(referrals|commissions|payouts)/);
  });
});
