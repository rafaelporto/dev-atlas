import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { ArticleRepository } from "../articles/repository.js";
import { TagVocabulary } from "../lib/tags.js";
import { buildIndex } from "../search/indexer.js";
import { SearchService } from "../search/search-service.js";
import { RelatedService } from "../search/related-service.js";
import { AntipatternService } from "../search/antipattern-service.js";

import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";
import { registerPrompts } from "./prompts.js";

export async function startServer(): Promise<void> {
  // Fail-fast composition root: parse + validate everything before opening
  // stdio. Any error here surfaces directly on the operator's terminal when
  // they run `npm run start` (the MCP client only sees "server failed to
  // start"; the operator must inspect stderr for the actual diagnostic).
  const tags = TagVocabulary.load();
  const repo = ArticleRepository.load(tags);
  const articles = repo.allArticles();
  const index = buildIndex(articles);
  const search = new SearchService(index);
  const related = new RelatedService(index);
  const antipatterns = new AntipatternService(index, search);

  const server = new Server(
    { name: "dev-atlas", version: "0.1.0" },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    },
  );

  registerResources(server, repo);
  registerTools(server, { tags, repo, search, related, antipatterns });
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
