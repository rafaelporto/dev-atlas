---
type: concept
tags:
  - concept
  - ai-engineering
related:
  - software-engineering/ai-engineering/agent-memory
  - software-engineering/ai-engineering/tool-use
  - software-engineering/ai-engineering/context-engineering
  - software-engineering/ai-engineering/evals
  - software-engineering/ai-assisted-development/agent-instruction-files
language: null
---

# Agent Skills

> A folder of instructions — and sometimes scripts — that an agent loads only when the task calls for it, so it can carry a large library of specialised know-how without paying for it in every prompt.

---

## What is it?

A skill is a packaged "how to do this kind of task" that an AI agent can pick up when it needs it. Each skill is a directory with a `SKILL.md` file: a short header saying what the skill is for and when to use it, followed by instructions. A skill can also bundle reference documents, templates, and scripts.

The agent does not read every skill up front. It sees only the one-line descriptions, and opens a skill's full instructions when the current task matches. That is the whole idea: **lots of specialised knowledge available, very little of it in the context at any moment.**

The concrete case is Anthropic's **Agent Skills**, which it describes as "organized folders of instructions, scripts, and resources that agents can discover and load dynamically to perform better at specific tasks." The format was later published as an open standard, so the same skill directory works across compatible agents and products.

---

## Why does it matter?

Agents need specialised knowledge to do real work: how your team writes release notes, how to fill a particular form, which steps a database migration must follow. There are two naive ways to supply it, and both fail at scale:

- **Put it all in the system prompt.** Every task pays for every procedure, and the model attends worse as the prompt grows ([context rot](context-engineering.md)).
- **Paste it in when needed.** Works for one person, does not scale to a team, and relies on someone remembering.

Skills resolve the trade-off with **progressive disclosure**: a few dozen tokens per skill are always present, and the rest loads on demand. A single agent can have many skills installed for the cost of their descriptions.

They also turn tacit, repeated instructions into a versioned artefact — reviewable, testable, and shareable like code.

---

## How it works

### Progressive disclosure: three levels

```
 Level 1 — always in context                 Level 2 — when the task matches     Level 3 — only when needed
 ───────────────────────────                 ───────────────────────────────     ──────────────────────────
 name + description of EVERY skill           SKILL.md body of ONE skill          template.md, reference.md,
 (~100 tokens per skill)          ─match─▶   (instructions, steps, rules)  ─▶    scripts/*.py
                                                                                 read, or run without reading
```

1. **Metadata.** At startup the agent loads each skill's `name` and `description` into its system prompt. This is how it knows the skill exists.
2. **Instructions.** When a request matches a description, the agent reads that skill's `SKILL.md` body into context.
3. **Resources and code.** Files referenced from `SKILL.md` are read only if the task needs them. Scripts are *executed*, and only their output enters the context — the code itself costs no tokens.

Level 3 requires the agent to have a filesystem and a way to run code; without it, a skill is limited to its instructions.

### Anatomy

```
changelog-writer/
├── SKILL.md             # required: front matter + instructions
├── template.md          # optional: loaded when the skill says so
└── scripts/
    └── group_commits.py # optional: run, not read
```

`SKILL.md` starts with YAML front matter. In Anthropic's implementation, two fields are required: `name` (lowercase letters, numbers, and hyphens, up to 64 characters) and `description` (up to 1,024 characters). The body is free-form Markdown; keep it short (Anthropic recommends under 500 lines) and push detail into referenced files one level deep.

### The description is the trigger

The description is the only part of the skill the agent sees when deciding whether to use it. It must say **when** to use the skill, not only what it does — the most common reason a skill never fires.

| Weak | Strong |
|---|---|
| "Helps with changelogs." | "Writes a user-facing CHANGELOG entry from commit subjects. Use when the user asks for release notes, a changelog entry, or what changed since the last release." |

Write it in the third person, include the words users actually type, and name the file types or situations that should trigger it.

### Skills versus instruction files, memory, and tools

