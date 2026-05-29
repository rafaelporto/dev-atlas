import { describe, it, expect } from "vitest";
import type { Article } from "../src/articles/types.js";
import { buildIndex } from "../src/search/indexer.js";
import { SearchService } from "../src/search/search-service.js";
import { RelatedService } from "../src/search/related-service.js";

function fakeArticle(overrides: Partial<Article> & Pick<Article, "id" | "title">): Article {
  return {
    id: overrides.id,
    absolutePath: `/fixtures/${overrides.id}.md`,
    section: overrides.id.split("/").slice(0, -1).join("/"),
    frontMatter: {
      type: "concept",
      tags: [],
      related: [],
      language: null,
      ...(overrides.frontMatter ?? {}),
    },
    title: overrides.title,
    summary: overrides.summary ?? "default summary",
    body: overrides.body ?? "default body",
    headings: overrides.headings ?? [],
  };
}

const factoryMethod = fakeArticle({
  id: "software-engineering/design-patterns/creational/factory-method",
  title: "Factory Method",
  summary: "Decouples object creation from its caller.",
  body: "Used when creating objects without exposing the concrete class.",
  frontMatter: {
    type: "concept",
    tags: ["design-pattern", "creational"],
    related: [
      "software-engineering/design-patterns/creational/abstract-factory",
    ],
    language: null,
  },
});

const abstractFactory = fakeArticle({
  id: "software-engineering/design-patterns/creational/abstract-factory",
  title: "Abstract Factory",
  summary: "Creates families of related objects without specifying classes.",
  body: "Often used together with Factory Method.",
  frontMatter: {
    type: "concept",
    tags: ["design-pattern", "creational"],
    related: [],
    language: null,
  },
});

const goConcurrency = fakeArticle({
  id: "languages/go/concurrency",
  title: "Go Concurrency",
  summary: "Goroutines and channels.",
  // "factory" appears only inside the fenced block; the indexer should not
  // count it.
  body: "Goroutines exchange data over channels. ```go\nfactory()\n```",
  frontMatter: {
    type: "concept",
    tags: ["language", "concurrency"],
    related: [],
    language: "go",
  },
});

const godObject = fakeArticle({
  id: "software-engineering/concepts/god-object",
  title: "God Object",
  summary: "A class that knows or does too much.",
  body: "An antipattern characterised by tight coupling and low cohesion.",
  frontMatter: {
    type: "concept",
    tags: ["antipattern", "design-pattern"],
    related: [],
    language: null,
  },
});

const articles = [factoryMethod, abstractFactory, goConcurrency, godObject];
const index = buildIndex(articles);
const search = new SearchService(index);
const related = new RelatedService(index);

describe("SearchService", () => {
  it("returns articles whose title or body matches the query", () => {
    const { hits } = search.search({ query: "factory" });
    const ids = hits.map((h) => h.article.id);
    expect(ids).toContain(factoryMethod.id);
    expect(ids).toContain(abstractFactory.id);
    // Both articles match in title; ranking is settled by additional body
    // occurrences. We don't assert a specific top-1 because the weighted
    // ranking is intentionally substring-based (Item 9: KISS, no BM25/IDF).
    for (const hit of hits) {
      expect(hit.score).toBeGreaterThan(0);
    }
  });

  it("respects AND on tag filter", () => {
    const { hits } = search.search({
      query: "",
      tags: ["design-pattern", "creational"],
    });
    const ids = hits.map((h) => h.article.id);
    expect(ids).toContain(factoryMethod.id);
    expect(ids).toContain(abstractFactory.id);
    expect(ids).not.toContain(godObject.id);
  });

  it("filter-only mode works with empty query", () => {
    const { hits, total } = search.search({ query: "", tags: ["antipattern"] });
    expect(total).toBe(1);
    expect(hits[0]?.article.title).toBe("God Object");
  });

  it("ignores tokens inside code blocks", () => {
    // goConcurrency mentions "factory" only inside a code block; should not
    // appear when searching for "factory".
    const { hits } = search.search({ query: "factory" });
    const ids = hits.map((h) => h.article.id);
    expect(ids).not.toContain(goConcurrency.id);
  });

  it("section filter is prefix-match", () => {
    const { hits } = search.search({
      query: "",
      section: "software-engineering/design-patterns",
    });
    const ids = hits.map((h) => h.article.id);
    expect(ids).toContain(factoryMethod.id);
    expect(ids).toContain(abstractFactory.id);
    expect(ids).not.toContain(goConcurrency.id);
  });

  it("language filter unifies field + tag", () => {
    // Even though goConcurrency has language: "go", we should still find it
    // via either the field or the tag.
    const { hits } = search.search({ query: "", language: "go" });
    const ids = hits.map((h) => h.article.id);
    expect(ids).toContain(goConcurrency.id);
  });
});

describe("RelatedService", () => {
  it("returns explicit related first", () => {
    const hits = related.findRelated(factoryMethod.id);
    expect(hits[0]?.article.id).toBe(abstractFactory.id);
    expect(hits[0]?.relationship).toBe("explicit");
  });

  it("is bidirectional", () => {
    const hits = related.findRelated(abstractFactory.id);
    const ids = hits.map((h) => h.article.id);
    expect(ids).toContain(factoryMethod.id);
  });

  it("requires ≥ 2 tags overlap for tag-overlap relationship", () => {
    // godObject and factoryMethod share `design-pattern` only (1 tag) → no.
    const hits = related.findRelated(godObject.id);
    const tagHits = hits.filter((h) => h.relationship === "tag-overlap");
    expect(tagHits.length).toBe(0);
  });
});
