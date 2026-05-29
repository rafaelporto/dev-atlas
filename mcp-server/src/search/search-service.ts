import type { Article, ArticleType } from "../articles/types.js";
import { buildIndex, type Index, tokenize } from "./indexer.js";

export interface SearchInput {
  query: string;
  tags?: string[];
  type?: ArticleType;
  section?: string;
  language?: string;
  limit?: number;
}

export interface SearchHit {
  article: Article;
  score: number;
}

export interface SearchResultSet {
  hits: SearchHit[];
  total: number;
}

const DEFAULT_LIMIT = 10;

export class SearchService {
  constructor(private readonly index: Index) {}

  static fromArticles(articles: Article[]): SearchService {
    return new SearchService(buildIndex(articles));
  }

  search(input: SearchInput): SearchResultSet {
    const limit = input.limit ?? DEFAULT_LIMIT;

    const queryTokens = tokenize(input.query);
    let scoreById: Map<string, number>;

    if (queryTokens.length === 0) {
      // Filter-only mode: every article starts with score 0; rankings are
      // governed entirely by filters. We materialize the candidate set lazily
      // below by populating with zero scores during filter intersection.
      scoreById = new Map();
      for (const id of this.index.byId.keys()) scoreById.set(id, 0);
    } else {
      scoreById = new Map();
      for (const token of queryTokens) {
        const bucket = this.index.invertedIdx.get(token);
        if (!bucket) continue;
        for (const [articleId, weight] of bucket) {
          scoreById.set(articleId, (scoreById.get(articleId) ?? 0) + weight);
        }
      }
    }

    const filtered = this.applyFilters(scoreById, input);

    // Order by score desc, then by title asc for deterministic ties.
    const allHits: SearchHit[] = [];
    for (const [id, score] of filtered) {
      const article = this.index.byId.get(id);
      if (!article) continue;
      allHits.push({ article, score });
    }
    allHits.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.article.title.localeCompare(b.article.title);
    });

    return {
      hits: allHits.slice(0, limit),
      total: allHits.length,
    };
  }

  // Tag filter is AND. Section filter is prefix-match. Language filter merges
  // explicit `language` field with the tag of the same name so the agent can
  // pass `language: "swift"` and get both Swift-only articles and multilingual
  // mobile-architecture articles tagged `swift`.
  private applyFilters(
    scoreById: Map<string, number>,
    input: SearchInput,
  ): Map<string, number> {
    let working = scoreById;

    if (input.tags && input.tags.length > 0) {
      for (const tag of input.tags) {
        const tagged = this.index.byTag.get(tag);
        if (!tagged) return new Map();
        working = restrict(working, tagged);
      }
    }

    if (input.type) {
      const matching = new Set<string>();
      for (const id of working.keys()) {
        const article = this.index.byId.get(id);
        if (article && article.frontMatter.type === input.type) {
          matching.add(id);
        }
      }
      working = restrict(working, matching);
    }

    if (input.section) {
      const sectionSet = this.index.bySection.get(input.section);
      if (!sectionSet) return new Map();
      working = restrict(working, sectionSet);
    }

    if (input.language) {
      const explicit = this.index.byLanguage.get(input.language) ?? new Set();
      const viaTag = this.index.byTag.get(input.language) ?? new Set();
      const union = new Set<string>([...explicit, ...viaTag]);
      working = restrict(working, union);
    }

    return working;
  }
}

function restrict(
  source: Map<string, number>,
  allowed: Set<string>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const [id, score] of source) {
    if (allowed.has(id)) out.set(id, score);
  }
  return out;
}