| | Instruction files | Skills | Memory | Tools |
|---|---|---|---|---|
| **What** | Standing project rules | Packaged procedures for one kind of task | Facts learned during use | Executable capabilities |
| **Loaded** | Always, every task | On demand, when the description matches | Index always; details on demand | Definitions always; executed on request |
| **Written by** | Humans, reviewed | Humans, reviewed | The agent (or app rules) | Developers |
| **Example** | "Run `make test` before committing" | "How to write our release notes" | "This user prefers pnpm" | `lookup_order(order_id)` |
| **Article** | [Agent Instruction Files](../ai-assisted-development/agent-instruction-files.md) | this article | [Agent Memory](agent-memory.md) | [Tool Use](tool-use.md) |

A skill often *uses* tools (it tells the agent to run a script or call an API), and a stable procedure that the agent learned into memory is a good candidate to promote into a skill.

### Good practices

- **Narrow scope.** One task type per skill. A "devops" skill that covers deploys, incidents, and dashboards triggers on everything and helps with nothing.
- **Concrete instructions.** Steps, rules, and an example of the expected output. Do not explain what the model already knows.
- **Scripts for the deterministic parts.** Parsing, validation, formatting: a script is more reliable than generated code, and its source never enters the context.
- **Test that it triggers.** Run representative requests — including ones that should *not* match — and check that the skill is loaded when, and only when, it should be. Then check the output quality. Treat both as [evals](evals.md).
- **Test on every model you use.** A skill written for a capable model may need more detail for a smaller one.

### Risks

A skill is instructions plus code that the agent will follow and run. A third-party skill is therefore **untrusted code and untrusted instructions** at the same time: it can direct the agent to read files, call tools, or send data somewhere, and a skill that fetches content from external URLs can import a prompt injection at run time. Install skills only from sources you trust, read every bundled file before use, and pin versions. See [Prompt Injection and Guardrails](prompt-injection-and-guardrails.md).

---

## Examples

### A minimal skill

```markdown
---
name: changelog-writer
description: Writes a user-facing CHANGELOG entry from a list of commit subjects. Use when the user asks for release notes, a changelog entry, or what changed since the last release, or before tagging a release.
---

# Changelog writer

### Steps
1. Collect the commit subjects since the last release, one per line, into `commits.txt`.
2. Run `python scripts/group_commits.py < commits.txt` to group them by type.
3. Rewrite each line for users: describe the effect, not the implementation.
4. Format the entry using the template in `template.md`.

### Rules
- Breaking changes come first, each with a one-line migration hint.
- Present tense, one line per change, no commit hashes.
- Leave out `chore`, `ci`, and `test` changes (the script already drops them).
```

### The helper script

The script does the deterministic part — parsing Conventional Commit subjects — so the model only does the writing. The same helper in both languages; ship whichever the agent's runtime has.

**Python**

```python
import re
import sys

PATTERN = re.compile(r"^(?P<type>\w+)(?:\([^)]*\))?(?P<bang>!)?:\s*(?P<subject>.+)$")
SECTIONS = {"feat": "Features", "fix": "Fixes"}
SKIP = {"chore", "ci", "test"}

def group(lines: list[str]) -> dict[str, list[str]]:
    groups: dict[str, list[str]] = {"Breaking": [], "Features": [], "Fixes": [], "Other": []}
    for raw in lines:
        line = raw.strip()
        match = PATTERN.match(line)
        if not line or (match and match["type"] in SKIP):
            continue
        if match is None:
            groups["Other"].append(line)
        elif match["bang"]:
            groups["Breaking"].append(match["subject"])
        else:
            groups[SECTIONS.get(match["type"], "Other")].append(match["subject"])
    return groups

if __name__ == "__main__":
    for title, items in group(sys.stdin.read().splitlines()).items():
        if items:
            print(f"### {title}\n" + "\n".join(f"- {item}" for item in items) + "\n")
```

**TypeScript**

