import { relative, dirname, sep, posix } from "node:path";
import matter from "gray-matter";
import { REPO_ROOT } from "../lib/config.js";
import type {
  Article,
  ArticleFrontMatter,
  ArticleType,
  SectionIndex,
} from "./types.js";

export class ArticleParseError extends Error {
  constructor(public readonly absolutePath: string, message: string) {
    super(`${absolutePath}: ${message}`);
    this.name = "ArticleParseError";
  }
}

const VALID_TYPES: ReadonlySet<ArticleType> = new Set(["concept", "how-to"]);

function toPosix(p: string): string {
  return p.split(sep).join(posix.sep);
}

// Computes the canonical id for an article: repo-relative path without the
// .md extension, posix-style separators (so it stays portable across the wiki
// and the URI scheme on every OS).
export function idForArticle(absolutePath: string): string {
  const rel = relative(REPO_ROOT, absolutePath);
  const posixPath = toPosix(rel);
  return posixPath.replace(/\.md$/i, "");
}

export function sectionForId(id: string): string {
  const idx = id.lastIndexOf("/");
  return idx === -1 ? "" : id.slice(0, idx);
}

function extractFirstHeading(body: string): string | null {
  const match = /^[ \t]*#[ \t]+(.+?)[ \t]*$/m.exec(body);
  return match ? match[1]!.trim() : null;
}

function extractFirstBlockquote(body: string): string | null {
  const match = /^[ \t]*>[ \t]+(.+?)[ \t]*$/m.exec(body);
  return match ? match[1]!.trim() : null;
}

function extractHeadings(body: string): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];
  const regex = /^(#{1,6})[ \t]+(.+?)[ \t]*$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    headings.push({ level: match[1]!.length, text: match[2]!.trim() });
  }
  return headings;
}

function parseFrontMatter(
  absolutePath: string,
  data: Record<string, unknown>,
): ArticleFrontMatter {
  const typeRaw = data["type"];
  if (typeof typeRaw !== "string" || !VALID_TYPES.has(typeRaw as ArticleType)) {
    throw new ArticleParseError(
      absolutePath,
      `front matter \`type\` must be "concept" or "how-to" (got ${JSON.stringify(typeRaw)})`,
    );
  }

  const tagsRaw = data["tags"];
  if (!Array.isArray(tagsRaw) || !tagsRaw.every((t) => typeof t === "string")) {
    throw new ArticleParseError(
      absolutePath,
      `front matter \`tags\` must be an array of strings`,
    );
  }

  const relatedRaw = data["related"];
  if (
    !Array.isArray(relatedRaw) ||
    !relatedRaw.every((t) => typeof t === "string")
  ) {
    throw new ArticleParseError(
      absolutePath,
      `front matter \`related\` must be an array of strings`,
    );
  }

  const languageRaw = data["language"];
  if (languageRaw !== null && typeof languageRaw !== "string") {
    throw new ArticleParseError(
      absolutePath,
      `front matter \`language\` must be a string or null`,
    );
  }

  return {
    type: typeRaw as ArticleType,
    tags: tagsRaw as string[],
    related: relatedRaw as string[],
    language: languageRaw as string | null,
  };
}

// Parses a content article. Fails fast on any missing required field, missing
// title, or missing summary blockquote.
export function parseArticle(absolutePath: string, source: string): Article {
  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(source);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ArticleParseError(
      absolutePath,
      `failed to parse YAML front matter: ${message}`,
    );
  }

  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    throw new ArticleParseError(
      absolutePath,
      "missing YAML front matter (file must start with a `---` block)",
    );
  }

  const frontMatter = parseFrontMatter(absolutePath, parsed.data);
  const body = parsed.content.trimStart();

  const title = extractFirstHeading(body);
  if (!title) {
    throw new ArticleParseError(
      absolutePath,
      "body must start with a level-1 heading (`# Title`)",
    );
  }

  const summary = extractFirstBlockquote(body);
  if (!summary) {
    throw new ArticleParseError(
      absolutePath,
      "body must include a summary blockquote (`> ...`) right after the title",
    );
  }

  const id = idForArticle(absolutePath);
  return {
    id,
    absolutePath,
    section: sectionForId(id),
    frontMatter,
    title,
    summary,
    body,
    headings: extractHeadings(body),
  };
}

// Parses a section README into a SectionIndex. README files do not carry front
// matter; they are pure navigation/curation content.
export function parseSectionIndex(
  absolutePath: string,
  source: string,
): SectionIndex {
  const dir = dirname(absolutePath);
  const path = toPosix(relative(REPO_ROOT, dir));

  const title = extractFirstHeading(source);
  if (!title) {
    throw new ArticleParseError(
      absolutePath,
      "section README must start with a level-1 heading (`# Section name`)",
    );
  }

  // First paragraph = first non-empty line block after the title that is
  // not a heading, list bullet, table row, or fenced delimiter.
  const lines = source.split("\n");
  const titleIdx = lines.findIndex((l) => /^#\s+/.test(l.trim()));
  const paragraphLines: string[] = [];
  for (let i = titleIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (trimmed.length === 0) {
      if (paragraphLines.length > 0) break;
      continue;
    }
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("|") ||
      trimmed.startsWith("-") ||
      trimmed.startsWith(">") ||
      trimmed.startsWith("```") ||
      trimmed === "---"
    ) {
      if (paragraphLines.length > 0) break;
      continue;
    }
    paragraphLines.push(trimmed);
  }
  const description =
    paragraphLines.length > 0 ? paragraphLines.join(" ") : null;

  return {
    path,
    absolutePath,
    title,
    description,
    body: source,
  };
}
