#!/usr/bin/env tsx
// Backfill Wave 1 — populates a syntactically valid front-matter block on every
// content article that does not yet have one. Idempotent: skips files that
// already start with `---`.
//
// Inferences:
//   - `type`: `how-to` if the body contains `## Steps` or `## Prerequisites`,
//     otherwise `concept`.
//   - `language`: derived from the path when the article lives under
//     `languages/<lang>/...`, otherwise `null`.
//   - `tags`, `related`: always empty after Wave 1 — humans fill them in
//     during Wave 2.
//
// Ambiguous inferences (no Steps/Prerequisites in a how-to-ish path, or vice
// versa) are reported as warnings to stderr; the script does not refuse to
// run, since a default is always selected. README.md files and `_templates/`
// are skipped.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve, basename, relative, sep, posix } from "node:path";
import {
  CONTENT_DIRS,
  EXCLUDED_DIRS,
  REPO_ROOT,
} from "../src/lib/config.js";

interface Inference {
  type: "concept" | "how-to";
  language: string | null;
  warning: string | null;
}

function toPosix(p: string): string {
  return p.split(sep).join(posix.sep);
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

function inferType(body: string): "concept" | "how-to" {
  if (/^##\s+Steps\b/im.test(body)) return "how-to";
  if (/^##\s+Prerequisites\b/im.test(body)) return "how-to";
  return "concept";
}

function inferLanguage(absolutePath: string): string | null {
  const rel = toPosix(relative(REPO_ROOT, absolutePath));
  const match = /^languages\/([^/]+)\//.exec(rel);
  if (!match) return null;
  const lang = match[1]!;
  // The wiki uses `flutter` and `react` as their own top-level under
  // `languages/` even though they aren't strictly languages. Tag-side we
  // include them in the Language category for symmetry.
  return lang;
}

function inferenceFor(absolutePath: string, body: string): Inference {
  const type = inferType(body);
  const language = inferLanguage(absolutePath);
  let warning: string | null = null;
  if (
    type === "concept" &&
    /^##\s+(Verification|Common\s+issues)\b/im.test(body)
  ) {
    warning =
      "body has Verification/Common issues section but no `## Steps` — defaulted to concept";
  }
  return { type, language, warning };
}

function buildFrontMatter(inf: Inference): string {
  const language = inf.language === null ? "null" : JSON.stringify(inf.language);
  return [
    "---",
    `type: ${inf.type}`,
    "tags: []",
    "related: []",
    `language: ${language}`,
    "---",
    "",
  ].join("\n");
}

function hasFrontMatter(source: string): boolean {
  return /^---\s*\n/.test(source);
}

let touched = 0;
let skipped = 0;
const warnings: string[] = [];

for (const top of CONTENT_DIRS) {
  walk(resolve(REPO_ROOT, top), (absolutePath) => {
    const name = basename(absolutePath);
    if (name.toLowerCase() === "readme.md") return;

    const source = readFileSync(absolutePath, "utf8");
    if (hasFrontMatter(source)) {
      skipped++;
      return;
    }

    const inf = inferenceFor(absolutePath, source);
    if (inf.warning) {
      warnings.push(`${absolutePath}: ${inf.warning}`);
    }

    const newSource = buildFrontMatter(inf) + source;
    writeFileSync(absolutePath, newSource, "utf8");
    touched++;
    statSync(absolutePath);
  });
}

process.stdout.write(`backfill: touched ${touched} files, skipped ${skipped}\n`);
if (warnings.length > 0) {
  process.stderr.write(`backfill: ${warnings.length} warning(s):\n`);
  for (const w of warnings) {
    process.stderr.write(`  - ${w}\n`);
  }
}
