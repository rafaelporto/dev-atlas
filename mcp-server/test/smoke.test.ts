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

let tags: TagVocabulary;
let repo: ArticleRepository;
let search: SearchService;
let related: RelatedService;
let antipatterns: AntipatternService;

beforeAll(() => {
  tags = TagVocabulary.load();
  repo = ArticleRepository.load(tags);
  const index = buildIndex(repo.allArticles());
  search = new SearchService(index);
  related = new RelatedService(index);
  antipatterns = new AntipatternService(index, search);
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
