import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ArticleRepository } from "../articles/repository.js";

const ARTICLE_PREFIX = "atlas://article/";
const SECTION_PREFIX = "atlas://section/";

export function uriForArticle(id: string): string {
  return `${ARTICLE_PREFIX}${id}`;
}

export function uriForSection(path: string): string {
  return `${SECTION_PREFIX}${path}`;
}

// Tries to interpret an arbitrary string as either an article id (raw path,
// no .md) or an `atlas://article/...` URI. Returns the raw id or null when
// the string clearly does not look like either form.
export function idFromArticleRef(ref: string): string | null {
  if (ref.startsWith(ARTICLE_PREFIX)) return ref.slice(ARTICLE_PREFIX.length);
  if (ref.startsWith(SECTION_PREFIX)) return null;
  if (ref.length === 0) return null;
  return ref;
}

export function registerResources(
  server: Server,
  repo: ArticleRepository,
): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources: Array<{
      uri: string;
      name: string;
      mimeType: string;
    }> = [];

    for (const article of repo.allArticles()) {
      resources.push({
        uri: uriForArticle(article.id),
        name: article.title,
        mimeType: "text/markdown",
      });
    }

    for (const index of repo.allSectionIndexes()) {
      resources.push({
        uri: uriForSection(index.path),
        name: index.title,
        mimeType: "text/markdown",
      });
    }

    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri.startsWith(ARTICLE_PREFIX)) {
      const id = uri.slice(ARTICLE_PREFIX.length);
      const article = repo.articleById(id);
      if (!article) {
        throw new Error(`Resource not found: ${uri}`);
      }
      // We intentionally strip the YAML front-matter block from the body the
      // agent receives. Structured metadata is available via `get_article`.
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: article.body,
          },
        ],
      };
    }

    if (uri.startsWith(SECTION_PREFIX)) {
      const path = uri.slice(SECTION_PREFIX.length);
      const index = repo.sectionIndexByPath(path);
      if (!index) {
        throw new Error(`Resource not found: ${uri}`);
      }
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: index.body,
          },
        ],
      };
    }

    throw new Error(`Unsupported URI scheme: ${uri}`);
  });
}
