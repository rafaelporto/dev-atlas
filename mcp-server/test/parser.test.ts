import { describe, it, expect } from "vitest";
import { parseArticle, parseSectionIndex, ArticleParseError } from "../src/articles/parser.js";
import { REPO_ROOT } from "../src/lib/config.js";
import { resolve } from "node:path";

const sampleArticlePath = resolve(
  REPO_ROOT,
  "software-engineering/design-patterns/creational/factory-method.md",
);

const validSource = `---
type: concept
tags: [design-pattern, creational]
related: []
language: null
---

# Factory Method

> Decouples object creation from its caller.

---

## What is it?

Some text.
`;

describe("parseArticle", () => {
  it("returns title, summary, type and tags", () => {
    const article = parseArticle(sampleArticlePath, validSource);
    expect(article.title).toBe("Factory Method");
    expect(article.summary).toBe("Decouples object creation from its caller.");
    expect(article.frontMatter.type).toBe("concept");
    expect(article.frontMatter.tags).toEqual(["design-pattern", "creational"]);
    expect(article.frontMatter.language).toBeNull();
  });

  it("derives id from absolute path", () => {
    const article = parseArticle(sampleArticlePath, validSource);
    expect(article.id).toBe(
      "software-engineering/design-patterns/creational/factory-method",
    );
    expect(article.section).toBe(
      "software-engineering/design-patterns/creational",
    );
  });

  it("collects headings for indexing", () => {
    const article = parseArticle(sampleArticlePath, validSource);
    expect(article.headings).toContainEqual({ level: 1, text: "Factory Method" });
    expect(article.headings).toContainEqual({ level: 2, text: "What is it?" });
  });

  it("rejects body without `# Title`", () => {
    const noTitle = `---
type: concept
tags: [concept]
related: []
language: null
---

> summary without a heading
`;
    expect(() => parseArticle(sampleArticlePath, noTitle)).toThrow(
      ArticleParseError,
    );
  });

  it("rejects body without summary blockquote", () => {
    const noSummary = `---
type: concept
tags: [concept]
related: []
language: null
---

# Title

Some text but no blockquote
`;
    expect(() => parseArticle(sampleArticlePath, noSummary)).toThrow(
      ArticleParseError,
    );
  });

  it("rejects missing front matter", () => {
    const noFm = `# Title\n\n> summary\n`;
    expect(() => parseArticle(sampleArticlePath, noFm)).toThrow(
      ArticleParseError,
    );
  });

  it("rejects invalid type value", () => {
    const bad = validSource.replace("type: concept", "type: lecture");
    expect(() => parseArticle(sampleArticlePath, bad)).toThrow(ArticleParseError);
  });

  it("rejects non-array tags", () => {
    const bad = validSource.replace(
      "tags: [design-pattern, creational]",
      'tags: "design-pattern"',
    );
    expect(() => parseArticle(sampleArticlePath, bad)).toThrow(ArticleParseError);
  });
});

describe("parseSectionIndex", () => {
  it("extracts title and first paragraph description", () => {
    const readmePath = resolve(
      REPO_ROOT,
      "software-engineering/design-patterns/creational/README.md",
    );
    const source = `# Creational Patterns

Patterns that abstract object creation, decoupling clients from the concrete classes they instantiate.

| [Factory Method](factory-method.md) | One-line |
`;
    const index = parseSectionIndex(readmePath, source);
    expect(index.title).toBe("Creational Patterns");
    expect(index.description).toMatch(/^Patterns that abstract/);
  });

  it("returns null description when no paragraph is present", () => {
    const readmePath = resolve(REPO_ROOT, "tools/README.md");
    const source = `# Tools\n\n| [a](a.md) | One |\n`;
    const index = parseSectionIndex(readmePath, source);
    expect(index.description).toBeNull();
  });

  it("rejects README without title", () => {
    const readmePath = resolve(REPO_ROOT, "tools/README.md");
    const source = `Some prose without a heading`;
    expect(() => parseSectionIndex(readmePath, source)).toThrow();
  });
});
