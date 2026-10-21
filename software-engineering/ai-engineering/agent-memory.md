---
type: concept
tags:
  - concept
  - ai-engineering
related:
  - software-engineering/ai-engineering/agents
  - software-engineering/ai-engineering/context-engineering
  - software-engineering/ai-engineering/rag
  - software-engineering/ai-engineering/agent-skills
  - software-engineering/ai-engineering/prompt-injection-and-guardrails
language: null
---

# Agent Memory

> A model remembers nothing between calls; "memory" is whatever your application chooses to store and put back into the context — and deciding what to keep, and what never to keep, is the real design work.

---

## What is it?

Agent memory is how an AI application carries information from one moment to a later one: earlier in the same conversation, or across sessions days apart. The model itself is stateless — each API call starts from zero and knows only what is in that request. When an assistant "remembers" that you prefer short answers, it is because the application saved that fact somewhere and included it in a later prompt.

So memory is not a model feature but a storage-and-retrieval design with two halves:

- **Short-term memory** — the conversation so far, held in the context window.
- **Long-term memory** — facts that outlive the conversation, held in files or a database and loaded back when relevant.

---

## Why does it matter?

Without long-term memory, every session starts cold. The user repeats their preferences, the agent re-discovers the same project conventions, and a correction made yesterday is forgotten today. For an assistant used daily, that repetition is the main source of friction.

Without short-term memory management, long tasks fail in a different way: the conversation outgrows the context window, or grows so long that the model attends poorly to what matters ([context rot](context-engineering.md)).

Memory also carries risk that stateless systems do not have. Whatever is written to memory is re-read as trusted context in every future session — so a wrong, stale, or maliciously injected "fact" keeps doing damage long after the conversation that created it.

---

## How it works

### Short-term: the conversation in the window

Short-term memory is simply the message history you resend on every call. It needs managing once tasks get long: summarising older turns (compaction), clearing old tool results, and keeping only what the next step needs. Those techniques belong to [Context Engineering](context-engineering.md). One rule matters here: when you shrink history, replace it wholesale with a summary rather than editing individual earlier turns, because reasoning and tool blocks are tied to the turns they were produced in.

### Long-term: storage outside the model

```
 session start                     during the session                    later sessions
 ─────────────                     ──────────────────                    ──────────────
 load index ──▶ context            model calls save_memory(...) ──▶ store ──▶ load index
 (few lines)                       model calls read_memory(...) ◀── store      ...
```

Common backends, in rough order of complexity:

- **Files in a memory directory.** One file per memory plus a short **index file** listing them. The index is loaded at session start (cheap); the model opens individual files only when an entry looks relevant. Easy to inspect, diff, and correct by hand — the main concrete case in this article.
- **Key-value or document store.** The same idea at scale: per-user records keyed by topic, with metadata such as `updated_at` and `source`.
- **Vector search over memories.** When there are too many memories to list, embed them and retrieve the most similar ones per query. This is [RAG](rag.md) applied to memories instead of documents, with the same chunking, ranking, and failure modes.

### Memory types

The classification comes from cognitive science, adapted for language agents by the CoALA framework:

| Type | Holds | Example |
|---|---|---|
| **Episodic** | What happened — past interactions and their outcomes | "Last deploy failed because the migration ran before the schema change." |
| **Semantic** | Facts about the world, the user, and the project | "The user prefers TypeScript examples." "This repo uses pnpm." |
| **Procedural** | How to do things | "To release: bump the version, tag, then run the publish job." |

Procedural memory overlaps with [Agent Skills](agent-skills.md), and the line is worth drawing explicitly. A **skill** is authored deliberately, reviewed, versioned, and shared — a packaged procedure. A **procedural memory** is something the agent *learned* during use and wrote down for itself. When a learned procedure proves stable and useful, promote it into a skill, where a human owns it.

### Write and read policy

The questions to answer before writing any code:

