import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// Walks up from this file until it finds the dev-atlas repo root (the directory
// containing CLAUDE.md plus the four content top-levels). Resolves both at
// runtime (`dist/`) and during dev (`src/`).
function findRepoRoot(start: string): string {
  let current = start;
  for (let i = 0; i < 8; i++) {
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
    // We expect to find dev-atlas root above either dist/lib or src/lib.
    if (current.endsWith("mcp-server")) {
      return dirname(current);
    }
  }
  throw new Error(`Could not locate dev-atlas repo root from ${start}`);
}

export const REPO_ROOT = findRepoRoot(here);

export const CONTENT_DIRS = [
  "software-engineering",
  "languages",
  "tools",
  "operating-systems",
] as const;

export const TAGS_FILE = resolve(REPO_ROOT, "_templates", "tags.md");

export const EXCLUDED_DIRS = new Set([
  "_templates",
  "mcp-server",
  ".git",
  "node_modules",
  ".claude",
]);
