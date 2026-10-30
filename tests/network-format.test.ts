import { describe, expect, it } from "vitest";
import { formatAtLeast, formatMiles, formatPhone } from "@/content/network";

describe("formatAtLeast", () => {
  it("rounds down to two significant digits and never overstates", () => {
    expect(formatAtLeast(242325)).toBe("240,000+");
    expect(formatAtLeast(249999)).toBe("240,000+");
    expect(formatAtLeast(5218)).toBe("5,200+");
    expect(formatAtLeast(1999)).toBe("1,900+");
    expect(formatAtLeast(150)).toBe("150");
    expect(formatAtLeast(87)).toBe("87");
    expect(formatAtLeast(0)).toBe("0");
  });
});

describe("formatMiles", () => {
  it("shows one decimal under 10 miles", () => {
    expect(formatMiles(1609.344)).toBe("1.0 mi");
    expect(formatMiles(20000)).toBe("12 mi");
  });
});

describe("formatPhone", () => {
  it("formats US numbers and leaves others alone", () => {
    expect(formatPhone("+12815072162")).toBe("(281) 507-2162");
    expect(formatPhone("817-480-0894")).toBe("(817) 480-0894");
    expect(formatPhone("+44 20 7946 0958")).toBe("+44 20 7946 0958");
  });
});
