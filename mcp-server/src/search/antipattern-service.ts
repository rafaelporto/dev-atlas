import type { Article } from "../articles/types.js";
import type { Index } from "./indexer.js";
import { tokenize } from "./indexer.js";
import { SearchService } from "./search-service.js";

export type AntipatternSource = "tag" | "when-not-to-use";

export interface AntipatternHit {
  article: Article;
  source: AntipatternSource;
  snippet: string;
  score: number;
}

const SNIPPET_RADIUS = 100;
const FALLBACK_THRESHOLD = 3;

// Surfaces antipatterns relevant to a free-form topic. Two-tier strategy:
//   1. Articles whose primary subject is an antipattern (tag === "antipattern")
//      matched against the topic via the normal SearchService.
//   2. Fallback: "When NOT to use" sections of any article relevant to the
//      topic, ranked by occurrence count of topic tokens within that section.
// The fallback only fires if tier 1 returned fewer than FALLBACK_THRESHOLD
// hits — explicit antipattern articles are always preferred.
export class AntipatternService {
  constructor(
    private readonly index: Index,
    private readonly search: SearchService,
  ) {}

  find(topic: string, limit: number): AntipatternHit[] {
    const tier1 = this.searchTagged(topic, limit);

    if (tier1.length >= FALLBACK_THRESHOLD || tier1.length >= limit) {
      return tier1.slice(0, limit);
    }

    const remaining = limit - tier1.length;
    const tier2 = this.searchWhenNotToUse(topic, remaining, new Set(tier1.map((h) => h.article.id)));
    return [...tier1, ...tier2].slice(0, limit);
  }

  private searchTagged(topic: string, limit: number): AntipatternHit[] {
    const { hits } = this.search.search({
      query: topic,
      tags: ["antipattern"],
      limit,
    });
    return hits.map((h) => ({
      article: h.article,
      source: "tag" as const,
      snippet: makeSnippet(h.article.body, topic) ?? h.article.summary,
      score: h.score,
    }));
  }

  private searchWhenNotToUse(
    topic: string,
    limit: number,
    skip: Set<string>,
  ): AntipatternHit[] {
    const tokens = tokenize(topic);
    if (tokens.length === 0) return [];

    const candidates: Array<{ article: Article; snippet: string; score: number }> = [];

    for (const article of this.index.byId.values()) {
      if (skip.has(article.id)) continue;
      const section = extractWhenNotToUseSection(article.body);
      if (!section) continue;
      const sectionLower = section.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        const occurrences = countOccurrences(sectionLower, token);
        score += occurrences;
      }
      if (score > 0) {
        candidates.push({
          article,
          score,
          snippet: makeSnippet(section, topic) ?? truncate(section, SNIPPET_RADIUS * 2),
        });
      }
    }

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.article.title.localeCompare(b.article.title);
    });

    return candidates.slice(0, limit).map((c) => ({
      article: c.article,
      source: "when-not-to-use" as const,
      snippet: c.snippet,
      score: c.score,
    }));
  }
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let from = 0;
  while ((from = haystack.indexOf(needle, from)) !== -1) {
    count++;
    from += needle.length;
  }
  return count;
}

// Pulls the body region under "## When NOT to use" up to the next H2 heading.
// Returns null if the section is not present (e.g., how-to articles).
function extractWhenNotToUseSection(body: string): string | null {
  const match = /^##\s+When\s+NOT\s+to\s+use[^\n]*$/im.exec(body);
  if (!match) return null;
  const start = match.index + match[0].length;
  const tail = body.slice(start);
  const nextHeading = /^##\s+/m.exec(tail);
  const end = nextHeading ? nextHeading.index : tail.length;
  return tail.slice(0, end).trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

// Picks a ~200-character window centered on the first token match.
function makeSnippet(body: string, topic: string): string | null {
  const lower = body.toLowerCase();
  for (const token of tokenize(topic)) {
    const idx = lower.indexOf(token);
    if (idx === -1) continue;
    const start = Math.max(0, idx - SNIPPET_RADIUS);
    const end = Math.min(body.length, idx + token.length + SNIPPET_RADIUS);
    let snippet = body.slice(start, end).replace(/\s+/g, " ").trim();
    if (start > 0) snippet = "…" + snippet;
    if (end < body.length) snippet = snippet + "…";
    return snippet;
  }
  return null;
}