- **Who decides to write?** Either the model, through a memory tool it calls when something seems worth keeping, or an application rule ("after each session, extract stated preferences"). Model-driven writes capture nuance but are less predictable; rule-driven writes are auditable but miss things.
- **When to recall?** Load a small index every session; fetch details on demand. Loading every memory into every prompt defeats the purpose and wastes tokens.
- **Update, don't append.** Before writing, check whether a memory on that topic exists and update it. An append-only log accumulates contradictions ("prefers npm", later "prefers pnpm") that the model must resolve on every read.
- **Prune.** Expire memories nobody has read in a long time, and cap their size.

### What to store, and what not to

| Store | Do not store |
|---|---|
| Stated preferences ("answer in Portuguese", "no emojis") | Anything derivable from the code, the docs, or version control |
| Decisions **and their reason** ("chose Postgres because we need row-level security") | Ephemeral task state that will be stale tomorrow |
| Corrections ("the staging URL changed; use the new one") | Secrets, tokens, credentials |
| Recurring context that is expensive to rediscover | Personal or sensitive data the user did not ask you to keep |

Storing the *why* is what makes a memory useful later: a bare decision gets applied blindly; a decision with its reason can be reconsidered when the reason no longer holds.

### Risks

- **Poisoned memory.** If the agent reads untrusted content (a web page, an email, a tool result) and writes part of it to memory, an injected instruction becomes a persistent "fact" replayed in every future session. Treat memory writes as a privileged action, validate them, and keep provenance. See [Prompt Injection and Guardrails](prompt-injection-and-guardrails.md).
- **Staleness.** A memory that was true last month is confidently wrong today. Prefer memories that point to the source of truth, and let users see and delete them.
- **Privacy.** Users may not expect to be remembered. Disclose memory, scope it per user, honour deletion requests, and check data-protection rules before persisting personal data.
- **Path traversal.** A file-backed memory tool takes paths or names from model output; confine every operation to the memory directory.

---

## Examples

A file-based memory exposed to the model as two tools. The storage layer is plain application code; the model decides when to call it.

**Python**

```python
import re
from pathlib import Path

MEMORY_DIR = Path("memories")
INDEX = MEMORY_DIR / "MEMORY.md"
NAME_RE = re.compile(r"[a-z0-9-]{1,64}")

def _path(name: str) -> Path:
    if not NAME_RE.fullmatch(name):  # names, never paths: blocks ../ traversal
        raise ValueError("Memory names are lowercase kebab-case, e.g. 'package-manager'.")
    return MEMORY_DIR / f"{name}.md"

def load_index() -> str:
    return INDEX.read_text() if INDEX.exists() else ""

def save_memory(name: str, summary: str, content: str) -> str:
    path = _path(name)
    MEMORY_DIR.mkdir(exist_ok=True)
    existed = path.exists()
    path.write_text(content)  # same name = update in place, no duplicates
    entries = [line for line in load_index().splitlines() if not line.startswith(f"- {name}:")]
    INDEX.write_text("\n".join(sorted(entries + [f"- {name}: {summary}"])) + "\n")
    return f"{'Updated' if existed else 'Created'} memory '{name}'."

def read_memory(name: str) -> str:
    path = _path(name)
    if not path.exists():
        raise ValueError(f"No memory named '{name}'. Use a name from the index.")
    return path.read_text()
```

**TypeScript**

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MEMORY_DIR = "memories";
const INDEX = join(MEMORY_DIR, "MEMORY.md");
const NAME_RE = /^[a-z0-9-]{1,64}$/;

function memoryPath(name: string): string {
  if (!NAME_RE.test(name)) { // names, never paths: blocks ../ traversal
    throw new Error("Memory names are lowercase kebab-case, e.g. 'package-manager'.");
  }
  return join(MEMORY_DIR, `${name}.md`);
}

export function loadIndex(): string {
  return existsSync(INDEX) ? readFileSync(INDEX, "utf8") : "";
}

