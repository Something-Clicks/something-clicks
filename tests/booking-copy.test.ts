import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// No response time has been confirmed, so the booking flow must not promise one (public messages,
// the business's email, or the admin alert and instructions).
const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("booking flow copy", () => {
  const files = ["src/app/book/actions.ts", "src/app/admin/requests/page.tsx"];

  it.each(files)("%s promises no response time", (file) => {
    const source = read(file);
    expect(source).not.toMatch(/business days?/i);
    expect(source).not.toMatch(/within (?:one|two|\d+) (?:hours?|days?)/i);
  });

  it("still tells the business what happens next", () => {
    const source = read("src/app/book/actions.ts");
    expect(source).toContain("follow up with next steps");
    expect(source).toContain("We already have a walkthrough request for this business.");
  });
});
