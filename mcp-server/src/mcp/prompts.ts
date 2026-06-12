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
  {
    name: "principles-pre-flight",
    description:
      "Pre-feature checklist grounded in SOLID + Pragmatic Principles + DDD. If a target language has a dev-atlas section, its articles are referenced too.",
    arguments: [
      {
        name: "feature",
        description: "Description of the feature to implement.",
        required: true,
      },
      {
        name: "language",
        description:
          "Target language/stack (e.g., 'go', 'swift'). If a dev-atlas section exists for it, its articles will be cited.",
        required: false,
      },
    ],
    render: ({ feature, language }) => {
      const steps: Array<string | null> = [
        'Call `search_articles` with { tags: ["principle"] } to list SOLID + Pragmatic Principles.',
        'Call `search_articles` with { query: "domain-driven design" } to surface the DDD article and closely related concepts.',
        language
          ? `Call \`list_sections\` to check whether \`languages/${language}/\` exists. If it does, call \`search_articles\` with { language: "${language}" } to surface idioms, error-handling, and concurrency conventions relevant to the design.`
          : null,
        'For each principle (SOLID + DRY + KISS + YAGNI + Fail Fast) and for DDD, call `get_article` and read "What is it?" and "When NOT to use".',
        "For the feature above, produce a checklist with one row per principle/concept: how it applies, where the highest risk of violation is, and one concrete design choice that honors it.",
        `Cite each item by its dev-atlas article id.${language ? " Cite language-specific articles too when applicable." : ""}`,
        "Only AFTER this checklist, propose a high-level design sketch.",
      ];
      const numbered = steps
        .filter((s): s is string => s !== null)
        .map((s, i) => `${i + 1}. ${s}`);
      const header: string[] = [
        `You are about to implement this feature: ${feature}.`,
      ];
      if (language) {
        header.push(`Target language/stack: ${language}.`);
      }
      return [
        ...header,
        "",
        "Before writing any code, ground your design in dev-atlas.",
        "",
        ...numbered,
      ].join("\n");
    },
  },
  {
    name: "compose-design-patterns",
    description:
      "Compose a feature design from 1–3 GoF design patterns. Use 1 for simple changes; 2–3 when patterns must collaborate.",
    arguments: [
      {
        name: "feature",
        description: "Description of the feature to design.",
        required: true,
      },
    ],
    render: ({ feature }) =>
      [
        `You are about to design this feature: ${feature}.`,
        ``,
        `Compose a design from 1–3 GoF design patterns. Use just 1 when the feature is simple (small fix or localized change); use 2–3 when the feature genuinely needs patterns collaborating.`,
        ``,
        `1. Call \`search_articles\` with { tags: ["design-pattern"] } to list all 23 GoF patterns (creational, structural, behavioral).`,
        `2. Identify the 1–3 patterns that fit. Each chosen pattern must own a distinct responsibility — do not pile patterns on for completeness.`,
        `3. For each chosen pattern, call \`get_article\` and read "When to use" and "When NOT to use".`,
        `4. Produce the design output:`,
        `   - For each pattern: responsibility in this feature, key collaborator, trade-off accepted.`,
        `   - Explicit justification for the combination (or for choosing just one).`,
        `   - Ask the user whether they want a diagram (ASCII or Mermaid) to be produced.`,
        `5. Cite every chosen pattern by its dev-atlas article id.`,
        `6. List one antipattern risk specific to this design (e.g., over-engineering if the feature is too small; god object if responsibilities collapse).`,
      ].join("\n"),
  },
  {
    name: "pre-implementation-briefing",
    description:
      "Full pre-implementation briefing (principles + DDD + patterns + antipatterns + TDD) followed by failing tests (red phase). After delivering the tests, the agent asks whether to implement the solution or wait for the user.",
    arguments: [
      {
        name: "feature",
        description: "Description of the feature to implement.",
        required: true,
      },
      {
        name: "language",
        description:
          "Target language/stack (required to write tests; if omitted, the agent will ask before writing tests).",
        required: false,
      },
    ],
    render: ({ feature, language }) => {
      const phases: Array<{ title: string; steps: string[] } | null> = [
        {
          title: "PHASE 1 — Principles",
          steps: [
            'Call `search_articles` with { tags: ["principle"] } to list SOLID + Pragmatic.',
            'Call `search_articles` with { query: "domain-driven design" } to include DDD.',
            'Select the 3–5 most relevant items. Call `get_article` on each and read "What is it?" and "When NOT to use".',
          ],
        },
        {
          title: "PHASE 2 — Patterns",
          steps: [
            'Call `search_articles` with { tags: ["design-pattern"] }.',
            "Select 1–3 patterns (1 for simple changes; 2–3 when patterns must collaborate).",
            'For each, call `get_article` and read "When to use" and "When NOT to use".',
          ],
        },
        {
          title: "PHASE 3 — Antipatterns",
          steps: [
            'Extract 3–5 keywords from the feature (e.g., "cache", "retry", "global state").',
            "Call `find_antipatterns` for each keyword and aggregate findings.",
          ],
        },
        language
          ? {
              title: "PHASE 4 — Language reference",
              steps: [
                `Call \`list_sections\` to confirm whether \`languages/${language}/\` exists.`,
                `If it does, call \`search_articles\` with { language: "${language}" } and read articles relevant to the feature (idioms, error-handling, concurrency).`,
              ],
            }
          : null,
        {
          title: `PHASE ${language ? "5" : "4"} — TDD primer`,
          steps: [
            'Call `search_articles` with { query: "tdd" } and `get_article` on the TDD article to refresh red/green/refactor.',
          ],
        },
      ];
      const activePhases = phases.filter(
        (p): p is { title: string; steps: string[] } => p !== null,
      );
      const lines: string[] = [
        `You are about to scaffold tests for this feature: ${feature}.`,
      ];
      if (language) {
        lines.push(`Target language/stack: ${language}.`);
      }
      lines.push(
        "",
        "You will follow TDD. First deliver the briefing, then the failing tests (red phase). AFTER the tests are delivered, you will offer the user two options: (A) implement the production code yourself to make the tests pass, or (B) wait while the user implements it.",
      );
      let counter = 0;
      for (const phase of activePhases) {
        lines.push("", `**${phase.title}**`);
        for (const step of phase.steps) {
          counter += 1;
          lines.push(`${counter}. ${step}`);
        }
      }
      const letters = "ABCDEFGH".split("");
      const outputItems = [
        "Principles to honor — article ids + one concrete design choice per principle",
        "Patterns to apply — responsibilities, key collaborators, trade-offs",
        "Antipatterns to avoid — symptom → why it would arise here → countermeasure",
        language
          ? `Language-specific notes — idioms or constraints relevant to ${language}`
          : null,
        "Test plan — list of test cases grouped by behavior",
        "Failing tests — actual test code, runnable, asserts written to fail until production is implemented (true red phase)",
      ].filter((s): s is string => s !== null);
      lines.push(
        "",
        "OUTPUT — Deliver IN THIS ORDER (briefing first, code last):",
        ...outputItems.map((item, i) => `${letters[i]}) ${item}`),
      );
      const rules: Array<string | null> = [
        "Briefing first, tests last. No production code at this stage.",
        "Tests must fail until production code exists (true red phase).",
        'After delivering the failing tests, STOP and ask the user: "Should I implement the production code to make these tests pass, or will you implement it?" Do NOT write production code without this confirmation.',
        language
          ? null
          : "Language was not provided. Ask the user for the target language/stack BEFORE writing tests.",
      ];
      lines.push(
        "",
        "ABSOLUTE RULES:",
        ...rules.filter((r): r is string => r !== null).map((r) => `- ${r}`),
      );
      return lines.join("\n");
    },
  },
  {
    name: "refactor-briefing",
    description:
      "Plan a behavior-preserving refactor: identify current antipatterns, choose target principles + patterns, and emit a small-step refactoring plan. Test safety net is non-negotiable.",
    arguments: [
      {
        name: "code_or_description",
        description:
          "The existing code, snippet, or description of the design to refactor.",
        required: true,
      },
      {
        name: "goal",
        description:
          "What the refactor should achieve (e.g., 'improve testability', 'decouple persistence', 'split god object'). If omitted, the agent infers it from the smells.",
        required: false,
      },
      {
        name: "language",
        description:
          "Target language/stack (e.g., 'go', 'swift'). If a dev-atlas section exists for it, its articles will be cited.",
        required: false,
      },
    ],
    render: ({ code_or_description, goal, language }) => {
      const phases: Array<{ title: string; steps: string[] } | null> = [
        {
          title: "PHASE 1 — Smell inventory (current state)",
          steps: [
            'Extract 3–5 candidate topic keywords from the input (e.g., "god object", "feature envy", "primitive obsession", "long method", "shotgun surgery", "magic numbers", "duplicate code").',
            "Call `find_antipatterns` for each keyword and aggregate the findings.",
            'For each top hit, call `get_article` and read "What is it?" and "When NOT to use" — these become the evidence in the briefing.',
          ],
        },
        {
          title: "PHASE 2 — Principles to honor (target state)",
          steps: [
            'Call `search_articles` with { tags: ["principle"] } to list SOLID + Pragmatic Principles.',
            "Identify which principles are being violated by the smells from PHASE 1.",
            'For each selected principle, call `get_article` and read "What is it?" and "When to use".',
          ],
        },
        {
          title: "PHASE 3 — Patterns to introduce (target shape)",
          steps: [
            'Call `search_articles` with { tags: ["design-pattern"] }.',
            "Select 0–3 patterns. Choose 0 when the smell dissolves with simple cleanup (extract method, rename, inline). Choose 1–3 only when a structural change is justified (e.g., Strategy to remove conditional sprawl, Adapter to isolate legacy code, Repository to centralize data access).",
            'For each chosen pattern, call `get_article` and read "When to use" and "When NOT to use".',
          ],
        },
        {
          title: "PHASE 4 — Safety net (TDD primer)",
          steps: [
            'Call `search_articles` with { query: "tdd" } and `get_article` on the TDD article. Refactoring is the "refactor" leg of red-green-refactor — tests must already be green before any structural move.',
          ],
        },
        language
          ? {
              title: "PHASE 5 — Language reference",
              steps: [
                `Call \`list_sections\` to confirm whether \`languages/${language}/\` exists.`,
                `If it does, call \`search_articles\` with { language: "${language}" } and read articles relevant to the refactor (idioms, error-handling, refactor-friendly constructs).`,
              ],
            }
          : null,
      ];
      const activePhases = phases.filter(
        (p): p is { title: string; steps: string[] } => p !== null,
      );
      const lines: string[] = [
        `You are about to refactor this code/design:`,
        ``,
        `${code_or_description}`,
      ];
      if (goal) {
        lines.push(``, `Goal: ${goal}.`);
      }
      if (language) {
        lines.push(``, `Target language/stack: ${language}.`);
      }
      lines.push(
        "",
        "Ground the refactor in dev-atlas before proposing any change. Deliver the briefing first, the plan last.",
      );
      let counter = 0;
      for (const phase of activePhases) {
        lines.push("", `**${phase.title}**`);
        for (const step of phase.steps) {
          counter += 1;
          lines.push(`${counter}. ${step}`);
        }
      }
      const letters = "ABCDEFGH".split("");
      const outputItems = [
        "Smell inventory — current antipatterns and violated principles, each cited by dev-atlas article id with concrete evidence from the input",
        "Target principles — which principles to honor and the one concrete design choice that restores each",
        "Target patterns — for each chosen pattern: responsibility in the refactored code, key collaborator, trade-off accepted (if zero patterns are chosen, say so explicitly and justify)",
        language
          ? `Language-specific notes — idioms or constraints relevant to ${language}`
          : null,
        "Refactoring plan — ordered, small, reversible steps; each step states precondition (which tests must be green), the transformation, and the verification (which tests must still be green after)",
        "Risks & rollback — what could regress silently, how to detect it, how to revert if a step fails",
      ].filter((s): s is string => s !== null);
      lines.push(
        "",
        "OUTPUT — Deliver IN THIS ORDER (briefing first, plan last):",
        ...outputItems.map((item, i) => `${letters[i]}) ${item}`),
      );
      const rules: Array<string | null> = [
        "Behavior preservation is non-negotiable. The refactor must not change observable behavior — public API, side effects, or error semantics.",
        'No structural change without a green test covering the target area. If such tests do not exist, the FIRST step of the plan MUST be "add characterization tests" before any other transformation.',
        "Each step must be small, atomic, independently committable, and verified (tests green) before moving to the next.",
        'After delivering the plan, STOP and ask the user: "Should I execute this refactoring plan step by step, or will you?" Do NOT start editing without this confirmation.',
        language
          ? null
          : "Language was not provided. If the plan requires writing concrete code (e.g., for the characterization tests step), ask the user for the target language/stack BEFORE producing code.",
      ];
      lines.push(
        "",
        "ABSOLUTE RULES:",
        ...rules.filter((r): r is string => r !== null).map((r) => `- ${r}`),
      );
      return lines.join("\n");
    },
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