export function saveMemory(name: string, summary: string, content: string): string {
  const path = memoryPath(name);
  mkdirSync(MEMORY_DIR, { recursive: true });
  const existed = existsSync(path);
  writeFileSync(path, content); // same name = update in place, no duplicates
  const entries = loadIndex().split("\n").filter((l) => l && !l.startsWith(`- ${name}:`));
  writeFileSync(INDEX, [...entries, `- ${name}: ${summary}`].sort().join("\n") + "\n");
  return `${existed ? "Updated" : "Created"} memory '${name}'.`;
}

export function readMemory(name: string): string {
  const path = memoryPath(name);
  if (!existsSync(path)) throw new Error(`No memory named '${name}'. Use a name from the index.`);
  return readFileSync(path, "utf8");
}
```

The tool descriptions carry the write policy. The index is loaded once at session start and kept stable for the session, so it does not break [prompt caching](prompt-caching.md). Tool results go back through the loop shown in [Agents](agents.md).

**Python — Claude API**

```python
import anthropic

client = anthropic.Anthropic()

memory_tools = [
    {"name": "save_memory",
     "description": ("Save or update a long-term memory. Call when the user states a preference, "
                     "makes a decision (record the reason), or corrects you. Reuse a name from the "
                     "index to update it instead of creating a duplicate. Never store secrets or personal data."),
     "input_schema": {"type": "object", "required": ["name", "summary", "content"], "properties": {
         "name": {"type": "string", "description": "kebab-case key, e.g. package-manager"},
         "summary": {"type": "string", "description": "one line for the index"},
         "content": {"type": "string", "description": "the fact and why it holds"}}}},
    {"name": "read_memory",
     "description": "Read the full text of a memory from the index. Call when an index entry looks relevant.",
     "input_schema": {"type": "object", "required": ["name"], "properties": {"name": {"type": "string"}}}},
]

def run_memory_tool(block) -> dict:
    try:
        handlers = {"save_memory": save_memory, "read_memory": read_memory}
        return {"type": "tool_result", "tool_use_id": block.id, "content": handlers[block.name](**block.input)}
    except (KeyError, ValueError, TypeError) as exc:
        return {"type": "tool_result", "tool_use_id": block.id, "content": f"Error: {exc}", "is_error": True}

response = client.messages.create(
    model="claude-sonnet-5-5",  # model IDs at time of writing
    max_tokens=1024,
    tools=memory_tools,
    system=f"You are a coding assistant.\n\n<memory_index>\n{load_index()}\n</memory_index>",
    messages=[{"role": "user", "content": "From now on use pnpm, not npm, in this repo."}],
)
results = [run_memory_tool(b) for b in response.content if b.type == "tool_use"]
```

**TypeScript — Claude API**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const memoryTools: Anthropic.Tool[] = [
  { name: "save_memory",
    description: "Save or update a long-term memory. Call when the user states a preference, " +
      "makes a decision (record the reason), or corrects you. Reuse a name from the " +
      "index to update it instead of creating a duplicate. Never store secrets or personal data.",
    input_schema: { type: "object", required: ["name", "summary", "content"], properties: {
      name: { type: "string", description: "kebab-case key, e.g. package-manager" },
      summary: { type: "string", description: "one line for the index" },
      content: { type: "string", description: "the fact and why it holds" } } } },
  { name: "read_memory",
    description: "Read the full text of a memory from the index. Call when an index entry looks relevant.",
    input_schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } },
];

function runMemoryTool(block: Anthropic.ToolUseBlock): Anthropic.ToolResultBlockParam {
  const input = block.input as Record<string, string>;
  try {
    if (block.name === "save_memory") {
      return { type: "tool_result", tool_use_id: block.id, content: saveMemory(input.name, input.summary, input.content) };
    }
    if (block.name === "read_memory") {
      return { type: "tool_result", tool_use_id: block.id, content: readMemory(input.name) };
    }
    throw new Error(`Unknown tool '${block.name}'.`);
  } catch (err) {
    return { type: "tool_result", tool_use_id: block.id, content: `Error: ${(err as Error).message}`, is_error: true };
  }
}

const response = await client.messages.create({
  model: "claude-sonnet-5-5", // model IDs at time of writing
  max_tokens: 1024,
  tools: memoryTools,
  system: `You are a coding assistant.\n\n<memory_index>\n${loadIndex()}\n</memory_index>`,
  messages: [{ role: "user", content: "From now on use pnpm, not npm, in this repo." }],
});
const results = response.content
  .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
  .map(runMemoryTool);
```