```typescript
import { readFileSync } from "node:fs";

const PATTERN = /^(?<type>\w+)(?:\([^)]*\))?(?<bang>!)?:\s*(?<subject>.+)$/;
const SECTIONS: Record<string, string> = { feat: "Features", fix: "Fixes" };
const SKIP = new Set(["chore", "ci", "test"]);

export function group(lines: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = { Breaking: [], Features: [], Fixes: [], Other: [] };
  for (const raw of lines) {
    const line = raw.trim();
    const match = PATTERN.exec(line)?.groups;
    if (!line || (match && SKIP.has(match.type))) continue;
    if (!match) groups.Other.push(line);
    else if (match.bang) groups.Breaking.push(match.subject);
    else groups[SECTIONS[match.type] ?? "Other"].push(match.subject);
  }
  return groups;
}

for (const [title, items] of Object.entries(group(readFileSync(0, "utf8").split("\n")))) {
  if (items.length) console.log(`### ${title}\n${items.map((item) => `- ${item}`).join("\n")}\n`);
}
```

### Using a skill through a model API

Agents with a local filesystem (Claude Code, for example) discover skills from a skills directory on disk. In the Claude API, skills run inside the provider's code-execution container: you upload a custom skill once through the Skills API, then reference it per request in `container.skills` alongside the code execution tool. The container has no network access, so a skill's scripts can rely only on pre-installed packages. The skill ID below is read from the environment.

**Python — Claude API**

```python
import os
import anthropic

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-5-5",  # model IDs at time of writing
    max_tokens=4096,
    container={"skills": [{"type": "custom", "skill_id": os.environ["CHANGELOG_SKILL_ID"], "version": "latest"}]},
    tools=[{"type": "code_execution_20250825", "name": "code_execution"}],  # skills run in this container
    messages=[{"role": "user", "content": (
        "Write the changelog entry for these commits:\n"
        "feat(api): add cursor pagination\nfix: crash on empty export\nfeat!: drop the v1 endpoints"
    )}],
)

for block in response.content:
    if block.type == "text":
        print(block.text)
```

**TypeScript — Claude API**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-sonnet-5-5", // model IDs at time of writing
  max_tokens: 4096,
  container: { skills: [{ type: "custom", skill_id: process.env.CHANGELOG_SKILL_ID!, version: "latest" }] },
  tools: [{ type: "code_execution_20250825", name: "code_execution" }], // skills run in this container
  messages: [{ role: "user", content:
    "Write the changelog entry for these commits:\n" +
    "feat(api): add cursor pagination\nfix: crash on empty export\nfeat!: drop the v1 endpoints" }],
});

for (const block of response.content) {
  if (block.type === "text") console.log(block.text);
}
```

Anthropic's pre-built document skills (`pptx`, `xlsx`, `docx`, `pdf`) use the same shape with `"type": "anthropic"` and the skill name as `skill_id`.

---

## When to use

- **A procedure recurs but not on every task.** Release notes, a report format, a migration checklist — needed weekly, irrelevant the rest of the time.
- **The agent needs many specialisms.** Dozens of task types would bloat a system prompt; as skills they cost only their descriptions.
- **Part of the procedure is deterministic.** Bundling a validated script beats asking the model to regenerate the logic each time.
- **The know-how should be shared and versioned.** A team's conventions captured once, reviewed like code, used by everyone's agent.

## When NOT to use

- **The rule applies to every task.** "Never commit secrets" or the project's test command belong in an [instruction file](../ai-assisted-development/agent-instruction-files.md), which is always loaded.
- **The knowledge fits in one line.** A sentence in the instruction file is cheaper than a skill the agent must decide to open.
- **It is a fact, not a procedure.** User preferences and learned facts are [memory](agent-memory.md).
- **It needs to execute in your systems.** Calling your API with typed arguments, gated and audited, is a [tool](tool-use.md); a skill can tell the agent to use it, not replace it.
- **You cannot vet the source.** An unaudited third-party skill is code and instructions your agent will follow.

---

## References

- [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) — Anthropic engineering post introducing skills and progressive disclosure
- [Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) — Claude documentation: the three loading levels, `SKILL.md` structure and field limits, API usage, and security considerations
- [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — writing descriptions that trigger, conciseness, scripts, and evaluation-driven development
- [Agent Skills open format](https://agentskills.io) — the open specification for portable skills across agent products
