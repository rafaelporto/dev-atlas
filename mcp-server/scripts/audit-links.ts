#!/usr/bin/env tsx
// Auditor for cross-links vs `related` front-matter entries.
//
// Two modes:
//   - --strict  → only fatal errors (broken inline links or broken `related`
//                 paths). Exits non-zero on any error. No report file written.
//                 This is what the pre-commit hook calls.
//   - (default) → fatal errors AND curated suggestions (inline links missing
//                 from `related`, and `related` entries without an inline
//                 mention). Suggestions are written to
//                 `mcp-server/audit-report.md` as a checklist the author can
//                 work through over multiple sessions. Exits non-zero only on
//                 fatal errors.
//
// Tag- and front-matter validation is the indexer's job (`articles/repository`).
// This auditor focuses exclusively on link consistency.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve as resolvePath, relative, sep, posix } from "node:path";
import { CONTENT_DIRS, REPO_ROOT } from "../src/lib/config.js";
import { TagVocabulary } from "../src/lib/tags.js";
import { ArticleRepository } from "../src/articles/repository.js";
import { idForArticle } from "../src/articles/parser.js";
import type { Article } from "../src/articles/types.js";

const STRICT = process.argv.includes("--strict");
const REPORT_PATH = resolvePath(REPO_ROOT, "mcp-server", "audit-report.md");

interface FatalError {
  articleId: string;
  message: string;
}

interface Suggestion {
  articleId: string;
  unmentionedRelated: string[]; // entries in related[] without inline mention
  unrelatedInlineLinks: string[]; // inline links missing from related[]
}

function toPosix(p: string): string {
  return p.split(sep).join(posix.sep);
}

function isExternalLink(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

function isAnchorOnly(href: string): boolean {
  return href.startsWith("#");
}

function isReadmeLink(href: string): boolean {
  const path = href.split("#")[0]!;
  return /(^|\/)readme\.md$/i.test(path);
}

interface InlineLink {
  raw: string;
  // Resolved absolute path on disk (without anchor), if computable.
  absolutePath: string | null;
  // Resolved article id (relative path without .md), if it pointed to a .md.
  articleId: string | null;
}

// Walks the body of an article extracting `[text](href)` references.
function extractInlineLinks(article: Article): InlineLink[] {
  const out: InlineLink[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  const baseDir = dirname(article.absolutePath);
  while ((match = regex.exec(article.body)) !== null) {
    const href = match[2]!.trim();
    if (isAnchorOnly(href) || isExternalLink(href)) continue;
    // Strip optional anchor.
    const withoutAnchor = href.split("#")[0]!;
    // We only care about Markdown links — skip image/asset paths.
    if (!withoutAnchor.endsWith(".md")) continue;
    const absolute = resolvePath(baseDir, withoutAnchor);
    const articleId = isReadmeLink(withoutAnchor) ? null : idForArticle(absolute);
    out.push({
      raw: href,
      absolutePath: absolute,
      articleId: isReadmeLink(withoutAnchor) ? null : articleId,
    });
  }
  return out;
}

function audit(): { fatals: FatalError[]; suggestions: Suggestion[] } {
  const tags = TagVocabulary.load();
  const repo = ArticleRepository.load(tags);
  const articleIds = new Set(repo.allArticles().map((a) => a.id));

  const fatals: FatalError[] = [];
  const suggestions: Suggestion[] = [];

  for (const article of repo.allArticles()) {
    const inlineLinks = extractInlineLinks(article);

    // Fatal pass: any inline link to a missing .md file is a broken reference.
    for (const link of inlineLinks) {
      if (link.absolutePath && !existsSync(link.absolutePath)) {
        fatals.push({
          articleId: article.id,
          message: `inline link points to missing file: ${link.raw}`,
        });
      }
    }

    // Fatal pass on related[] is already enforced by ArticleRepository.load(),
    // but we re-state it here for robustness in case validation rules change.
    for (const rel of article.frontMatter.related) {
      if (!articleIds.has(rel)) {
        fatals.push({
          articleId: article.id,
          message: `related[] entry points to non-existent article: ${rel}`,
        });
      }
    }

    // Curated pass: diverge inline links and related[] for human review.
    if (STRICT) continue;

    const inlineArticleIds = new Set(
      inlineLinks
        .map((l) => l.articleId)
        .filter((id): id is string => id !== null && articleIds.has(id)),
    );
    const relatedSet = new Set(article.frontMatter.related);

    const unrelatedInlineLinks = [...inlineArticleIds]
      .filter((id) => !relatedSet.has(id) && id !== article.id)
      .sort();
    const unmentionedRelated = article.frontMatter.related
      .filter((id) => !inlineArticleIds.has(id))
      .slice()
      .sort();

    if (unrelatedInlineLinks.length > 0 || unmentionedRelated.length > 0) {
      suggestions.push({
        articleId: article.id,
        unrelatedInlineLinks,
        unmentionedRelated,
      });
    }
  }

  void CONTENT_DIRS;
  return { fatals, suggestions };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function writeReport(suggestions: Suggestion[]): void {
  if (suggestions.length === 0) {
    if (existsSync(REPORT_PATH)) {
      writeFileSync(
        REPORT_PATH,
        `# Audit Report — ${formatDate(new Date())}\n\n_No suggestions — every \`related[]\` matches its inline links and vice versa._\n`,
        "utf8",
      );
    }
    return;
  }
  const lines: string[] = [];
  lines.push(`# Audit Report — ${formatDate(new Date())}`, "");
  lines.push(
    "Curated suggestions. These are not errors — review each item and update the article's `related[]` or remove the inline link as appropriate.",
    "",
  );
  for (const s of suggestions) {
    lines.push(`## ${s.articleId}`);
    if (s.unrelatedInlineLinks.length > 0) {
      lines.push("", "### Inline links not in `related`");
      for (const id of s.unrelatedInlineLinks) {
        lines.push(`- [ ] ${id}`);
      }
    }
    if (s.unmentionedRelated.length > 0) {
      lines.push("", "### `related` entries without inline link");
      for (const id of s.unmentionedRelated) {
        lines.push(`- [ ] ${id}`);
      }
    }
    lines.push("");
  }
  writeFileSync(REPORT_PATH, lines.join("\n"), "utf8");
}

try {
  const { fatals, suggestions } = audit();

  for (const f of fatals) {
    process.stderr.write(`FATAL  ${f.articleId}: ${f.message}\n`);
  }

  if (!STRICT) {
    writeReport(suggestions);
    process.stdout.write(
      `audit-links: ${fatals.length} fatal(s), ${suggestions.length} article(s) with suggestions\n`,
    );
    if (suggestions.length > 0) {
      process.stdout.write(`audit-links: report → ${REPORT_PATH}\n`);
    }
  } else {
    process.stdout.write(
      `audit-links (strict): ${fatals.length} fatal(s)\n`,
    );
  }

  process.exit(fatals.length > 0 ? 1 : 0);
} catch (err) {
  const message = err instanceof Error ? err.stack ?? err.message : String(err);
  process.stderr.write(`audit-links failed: ${message}\n`);
  process.exit(2);
}
