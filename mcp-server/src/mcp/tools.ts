import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import type { ArticleRepository } from "../articles/repository.js";
import { extractH2Section } from "../articles/sections.js";
import type { Article } from "../articles/types.js";
import type { TagVocabulary, TagCategory } from "../lib/tags.js";
import type { SearchService } from "../search/search-service.js";
import type { RelatedService } from "../search/related-service.js";
import type { AntipatternService } from "../search/antipattern-service.js";
import { idFromArticleRef } from "./resources.js";

export interface ToolContext {
  tags: TagVocabulary;
  repo: ArticleRepository;
  search: SearchService;
  related: RelatedService;
  antipatterns: AntipatternService;
}

// ---------- input schemas ----------

const SearchArticlesInput = z.object({
  query: z.string().default(""),
  tags: z.array(z.string()).optional(),
  type: z.enum(["concept", "how-to"]).optional(),
  section: z.string().optional(),
  language: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  verbose: z.boolean().optional().default(false),
});

const GetArticleInput = z.object({
  id: z.string().min(1),
  include: z
    .enum(["body", "sections", "when-not", "meta"])
    .optional()
    .default("body"),
});

const FindRelatedInput = z.object({
  id: z.string().min(1),
  limit: z.number().int().positive().max(100).optional(),
});

const FindAntipatternsInput = z.object({
  topic: z.string().min(1),
  limit: z.number().int().positive().max(100).optional(),
});

const ListSectionsInput = z.object({}).strict();

const ListTagsInput = z.object({
  category: z.string().optional(),
});

// ---------- serialization helpers ----------

function summarize(article: Article) {
  return {
    id: article.id,
    title: article.title,
    summary: article.summary,
    section: article.section,
    type: article.frontMatter.type,
    tags: article.frontMatter.tags,
    language: article.frontMatter.language,
  };
}

// Slimmer shape used when `summarize` would be overkill — currently the
// `related` expansion in `get_article`, where the caller already has the
// parent's full metadata and only needs to know which neighbours exist.
function slimSummarize(article: Article) {
  return {
    id: article.id,
    title: article.title,
    summary: article.summary,
  };
}

interface SectionNode {
  path: string;
  title: string;
  // Description is included only at depths 0 and 1 — at deeper levels the
  // title alone disambiguates and the description is mostly redundant.
  description?: string | null;
  articleCount: number;
  totalArticles: number;
  subsections: SectionNode[];
}

// Beyond this depth, `description` is omitted from the tree node. Depth 0 is
// the top-level section (e.g., "software-engineering"); depth 1 is its
// immediate children (e.g., "design-patterns").
const SECTION_DESCRIPTION_MAX_DEPTH = 1;

function buildSectionTree(ctx: ToolContext): SectionNode[] {
  const sections = new Map<
    string,
    {
      path: string;
      directArticles: number;
      totalArticles: number;
      children: Set<string>;
    }
  >();

  function ensure(path: string) {
    let node = sections.get(path);
    if (!node) {
      node = {
        path,
        directArticles: 0,
        totalArticles: 0,
        children: new Set(),
      };
      sections.set(path, node);
    }
    return node;
  }

  for (const article of ctx.repo.allArticles()) {
    const segments = article.section.split("/").filter((s) => s.length > 0);
    // Increment direct count on the immediate parent only.
    if (segments.length > 0) {
      ensure(segments.join("/")).directArticles += 1;
    }
    // Increment recursive total on every prefix.
    for (let i = 1; i <= segments.length; i++) {
      const path = segments.slice(0, i).join("/");
      ensure(path).totalArticles += 1;
      if (i > 1) {
        const parent = segments.slice(0, i - 1).join("/");
        ensure(parent).children.add(path);
      }
    }
  }

  function materialize(path: string, depth: number): SectionNode {
    const data = sections.get(path)!;
    const indexEntry = ctx.repo.sectionIndexByPath(path);
    const node: SectionNode = {
      path,
      title: indexEntry?.title ?? path,
      articleCount: data.directArticles,
      totalArticles: data.totalArticles,
      subsections: [...data.children]
        .sort((a, b) => a.localeCompare(b))
        .map((child) => materialize(child, depth + 1)),
    };
    if (depth <= SECTION_DESCRIPTION_MAX_DEPTH) {
      node.description = indexEntry?.description ?? null;
    }
    return node;
  }

  // Top-level sections = paths with exactly one segment.
  const topLevel = [...sections.keys()]
    .filter((p) => !p.includes("/"))
    .sort((a, b) => a.localeCompare(b));

  return topLevel.map((path) => materialize(path, 0));
}

function asJson(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value),
      },
    ],
  };
}

// ---------- tool registration ----------

interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodType;
  handle: (ctx: ToolContext, input: unknown) => unknown;
}

