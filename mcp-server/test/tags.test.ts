import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TagVocabulary } from "../src/lib/tags.js";

const here = dirname(fileURLToPath(import.meta.url));
const sampleSource = readFileSync(
  resolve(here, "fixtures", "tags-sample.md"),
  "utf8",
);

describe("TagVocabulary.parse", () => {
  it("loads every tag with its category", () => {
    const vocab = TagVocabulary.parse(sampleSource);
    expect(vocab.has("concept")).toBe(true);
    expect(vocab.categoryOf("concept")).toBe("domain");
    expect(vocab.categoryOf("creational")).toBe("pattern-category");
    expect(vocab.categoryOf("antipattern")).toBe("cross-cutting");
    expect(vocab.categoryOf("go")).toBe("language");
    expect(vocab.categoryOf("testing")).toBe("topic");
  });

  it("returns null on valid tag arrays", () => {
    const vocab = TagVocabulary.parse(sampleSource);
    expect(vocab.validate(["concept", "design-pattern"])).toBeNull();
  });

  it("identifies the first invalid tag", () => {
    const vocab = TagVocabulary.parse(sampleSource);
    expect(vocab.validate(["concept", "not-a-real-tag"])).toBe("not-a-real-tag");
  });

  it("ignores headings outside the Categories section", () => {
    const noisy = `# Heading\n\n## Rules\n\n### Domain\n\n- \`fake\`\n\n## Categories\n\n### Domain\n\n- \`concept\`\n`;
    const vocab = TagVocabulary.parse(noisy);
    expect(vocab.has("concept")).toBe(true);
    expect(vocab.has("fake")).toBe(false);
  });

  it("throws when no tags can be parsed", () => {
    expect(() => TagVocabulary.parse("# nothing")).toThrow();
  });
});
