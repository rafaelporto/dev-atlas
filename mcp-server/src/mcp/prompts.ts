import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

interface PromptDefinition {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
  render: (args: Record<string, string>) => string;
}

const PROMPTS: PromptDefinition[] = [
  {
    name: "pick-pattern-for",
    description:
      "Recommend dev-atlas patterns/architectures/principles applicable to a problem, with trade-offs and antipattern callouts.",
    arguments: [
      {
        name: "problem",
        description: "A description of the design problem to solve.",
        required: true,
      },
    ],
    render: ({ problem }) =>
      [
        `The user is facing this problem: ${problem}.`,
        ``,
        `Use the dev-atlas MCP server to find applicable patterns.`,
        `1. Call \`search_articles\` with tags that match the problem domain (likely \`design-pattern\`, \`architecture\`, or \`principle\`).`,
        `2. For each candidate, call \`get_article\` to read its definition, "When to use", and "When NOT to use" sections.`,
        `3. Call \`find_antipatterns\` on the most relevant topic words from the problem to surface what to avoid.`,
        `4. Conclude with a ranked recommendation that names the patterns, summarizes trade-offs, and cites the dev-atlas articles by id.`,
      ].join("\n"),
  },
  {
    name: "find-antipattern-risks",
    description:
      "Analyze code or a description for likely antipatterns, citing dev-atlas articles.",
    arguments: [
      {
        name: "code_or_description",
        description:
          "Source code, pseudocode, or a description of the design to audit.",
        required: true,
      },
    ],
    render: ({ code_or_description }) =>
      [
        `Audit the following for antipatterns:`,
        ``,
        code_or_description,
        ``,
        `Procedure:`,
        `1. Identify candidate topics (e.g., 'global state', 'tight coupling', 'god object', 'shotgun surgery').`,
        `2. For each candidate, call \`find_antipatterns\` and inspect the matched articles.`,
        `3. For every finding, call \`get_article\` to quote the canonical "When NOT to use" section.`,
        `4. Report findings grouped by severity (high / medium / low), each citing the dev-atlas article id and the specific evidence in the input.`,
      ].join("\n"),
  },
];

export function registerPrompts(server: Server): void {
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: PROMPTS.map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const name = request.params.name;
    const prompt = PROMPTS.find((p) => p.name === name);
    if (!prompt) {
      throw new Error(`unknown prompt: ${name}`);
    }
    const args: Record<string, string> = {};
    for (const arg of prompt.arguments) {
      const value = request.params.arguments?.[arg.name];
      if (typeof value !== "string" || value.length === 0) {
        if (arg.required) {
          throw new Error(`missing required argument: ${arg.name}`);
        }
        continue;
      }
      args[arg.name] = value;
    }
    return {
      description: prompt.description,
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: prompt.render(args),
          },
        },
      ],
    };
  });
}