const TOOLS: ToolDefinition[] = [
  {
    name: "search_articles",
    description:
      "Search by query and filters (tags=AND, section=prefix, language). Empty query → filter-only. Returns slim hits {id, title, summary, score}; pass verbose=true for {section, type, tags, language}.",
    schema: SearchArticlesInput,
    handle: (ctx, raw) => {
      const input = SearchArticlesInput.parse(raw);
      const result = ctx.search.search(input);
      return {
        total: result.total,
        results: result.hits.map((hit) => ({
          ...(input.verbose ? summarize(hit.article) : slimSummarize(hit.article)),
          score: hit.score,
        })),
      };
    },
  },
  {
    name: "get_article",
    description:
      "Fetch one article by id or atlas://article URI. `include`: body (default, full markdown) | sections (headings only) | when-not (only \"When NOT to use\") | meta (no body).",
    schema: GetArticleInput,
    handle: (ctx, raw) => {
      const input = GetArticleInput.parse(raw);
      const id = idFromArticleRef(input.id);
      const article = id ? ctx.repo.articleById(id) : undefined;
      if (!article) {
        throw new Error(`article not found: ${input.id}`);
      }
      const relatedExpanded = article.frontMatter.related
        .map((relId) => ctx.repo.articleById(relId))
        .filter((a): a is Article => a !== undefined)
        .map(slimSummarize);
      const base = {
        ...summarize(article),
        related: relatedExpanded,
      };
      switch (input.include) {
        case "meta":
          return base;
        case "sections":
          return { ...base, headings: article.headings };
        case "when-not":
          return {
            ...base,
            whenNot: extractH2Section(article.body, "When NOT to use"),
          };
        case "body":
        default:
          return { ...base, body: article.body };
      }
    },
  },
  {
    name: "find_related",
    description:
      "Articles related to id. Explicit related[] first (bidirectional), then ≥2 shared tags, ordered by overlap desc.",
    schema: FindRelatedInput,
    handle: (ctx, raw) => {
      const input = FindRelatedInput.parse(raw);
      const id = idFromArticleRef(input.id);
      if (!id || !ctx.repo.articleById(id)) {
        throw new Error(`article not found: ${input.id}`);
      }
      const hits = ctx.related.findRelated(id, input.limit);
      return {
        related: hits.map((hit) => ({
          ...summarize(hit.article),
          relationship: hit.relationship,
          sharedTags: hit.sharedTags,
        })),
      };
    },
  },
  {
    name: "find_antipatterns",
    description:
      "Antipatterns for a topic. Tier 1: articles tagged `antipattern`. Tier 2 fallback: \"When NOT to use\" sections. Hits include a ~120-char snippet for citation; use get_article for full metadata.",
    schema: FindAntipatternsInput,
    handle: (ctx, raw) => {
      const input = FindAntipatternsInput.parse(raw);
      const hits = ctx.antipatterns.find(input.topic, input.limit ?? 10);
      return {
        results: hits.map((hit) => ({
          id: hit.article.id,
          title: hit.article.title,
          source: hit.source,
          snippet: hit.snippet,
          score: hit.score,
        })),
      };
    },
  },
  {
    name: "list_sections",
    description:
      "Wiki navigation tree with direct + recursive article counts. Descriptions included at top two depths only.",
    schema: ListSectionsInput,
    handle: (ctx, raw) => {
      ListSectionsInput.parse(raw);
      return { sections: buildSectionTree(ctx) };
    },
  },
  {
    name: "list_tags",
    description:
      "Tag vocabulary with article counts. Optional `category` filter. Includes unused tags (count 0).",
    schema: ListTagsInput,
    handle: (ctx, raw) => {
      const input = ListTagsInput.parse(raw);
      const counts = new Map<string, number>();
      for (const article of ctx.repo.allArticles()) {
        for (const tag of article.frontMatter.tags) {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
      const all = ctx.tags.all();
      const filtered = input.category
        ? all.filter((t) => t.category === (input.category as TagCategory))
        : all;
      return {
        tags: filtered
          .map((t) => ({
            name: t.name,
            category: t.category,
            count: counts.get(t.name) ?? 0,
          }))
          .sort((a, b) => {
            if (a.category !== b.category) return a.category.localeCompare(b.category);
            return a.name.localeCompare(b.name);
          }),
      };
    },
  },
];

// `zodToJsonSchema` injects a top-level `$schema` URL into every emitted
// schema. The MCP client never uses that hint, and it costs ~50 bytes per
// tool in the `tools/list` payload — pure boot-time waste. Stripping it
// keeps the rest of the schema (which IS draft-2020-12-compatible — see
// commit b8f2b17) intact.
function toInputSchema(schema: z.ZodType): object {
  const result = zodToJsonSchema(schema) as Record<string, unknown>;
  delete result.$schema;
  return result;
}

export function registerTools(server: Server, ctx: ToolContext): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: toInputSchema(t.schema),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) {
      throw new Error(`unknown tool: ${name}`);
    }
    const result = tool.handle(ctx, request.params.arguments ?? {});
    return asJson(result);
  });
}
