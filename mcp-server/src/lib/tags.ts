import { readFileSync } from "node:fs";
import { TAGS_FILE } from "./config.js";

export type TagCategory =
  | "domain"
  | "pattern-category"
  | "architectural-style"
  | "cross-cutting"
  | "language"
  | "operating-system"
  | "paradigm"
  | "topic";

export interface TagDefinition {
  name: string;
  category: TagCategory;
}

const CATEGORY_HEADING_TO_KEY: Record<string, TagCategory> = {
  "domain": "domain",
  "pattern category": "pattern-category",
  "architectural style": "architectural-style",
  "cross-cutting": "cross-cutting",
  "language": "language",
  "operating system": "operating-system",
  "paradigm": "paradigm",
  "topic": "topic",
};

export class TagVocabulary {
  private constructor(private readonly byName: Map<string, TagDefinition>) {}

  static load(): TagVocabulary {
    return TagVocabulary.parse(readFileSync(TAGS_FILE, "utf8"));
  }

  // Parses `_templates/tags.md`. Looks for `### <Category>` headings under a
  // `## Categories` section and collects every backticked, kebab-case tag name
  // from the bullets beneath.
  static parse(source: string): TagVocabulary {
    const lines = source.split("\n");
    const tags = new Map<string, TagDefinition>();

    let inCategoriesSection = false;
    let currentCategory: TagCategory | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      if (/^##\s+/.test(line)) {
        const heading = line.replace(/^##\s+/, "").trim().toLowerCase();
        inCategoriesSection = heading === "categories";
        currentCategory = null;
        continue;
      }

      if (!inCategoriesSection) continue;

      if (/^###\s+/.test(line)) {
        const rawHeading = line.replace(/^###\s+/, "").trim();
        // Headings include trailing prose like "Domain — what kind of article is this?".
        // Split on em-dash only — plain hyphens are part of legitimate category
        // names like "Cross-cutting".
        const key = rawHeading.split("—", 1)[0]!.trim().toLowerCase();
        currentCategory = CATEGORY_HEADING_TO_KEY[key] ?? null;
        continue;
      }

      if (currentCategory === null) continue;

      // Match lines like "- `tag-name`" or "- `tag-a`, `tag-b`".
      const bulletMatch = /^\s*-\s+(.+)$/.exec(line);
      if (!bulletMatch) continue;
      const bullet = bulletMatch[1]!;

      for (const tag of bullet.matchAll(/`([a-z0-9][a-z0-9-]*)`/g)) {
        const name = tag[1]!;
        if (!tags.has(name)) {
          tags.set(name, { name, category: currentCategory });
        }
      }
    }

    if (tags.size === 0) {
      throw new Error(
        `Tag vocabulary at ${TAGS_FILE} is empty. Did the file structure change?`,
      );
    }

    return new TagVocabulary(tags);
  }

  has(tag: string): boolean {
    return this.byName.has(tag);
  }

  get(tag: string): TagDefinition | undefined {
    return this.byName.get(tag);
  }

  all(): TagDefinition[] {
    return [...this.byName.values()];
  }

  categoryOf(tag: string): TagCategory | undefined {
    return this.byName.get(tag)?.category;
  }

  // Validates a single article's tags. Returns the offending tag name on
  // failure, or null on success. Caller composes the error message.
  validate(tags: readonly string[]): string | null {
    for (const tag of tags) {
      if (!this.byName.has(tag)) return tag;
    }
    return null;
  }
}
