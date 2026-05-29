export type ArticleType = "concept" | "how-to";

export interface ArticleFrontMatter {
  type: ArticleType;
  tags: string[];
  related: string[];
  language: string | null;
}

export interface Article {
  // Repo-relative path without the .md extension, e.g.
  // "software-engineering/design-patterns/creational/factory-method".
  // This is the canonical id everywhere (search results, URIs, related[]).
  id: string;
  // Absolute path on disk for the original .md file.
  absolutePath: string;
  // Section prefix derived from id, e.g.
  // "software-engineering/design-patterns/creational".
  section: string;
  frontMatter: ArticleFrontMatter;
  title: string;
  summary: string;
  body: string;
  // Headings inside the body: pairs of (level, text). Used by the indexer
  // to weight matches inside section titles ("## What is it?", etc.).
  headings: Array<{ level: number; text: string }>;
}

export interface SectionIndex {
  // Repo-relative directory path, e.g.
  // "software-engineering/design-patterns/creational".
  path: string;
  absolutePath: string;
  title: string;
  // First paragraph of the README, used as `description` in list_sections
  // and as the body of the section-index resource.
  description: string | null;
  body: string;
}
