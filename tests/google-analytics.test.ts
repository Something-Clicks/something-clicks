import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleAnalytics, gaMeasurementId } from "@/components/GoogleAnalytics";

afterEach(() => vi.unstubAllEnvs());

describe("Google Analytics configuration", () => {
  it("reads GA_MEASUREMENT_ID on the server", () => {
    vi.stubEnv("GA_MEASUREMENT_ID", "G-ABC1234");
    expect(gaMeasurementId()).toBe("G-ABC1234");
  });

  it("is off when unset, blank, or not a GA4 ID", () => {
    vi.stubEnv("GA_MEASUREMENT_ID", "");
    expect(gaMeasurementId()).toBeNull();
    expect(gaMeasurementId("UA-12345-1")).toBeNull();
    expect(gaMeasurementId("G-<script>")).toBeNull();
    expect(gaMeasurementId(" G-ABC1234 ")).toBe("G-ABC1234");
  });

  it("ignores the old NEXT_PUBLIC_ variable", () => {
    vi.stubEnv("GA_MEASUREMENT_ID", "");
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-ABC1234");
    expect(gaMeasurementId()).toBeNull();
  });

  it("renders nothing without an ID and the gtag scripts with one", () => {
    expect(GoogleAnalytics({ measurementId: null })).toBeNull();
    const out = JSON.stringify(GoogleAnalytics({ measurementId: "G-ABC1234" }));
    expect(out).toContain("googletagmanager.com/gtag/js?id=G-ABC1234");
    expect(out).toContain("allow_ad_personalization_signals:false");
  });
});
