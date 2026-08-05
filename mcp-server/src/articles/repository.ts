import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, basename } from "node:path";
import {
  CONTENT_DIRS,
  EXCLUDED_DIRS,
  REPO_ROOT,
} from "../lib/config.js";
import { TagVocabulary } from "../lib/tags.js";
import { ArticleParseError, parseArticle, parseSectionIndex } from "./parser.js";
import type { Article, SectionIndex } from "./types.js";

export interface LoadResult {
  articles: Article[];
  sectionIndexes: SectionIndex[];
}

// Scans the wiki and returns parsed articles + section-indexes.
// - Walks the five top-level content directories (`software-engineering/`,
//   `languages/`, `tools/`, `operating-systems/`, `devops/`), skipping anything
//   in EXCLUDED_DIRS.
// - Treats every `README.md` as a SectionIndex (no front matter required).
// - Treats every other `*.md` as an Article (front matter required).
// - Validates every article tag against the vocabulary.
// - Validates every `related[]` entry against the set of loaded article ids.
//
// Fails fast on the first parse/validation error so the operator gets a clear
// pointer to the offending file rather than a wall of stack traces.
export class ArticleRepository {
  private constructor(
    private readonly articlesById: Map<string, Article>,
    private readonly sectionIndexesByPath: Map<string, SectionIndex>,
  ) {}

  static load(tags: TagVocabulary): ArticleRepository {
    const articles: Article[] = [];
    const sectionIndexes: SectionIndex[] = [];

    for (const top of CONTENT_DIRS) {
      const dir = resolve(REPO_ROOT, top);
      walk(dir, (file) => collect(file, articles, sectionIndexes));
    }

    // Tag validation
    for (const article of articles) {
      const bad = tags.validate(article.frontMatter.tags);
      if (bad !== null) {
        throw new ArticleParseError(
          article.absolutePath,
          `unknown tag \`${bad}\` (not present in _templates/tags.md)`,
        );
      }
    }

    // Related-path validation: every entry must point to an existing article id.
    const articleIds = new Set(articles.map((a) => a.id));
    for (const article of articles) {
      for (const rel of article.frontMatter.related) {
        if (!articleIds.has(rel)) {
          throw new ArticleParseError(
            article.absolutePath,
            `front matter \`related\` entry "${rel}" does not match any article in the wiki`,
          );
        }
      }
    }

    const articlesById = new Map<string, Article>();
    for (const article of articles) articlesById.set(article.id, article);

    const sectionIndexesByPath = new Map<string, SectionIndex>();
    for (const idx of sectionIndexes) sectionIndexesByPath.set(idx.path, idx);

    return new ArticleRepository(articlesById, sectionIndexesByPath);
  }

  allArticles(): Article[] {
    return [...this.articlesById.values()];
  }

  allSectionIndexes(): SectionIndex[] {
    return [...this.sectionIndexesByPath.values()];
  }

  articleById(id: string): Article | undefined {
    return this.articlesById.get(id);
  }

  sectionIndexByPath(path: string): SectionIndex | undefined {
    return this.sectionIndexesByPath.get(path);
  }
}

function walk(dir: string, onFile: (path: string) => void): void {
  let entries: ReturnType<typeof readdirSync>;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, onFile);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      onFile(full);
    }
  }
}

function collect(
  file: string,
  articles: Article[],
  sectionIndexes: SectionIndex[],
): void {
  const name = basename(file);
  const source = readFileSync(file, "utf8");
  if (name.toLowerCase() === "readme.md") {
    sectionIndexes.push(parseSectionIndex(file, source));
  } else {
    articles.push(parseArticle(file, source));
  }
  // Defensive: avoid accidental empty entries when fs reports oddities.
  void statSync(file);
}
