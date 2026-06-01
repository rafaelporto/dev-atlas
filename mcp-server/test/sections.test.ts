import { describe, it, expect } from "vitest";
import { extractH2Section } from "../src/articles/sections.js";

describe("extractH2Section", () => {
  it("returns the body between the matching H2 and the next H2", () => {
    const body = [
      "## Overview",
      "Intro paragraph.",
      "",
      "## When NOT to use",
      "Do not use it for X.",
      "",
      "Avoid Y as well.",
      "",
      "## References",
      "- link",
    ].join("\n");
    expect(extractH2Section(body, "When NOT to use")).toBe(
      "Do not use it for X.\n\nAvoid Y as well.",
    );
  });

  it("returns null when no heading matches", () => {
    const body = "## Overview\nNothing else here.\n";
    expect(extractH2Section(body, "When NOT to use")).toBeNull();
  });

  it("matches case-insensitively", () => {
    const body = "## when not to use\nLowercase heading body.\n";
    expect(extractH2Section(body, "When NOT to use")).toBe(
      "Lowercase heading body.",
    );
  });

  it("tolerates extra whitespace between tokens", () => {
    const body = "## When  NOT   to  use\nIrregular spacing.\n";
    expect(extractH2Section(body, "When NOT to use")).toBe("Irregular spacing.");
  });

  it("discards trailing prose on the heading line", () => {
    const body = "## When NOT to use — important caveats\nBody.\n";
    expect(extractH2Section(body, "When NOT to use")).toBe("Body.");
  });

  it("returns the tail when no following H2 exists", () => {
    const body = "## When NOT to use\nLast section.\nNo more headings.\n";
    expect(extractH2Section(body, "When NOT to use")).toBe(
      "Last section.\nNo more headings.",
    );
  });

  it("escapes regex metacharacters in the heading", () => {
    const body = "## What is it?\nDefinition.\n## Next\n";
    expect(extractH2Section(body, "What is it?")).toBe("Definition.");
  });
});
