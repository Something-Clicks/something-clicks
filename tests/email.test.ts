import { afterEach, describe, expect, it, vi } from "vitest";
import { buildEmail, notifyOwner } from "@/lib/email";

const n = {
  kind: "contacts" as const,
  id: "123",
  record: { name: "<script>alert(1)</script>", email: "sam@example.com", topic: "claim", message: "Hi", source_page: "/contact" },
};

afterEach(() => vi.unstubAllEnvs());

describe("owner notification email", () => {
  it("escapes submitted content and links to the admin", () => {
    const email = buildEmail(n, "https://somethingclicks.com/");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.text).toContain("https://somethingclicks.com/admin/contacts/123");
    expect(email.replyTo).toBe("sam@example.com");
    expect(email.subject).toMatch(/^New contact message/);
  });

  it("skips quietly when not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchImpl = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await notifyOwner(n, fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts to Resend with the configured recipients", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("NOTIFY_EMAIL_TO", "matt@example.com, team@example.com");
    vi.stubEnv("NOTIFY_EMAIL_FROM", "Something Clicks <alerts@somethingclicks.com>");
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await notifyOwner(n, fetchImpl);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["matt@example.com", "team@example.com"]);
    expect(body.reply_to).toBe("sam@example.com");
  });

  it("throws on a Resend error so the caller can log it", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("NOTIFY_EMAIL_TO", "matt@example.com");
    vi.stubEnv("NOTIFY_EMAIL_FROM", "alerts@somethingclicks.com");
    const fetchImpl = vi.fn().mockResolvedValue(new Response("bad domain", { status: 403 }));
    await expect(notifyOwner(n, fetchImpl)).rejects.toThrow(/403/);
  });
});