### A provider-defined memory tool

In the Claude API, the **memory tool** (`{"type": "memory_20250818", "name": "memory"}`) standardises the same idea. It is a client-side tool: Claude issues file commands — `view`, `create`, `str_replace`, `insert`, `delete`, `rename` — against a `/memories` directory, and your application executes them on storage you control. When the tool is present, the API adds an instruction telling Claude to check its memory directory before starting a task. The SDKs ship a local-filesystem backend and run the loop for you:

**Python — Claude API**

```python
import anthropic
from anthropic.tools import BetaLocalFilesystemMemoryTool

client = anthropic.Anthropic()
memory = BetaLocalFilesystemMemoryTool(base_path="./memory")  # or subclass BetaAbstractMemoryTool

runner = client.beta.messages.tool_runner(
    model="claude-sonnet-5-5", max_tokens=1024, tools=[memory],
    messages=[{"role": "user", "content": "Remember that this repo uses pnpm, not npm."}],
)
print(runner.until_done().content)
```

**TypeScript — Claude API**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { betaMemoryTool } from "@anthropic-ai/sdk/helpers/beta/memory";
import { BetaLocalFilesystemMemoryTool } from "@anthropic-ai/sdk/tools/memory/node";

const client = new Anthropic();
const backend = await BetaLocalFilesystemMemoryTool.init("./memory");
const memory = betaMemoryTool(backend); // or pass your own handlers object

const finalMessage = await client.beta.messages.toolRunner({
  model: "claude-sonnet-5-5", max_tokens: 1024, tools: [memory], max_iterations: 10,
  messages: [{ role: "user", content: "Remember that this repo uses pnpm, not npm." }],
});
console.log(finalMessage.content);
```

A custom backend (database, per-user directories, encryption) must still validate every path so that nothing escapes `/memories`.

---

## When to use

- **Users return and expect continuity.** Personal assistants, coding agents on a long-lived project, support agents handling repeat customers.
- **Rediscovery is expensive.** Conventions, environment quirks, or decisions that take many tool calls to work out again.
- **Corrections must stick.** If a user fixes the agent's behaviour, the fix should survive the session.
- **Long-running tasks span sessions.** A progress file that the next session reads to resume where the last one stopped.

## When NOT to use

- **Stateless tasks.** Classification, extraction, one-shot summarisation — memory adds cost and a new failure mode for no gain.
- **Users who do not expect to be remembered.** Anonymous or sensitive contexts where persistence surprises users or breaks policy.
- **The information has a source of truth.** Read the code, the docs, or the database instead of keeping a copy that will drift.
- **Untrusted input flows straight into memory.** Without validation and provenance, memory becomes a persistence mechanism for prompt injection.
- **As a substitute for an instruction file or a skill.** Rules every task must follow belong in a reviewed instruction file; packaged procedures belong in a skill.

---

## References

- [Memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool) — Claude API documentation: the file commands, handler implementation, path-traversal protection, and the multi-session progress-file pattern
- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — Anthropic, on structured note-taking (agentic memory) versus compaction
- [Cognitive Architectures for Language Agents (CoALA)](https://arxiv.org/abs/2309.02427) — Sumers, Yao, Narasimhan, Griffiths; the working, episodic, semantic, and procedural memory taxonomy for language agents
