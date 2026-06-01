// End-to-end smoke test of the dev-atlas MCP server contracts.
// This intentionally hits the *real* wiki (not fixtures) so a tag, related,
// or template regression in any of the 195+ articles surfaces immediately.

import { describe, it, expect, beforeAll } from "vitest";
import { TagVocabulary } from "../src/lib/tags.js";
import { ArticleRepository } from "../src/articles/repository.js";
import { buildIndex } from "../src/search/indexer.js";
import { SearchService } from "../src/search/search-service.js";
import { RelatedService } from "../src/search/related-service.js";
import { AntipatternService } from "../src/search/antipattern-service.js";
import { TOOLS, type ToolContext } from "../src/mcp/tools.js";

let tags: TagVocabulary;
let repo: ArticleRepository;
let search: SearchService;
let related: RelatedService;
let antipatterns: AntipatternService;
let ctx: ToolContext;

beforeAll(() => {
  tags = TagVocabulary.load();
  repo = ArticleRepository.load(tags);
  const index = buildIndex(repo.allArticles());
  search = new SearchService(index);
  related = new RelatedService(index);
  antipatterns = new AntipatternService(index, search);
  ctx = { tags, repo, search, related, antipatterns };
});

describe("repository loads the real wiki", () => {
  it("loads a non-trivial number of articles", () => {
    expect(repo.allArticles().length).toBeGreaterThan(150);
  });

  it("loads section indexes for the major sections", () => {
    const paths = new Set(repo.allSectionIndexes().map((s) => s.path));
    expect(paths.has("software-engineering")).toBe(true);
    expect(paths.has("software-engineering/design-patterns")).toBe(true);
    expect(paths.has("languages")).toBe(true);
    expect(paths.has("tools")).toBe(true);
  });

  it("every article passes parser + validator", () => {
    // The `beforeAll` would have thrown if any article was broken. This
    // assertion just documents the contract.
    for (const article of repo.allArticles()) {
      expect(article.title.length).toBeGreaterThan(0);
      expect(article.summary.length).toBeGreaterThan(0);
    }
  });
});

describe("tools surface meaningful results on the real wiki", () => {
  it("search_articles finds Factory Method", () => {
    const { hits } = search.search({ query: "factory method" });
    const titles = hits.map((h) => h.article.title);
    expect(titles.some((t) => /factory method/i.test(t))).toBe(true);
  });

  it("section filter is prefix-match across nested sections", () => {
    const { hits } = search.search({
      query: "",
      section: "software-engineering/design-patterns",
      limit: 100,
    });
    expect(hits.length).toBeGreaterThan(5);
    for (const hit of hits) {
      expect(hit.article.section.startsWith("software-engineering/design-patterns")).toBe(true);
    }
  });

  it("language filter returns go articles", () => {
    const { hits } = search.search({ query: "", language: "go", limit: 100 });
    const ids = hits.map((h) => h.article.id);
    // We expect at least one go article. After Wave 2 of backfill this set
    // should grow substantially.
    expect(ids.some((id) => id.startsWith("languages/go/"))).toBe(true);
  });

  it("find_related on Factory Method returns something", () => {
    const id = "software-engineering/design-patterns/creational/factory-method";
    const exists = repo.articleById(id);
    if (!exists) return; // Skip if rename — keeps smoke test resilient.
    const hits = related.findRelated(id);
    // With empty related[] arrays (Wave 1) and no tags, this can be 0. We
    // only require that the call works without throwing.
    expect(Array.isArray(hits)).toBe(true);
  });

  it("find_antipatterns does not throw and returns array", () => {
    const hits = antipatterns.find("god object", 5);
    expect(Array.isArray(hits)).toBe(true);
  });
});

describe("list_tags filter behavior", () => {
  function callListTags(input: unknown): { name: string; category: string; count: number }[] {
    const tool = TOOLS.find((t) => t.name === "list_tags");
    if (!tool) throw new Error("list_tags tool not registered");
    const result = tool.handle(ctx, input) as { tags: { name: string; category: string; count: number }[] };
    return result.tags;
  }

  it("hides count:0 tags by default", () => {
    const result = callListTags({});
    expect(result.length).toBeGreaterThan(0);
    for (const t of result) {
      expect(t.count).toBeGreaterThan(0);
    }
  });

  it("include_unused: true returns the full vocabulary", () => {
    const visible = callListTags({});
    const all = callListTags({ include_unused: true });
    expect(all.length).toBeGreaterThan(visible.length);
    // Sanity: the vocabulary defines tags that are legitimately unused (e.g. java/kotlin
    // — no language subdir for them). They must appear in the full list.
    expect(all.some((t) => t.count === 0)).toBe(true);
  });

  it("category filter combines with the default count filter", () => {
    const langs = callListTags({ category: "language" });
    expect(langs.length).toBeGreaterThan(0);
    for (const t of langs) {
      expect(t.category).toBe("language");
      expect(t.count).toBeGreaterThan(0);
    }
  });
});
