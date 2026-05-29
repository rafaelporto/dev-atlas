import type { Article } from "../articles/types.js";

export interface Index {
  byId: Map<string, Article>;
  byTag: Map<string, Set<string>>;
  bySection: Map<string, Set<string>>;
  byLanguage: Map<string, Set<string>>;
  // token → (article id → cumulative weight contributed by that token).
  invertedIdx: Map<string, Map<string, number>>;
  // Bidirectional related graph: id → set of ids related to id, computed by
  // unioning each article's `related[]` with its reverse-pointers.
  related: Map<string, Set<string>>;
}

const FIELD_WEIGHTS = {
  title: 4,
  tags: 3,
  summary: 2,
  heading: 2,
  body: 1,
} as const;

const TOKEN_REGEX = /[a-z0-9][a-z0-9_-]*/g;

export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  for (const match of input.toLowerCase().matchAll(TOKEN_REGEX)) {
    tokens.push(match[0]);
  }
  return tokens;
}

// Returns the body with the contents of every fenced code block removed.
// Code blocks contribute weight 0 to the index — a Java-flavored example in
// an architecture article must not dominate the "java" search.
function stripCodeBlocks(body: string): string {
  return body.replace(/```[\s\S]*?```/g, "");
}

function addWeight(
  idx: Map<string, Map<string, number>>,
  token: string,
  articleId: string,
  weight: number,
): void {
  if (weight <= 0) return;
  let bucket = idx.get(token);
  if (!bucket) {
    bucket = new Map<string, number>();
    idx.set(token, bucket);
  }
  bucket.set(articleId, (bucket.get(articleId) ?? 0) + weight);
}

function indexText(
  idx: Map<string, Map<string, number>>,
  articleId: string,
  text: string,
  perTokenWeight: number,
): void {
  for (const token of tokenize(text)) {
    addWeight(idx, token, articleId, perTokenWeight);
  }
}

export function buildIndex(articles: Article[]): Index {
  const byId = new Map<string, Article>();
  const byTag = new Map<string, Set<string>>();
  const bySection = new Map<string, Set<string>>();
  const byLanguage = new Map<string, Set<string>>();
  const invertedIdx = new Map<string, Map<string, number>>();
  const related = new Map<string, Set<string>>();

  for (const article of articles) {
    byId.set(article.id, article);

    for (const tag of article.frontMatter.tags) {
      let set = byTag.get(tag);
      if (!set) {
        set = new Set();
        byTag.set(tag, set);
      }
      set.add(article.id);
    }

    // Every prefix of the section path is also a valid filter target so
    // `section: "languages"` matches articles in `languages/go/...`.
    const segments = article.section.split("/").filter((s) => s.length > 0);
    for (let i = 1; i <= segments.length; i++) {
      const prefix = segments.slice(0, i).join("/");
      let set = bySection.get(prefix);
      if (!set) {
        set = new Set();
        bySection.set(prefix, set);
      }
      set.add(article.id);
    }

    if (article.frontMatter.language) {
      let set = byLanguage.get(article.frontMatter.language);
      if (!set) {
        set = new Set();
        byLanguage.set(article.frontMatter.language, set);
      }
      set.add(article.id);
    }

    indexText(invertedIdx, article.id, article.title, FIELD_WEIGHTS.title);
    indexText(invertedIdx, article.id, article.summary, FIELD_WEIGHTS.summary);
    for (const tag of article.frontMatter.tags) {
      indexText(invertedIdx, article.id, tag, FIELD_WEIGHTS.tags);
    }
    for (const heading of article.headings) {
      indexText(invertedIdx, article.id, heading.text, FIELD_WEIGHTS.heading);
    }
    const bodyText = stripCodeBlocks(article.body);
    indexText(invertedIdx, article.id, bodyText, FIELD_WEIGHTS.body);
  }

  // Related graph — bidirectional. Symmetry compensates for one-sided
  // omissions in `related[]` (typically a curation oversight, not intent).
  for (const article of articles) {
    let set = related.get(article.id);
    if (!set) {
      set = new Set();
      related.set(article.id, set);
    }
    for (const otherId of article.frontMatter.related) {
      set.add(otherId);
      let reverse = related.get(otherId);
      if (!reverse) {
        reverse = new Set();
        related.set(otherId, reverse);
      }
      reverse.add(article.id);
    }
  }

  return { byId, byTag, bySection, byLanguage, invertedIdx, related };
}
