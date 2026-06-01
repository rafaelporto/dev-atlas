import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import type { ArticleRepository } from "../articles/repository.js";
import type { Article } from "../articles/types.js";
import type { TagVocabulary, TagCategory } from "../lib/tags.js";
import type { SearchService } from "../search/search-service.js";
import type { RelatedService } from "../search/related-service.js";
import type { AntipatternService } from "../search/antipattern-service.js";
import { idFromArticleRef, uriForArticle, uriForSection } from "./resources.js";

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
});

const GetArticleInput = z.object({
  id: z.string().min(1),
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
    uri: uriForArticle(article.id),
    id: article.id,
    title: article.title,
    summary: article.summary,
    path: article.id,
    section: article.section,
    type: article.frontMatter.type,
    tags: article.frontMatter.tags,
    language: article.frontMatter.language,
  };
}

interface SectionNode {
  path: string;
  title: string;
  description: string | null;
  articleCount: number;
  totalArticles: number;
  sectionIndexUri: string | null;
  subsections: SectionNode[];
}

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

  function materialize(path: string): SectionNode {
    const data = sections.get(path)!;
    const indexEntry = ctx.repo.sectionIndexByPath(path);
    return {
      path,
      title: indexEntry?.title ?? path,
      description: indexEntry?.description ?? null,
      articleCount: data.directArticles,
      totalArticles: data.totalArticles,
      sectionIndexUri: indexEntry ? uriForSection(path) : null,
      subsections: [...data.children]
        .sort((a, b) => a.localeCompare(b))
        .map(materialize),
    };
  }

  // Top-level sections = paths with exactly one segment.
  const topLevel = [...sections.keys()]
    .filter((p) => !p.includes("/"))
    .sort((a, b) => a.localeCompare(b));

  return topLevel.map(materialize);
}

function asJson(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
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
      "Search dev-atlas articles by query and/or filters. Tags combine with AND. Section filter is prefix-match. Language filter unifies the dedicated `language` field with the tag of the same name (so multilingual mobile articles surface when filtering by `swift`). Pass an empty query for filter-only listings.",
    schema: SearchArticlesInput,
    handle: (ctx, raw) => {
      const input = SearchArticlesInput.parse(raw);
      const result = ctx.search.search(input);
      return {
        total: result.total,
        results: result.hits.map((hit) => ({
          ...summarize(hit.article),
          score: hit.score,
        })),
      };
    },
  },
  {
    name: "get_article",
    description:
      "Fetch a single article with expanded metadata and the full Markdown body. Accepts either the article id (path without .md) or its `atlas://article/...` URI.",
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
        .map(summarize);
      return {
        ...summarize(article),
        related: relatedExpanded,
        body: article.body,
      };
    },
  },
  {
    name: "find_related",
    description:
      "Find articles related to a given article. Returns explicit `related` entries first (bidirectional), then articles sharing at least 2 tags. Ordered by overlap descending.",
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
      "Search for antipatterns relevant to a topic. First tier: articles tagged `antipattern`. Fallback (if tier 1 is sparse): 'When NOT to use' sections of related articles. Each hit carries a ~200-char snippet so the agent can cite without an extra get_article call.",
    schema: FindAntipatternsInput,
    handle: (ctx, raw) => {
      const input = FindAntipatternsInput.parse(raw);
      const hits = ctx.antipatterns.find(input.topic, input.limit ?? 10);
      return {
        results: hits.map((hit) => ({
          ...summarize(hit.article),
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
      "Returns the navigation tree of the wiki: each section's title, description (from its README), direct and recursive article counts, and the URI of its section-index resource.",
    schema: ListSectionsInput,
    handle: (ctx, raw) => {
      ListSectionsInput.parse(raw);
      return { sections: buildSectionTree(ctx) };
    },
  },
  {
    name: "list_tags",
    description:
      "Returns the tag vocabulary with article counts. Optional `category` filter ('domain', 'topic', 'language', etc.). Includes tags that exist in the vocabulary but are not yet used by any article (count: 0).",
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

export function registerTools(server: Server, ctx: ToolContext): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.schema) as object,
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
