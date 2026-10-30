import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("CSV export", () => {
  it("quotes commas, quotes, and newlines", () => {
    expect(csvCell('He said "hi", then left')).toBe('"He said ""hi"", then left"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(csvCell("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(csvCell("+1 801")).toBe("'+1 801");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-2")).toBe("'-2");
  });

  it("flattens arrays and handles empty values", () => {
    expect(csvCell(["Sandy", "Murray"])).toBe("Sandy; Murray");
    expect(csvCell(null)).toBe("");
    expect(csvCell(true)).toBe("true");
  });

  it("builds a UTF-8 file with a header row", () => {
    const csv = toCsv([{ key: "a", label: "A" }, { key: "b", label: "B" }], [{ a: "1–2", b: "x" }]);
    expect(csv).toBe("﻿A,B\r\n1–2,x\r\n");
  });
});
