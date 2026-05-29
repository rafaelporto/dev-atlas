import type { Article } from "../articles/types.js";
import type { Index } from "./indexer.js";

export type Relationship = "explicit" | "tag-overlap";

export interface RelatedHit {
  article: Article;
  relationship: Relationship;
  sharedTags?: string[];
}

const DEFAULT_LIMIT = 10;
const MIN_TAG_OVERLAP = 2;

export class RelatedService {
  constructor(private readonly index: Index) {}

  findRelated(id: string, limit: number = DEFAULT_LIMIT): RelatedHit[] {
    const source = this.index.byId.get(id);
    if (!source) return [];

    const out: RelatedHit[] = [];
    const seen = new Set<string>([id]);

    // Tier 1: explicit related (bidirectional set built by the indexer). We
    // surface entries from the article's own front matter first, in the
    // original order, then append reverse pointers we discovered elsewhere.
    const declaredOrder: string[] = [...source.frontMatter.related];
    for (const otherId of declaredOrder) {
      if (seen.has(otherId)) continue;
      const article = this.index.byId.get(otherId);
      if (!article) continue;
      out.push({ article, relationship: "explicit" });
      seen.add(otherId);
    }

    const bidi = this.index.related.get(id) ?? new Set();
    for (const otherId of bidi) {
      if (seen.has(otherId)) continue;
      const article = this.index.byId.get(otherId);
      if (!article) continue;
      out.push({ article, relationship: "explicit" });
      seen.add(otherId);
    }

    // Tier 2: tag overlap. Computed across all other articles; we keep only
    // candidates with ≥ MIN_TAG_OVERLAP tags in common, sort by overlap desc
    // (ties broken by title asc), then append.
    const sourceTags = new Set(source.frontMatter.tags);
    const tagOverlapHits: Array<{
      article: Article;
      sharedTags: string[];
    }> = [];

    for (const article of this.index.byId.values()) {
      if (seen.has(article.id)) continue;
      const shared: string[] = [];
      for (const tag of article.frontMatter.tags) {
        if (sourceTags.has(tag)) shared.push(tag);
      }
      if (shared.length >= MIN_TAG_OVERLAP) {
        tagOverlapHits.push({ article, sharedTags: shared });
      }
    }

    tagOverlapHits.sort((a, b) => {
      if (b.sharedTags.length !== a.sharedTags.length) {
        return b.sharedTags.length - a.sharedTags.length;
      }
      return a.article.title.localeCompare(b.article.title);
    });

    for (const hit of tagOverlapHits) {
      if (out.length >= limit) break;
      out.push({
        article: hit.article,
        relationship: "tag-overlap",
        sharedTags: hit.sharedTags,
      });
    }

    return out.slice(0, limit);
  }
}
