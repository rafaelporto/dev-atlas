---
type: concept
tags:
  - concept
  - ai-engineering
related:
  - software-engineering/ai-engineering/prompt-engineering
  - software-engineering/ai-engineering/rag
  - software-engineering/ai-engineering/prompt-caching
  - software-engineering/ai-engineering/agent-memory
  - software-engineering/ai-engineering/agents
language: null
---

# Context Engineering

> Treating everything a model reads on a call — instructions, history, tool results, retrieved documents — as a limited budget, and choosing, ordering, and trimming it so the model sees the smallest set of tokens that lets it do the job well.

---

## What is it?

Context engineering is deciding what goes into the model's input on each call, and what stays out. A language model only knows what is in its context window for that request: the system prompt, the conversation so far, the results of any tools it called, and any documents you fetched for it. Context engineering curates that whole set, turn after turn.

It is the sibling of [prompt engineering](prompt-engineering.md). Prompt engineering is about *how you ask* — wording, examples, structure. Context engineering is about *what the model sees* — and in a long conversation or an agent loop, most of what the model sees was not written by you at all: it accumulated.

---

## Why does it matter?

Context windows are large — hundreds of thousands of tokens, a million on some models — so it is tempting to put everything in and let the model sort it out. Three things make that a mistake:

- **Quality drops as context grows, well before the limit.** Researchers call this *context rot*: as the number of tokens rises, the model's ability to find and use any one piece of information falls. Every token draws on a finite attention budget, so irrelevant tokens are not free — they dilute the relevant ones.
- **Position matters.** Liu et al. ("Lost in the Middle", 2023) showed that models use information at the beginning and end of a long input much better than information in the middle.
- **Every token is billed and adds latency** — on every call, not once. A 100K-token history resent on each of 50 agent turns is 5M input tokens.

Agents make this acute. An agent that reads files, runs searches, and calls APIs accumulates tool output quickly; after a few dozen steps the window is mostly stale results the model already acted on. The quality of the next step depends on what you keep.

---

## How it works

### The window as a budget

```
  context window (fixed size)
  ┌──────────┬───────┬────────────────────────────┬──────────────────────┬──────────┐
  │ system   │ tool  │ conversation history       │ tool results /       │ current  │
  │ prompt   │ defs  │ (grows every turn)         │ retrieved documents  │ question │
  └──────────┴───────┴────────────────────────────┴──────────────────────┴──────────┘
   stable ───────────▶                              volatile, largest ──────────▶
```

Everything competes for the same space and the same attention. The goal, in Anthropic's phrasing, is the smallest set of high-signal tokens that maximises the chance of the outcome you want. Each technique below either keeps low-signal tokens out or removes them once they stop paying their way.

### Ordering: long material first, question last

Because models use the start and end of the input best, put long documents and data near the top, and the specific question or instruction at the end. Anthropic reports that queries at the end can improve response quality by up to 30% on complex, multi-document inputs. Wrap each document in tags with its source (`<document><source>…</source><document_content>…</document_content></document>`) so the model can tell them apart and cite them.

```
  model's use of information by position (schematic)

  high │█                                  █
       │██                               ███
       │ ███                          ████
  low  │    ████████████████████████████
       └──────────────────────────────────────▶
        start          middle            end
```

### Compaction: summarise the history

When a conversation gets long, replace the older turns with a summary and carry on from it. A good summary keeps decisions made, open questions, constraints the user stated, and identifiers (file paths, IDs, URLs); it drops pleasantries, superseded drafts, and raw output already acted on. Compact at a threshold well below the window limit — quality degrades before the hard limit is reached.

Compaction can live in your code (an extra call that writes the summary) or on the provider side. In the Claude API, server-side compaction is a beta feature: you can let the API compact automatically when input tokens reach a threshold, or request a compaction yourself; either way, the response carries a compaction block that you send back on later turns.

### Clearing old tool results

The lightest form of compaction: once the model has used a tool result, the raw output rarely needs to stay. Replace old results with a short placeholder and keep the record that the call happened. A search that returned 8K tokens of HTML is worth a line ("searched X, found Y") ten turns later. In the Claude API this is *context editing* (beta): a `clear_tool_uses_20250919` edit clears the oldest tool results once input passes a trigger, keeping the most recent few.

### Just-in-time loading

Instead of loading everything that *might* be relevant up front, keep lightweight references — file paths, record IDs, URLs, stored queries — in the context, and give the model a tool to fetch the content when it decides it needs it. This is how a person works with a filing system: you remember where things are, not what every page says. The trade-off is extra tool calls and latency; the gain is a window that only holds what the current step uses. A hybrid is common: load a small, always-relevant core up front, fetch the rest on demand.

### Isolating context in subagents

A subagent gets its own clean window for a focused subtask — searching a codebase, reading twenty documents — and returns only a condensed result to the coordinating agent. The coordinator's context grows by a paragraph instead of by everything the subagent read. The cost is more total tokens and more moving parts; see [Agents](agents.md).

### Where context comes from

| Source | Article |
|---|---|
| Retrieved documents from a knowledge base | [RAG](rag.md) |
| Tool definitions and tool results | [Tool Use](tool-use.md), [MCP](model-context-protocol.md) |
| Facts that persist across sessions | [Agent Memory](agent-memory.md) |
| Instructions loaded only when relevant | [Agent Skills](agent-skills.md) |
| Stable prefix reused across calls — made cheap, not smaller | [Prompt Caching](prompt-caching.md) |

Caching and curation pull in slightly different directions: caching rewards a stable prefix, curation rewrites history. Put stable material (system prompt, tool definitions, reference documents) first so it caches, and do your trimming in the volatile tail.

---

## Examples

### Manual compaction of conversation history

When the last request's input grows past a threshold, ask the model for a summary of the whole session and restart the history from that single message. Replacing the whole history (rather than keeping some recent turns verbatim) means no old reasoning blocks are replayed against a prefix they were not produced for.

**Python — Claude API**

```python
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # model IDs at time of writing
COMPACT_AT = 100_000  # input tokens; well below the window, because quality drops first
SYSTEM = "You help a developer plan and review changes to a web service."
SUMMARY_PROMPT = (
    "Summarise this conversation for a colleague who will continue it. Keep decisions, "
    "open questions, stated constraints, and identifiers (paths, IDs, URLs). "
    "Drop pleasantries, superseded drafts, and output already acted on."
)

def text_of(response) -> str:
    return next((b.text for b in response.content if b.type == "text"), "")

def compact(history: list) -> list:
    response = client.messages.create(
        model=MODEL, max_tokens=8000, system=SYSTEM,  # same system prompt: cached prefix still hits
        messages=history + [{"role": "user", "content": SUMMARY_PROMPT}],
    )
    summary = text_of(response)
    return [{"role": "user", "content": f"<conversation_summary>\n{summary}\n</conversation_summary>"}]

def chat(history: list, user_text: str) -> str:
    history.append({"role": "user", "content": user_text})
    response = client.messages.create(model=MODEL, max_tokens=16000, system=SYSTEM, messages=history)
    history.append({"role": "assistant", "content": response.content})  # keep every block

    u = response.usage
    used = u.input_tokens + (u.cache_read_input_tokens or 0) + (u.cache_creation_input_tokens or 0)
    if used > COMPACT_AT:
        history[:] = compact(history)  # the next user message joins the summary's turn
    return text_of(response)
```

**TypeScript — Claude API**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-sonnet-5-5"; // model IDs at time of writing
const COMPACT_AT = 100_000; // input tokens; well below the window, because quality drops first
const SYSTEM = "You help a developer plan and review changes to a web service.";
const SUMMARY_PROMPT =
  "Summarise this conversation for a colleague who will continue it. Keep decisions, " +
  "open questions, stated constraints, and identifiers (paths, IDs, URLs). " +
  "Drop pleasantries, superseded drafts, and output already acted on.";

const textOf = (response: Anthropic.Message): string =>
  response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";

async function compact(history: Anthropic.MessageParam[]): Promise<Anthropic.MessageParam[]> {
  const response = await client.messages.create({
    model: MODEL, max_tokens: 8000, system: SYSTEM, // same system prompt: cached prefix still hits
    messages: [...history, { role: "user", content: SUMMARY_PROMPT }],
  });
  const summary = textOf(response);
  return [{ role: "user", content: `<conversation_summary>\n${summary}\n</conversation_summary>` }];
}

async function chat(history: Anthropic.MessageParam[], userText: string): Promise<string> {
  history.push({ role: "user", content: userText });
  const response = await client.messages.create({ model: MODEL, max_tokens: 16000, system: SYSTEM, messages: history });
  history.push({ role: "assistant", content: response.content }); // keep every block

  const u = response.usage;
  const used = u.input_tokens + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
  if (used > COMPACT_AT) {
    history.splice(0, history.length, ...(await compact(history))); // the next user message joins the summary's turn
  }
  return textOf(response);
}
```

`input_tokens` alone counts only the uncached part of the input; with caching on, the cached tokens are reported separately, so the threshold sums all three.

### Provider-side clearing of old tool results

In an agent loop, let the API drop stale tool output instead of rewriting history yourself. Here, once input passes 30K tokens, the oldest tool results are cleared, the three most recent are kept, and results from `read_runbook` are never cleared.

**Python — Claude API**

```python
response = client.beta.messages.create(
    betas=["context-management-2025-06-27"],
    model="claude-sonnet-5-5",
    max_tokens=16000,
    tools=tools,        # your tool definitions
    messages=messages,  # the agent loop's history
    context_management={
        "edits": [{
            "type": "clear_tool_uses_20250919",
            "trigger": {"type": "input_tokens", "value": 30_000},
            "keep": {"type": "tool_uses", "value": 3},
            "exclude_tools": ["read_runbook"],
        }]
    },
)
```

**TypeScript — Claude API**

```typescript
const response = await client.beta.messages.create({
  betas: ["context-management-2025-06-27"],
  model: "claude-sonnet-5-5",
  max_tokens: 16000,
  tools, // your tool definitions
  messages, // the agent loop's history
  context_management: {
    edits: [
      {
        type: "clear_tool_uses_20250919",
        trigger: { type: "input_tokens", value: 30_000 },
        keep: { type: "tool_uses", value: 3 },
        exclude_tools: ["read_runbook"],
      },
    ],
  },
});
```

Server-side compaction follows the same shape with a different beta and edit type (`compact-2026-01-12` / `compact_20260112` for compaction at a token threshold); its response contains a compaction block, so append the full `response.content` to the history rather than just the text.

---

## When to use

- **Long conversations.** Chat sessions or support threads that run for dozens of turns need compaction before quality drops.
- **Agents with heavy tool use.** Searches, file reads, and API calls fill the window fast; clear old results and load content just in time.
- **Large reference material.** When the relevant slice of a corpus is small, retrieve it ([RAG](rag.md)) instead of loading the corpus.
- **Multi-document questions.** Ordering (documents first, question last) and per-document tags are cheap and measurably help.
- **Broad research subtasks.** Isolate them in subagents so only the conclusion reaches the main context.

## When NOT to use

- **Short, single-turn tasks.** A classification or a one-shot summary that never approaches the limit gains nothing from compaction machinery.
- **The full text is the point.** Contract review or line-by-line code audit needs the exact source; a summary loses precisely what matters.
- **Aggressive trimming without an eval.** Compaction and clearing drop information by design; measure task success before and after, or you will silently remove what a later turn needed — see [Evals](evals.md).
- **Rewriting a cached prefix.** Editing early history on every turn invalidates [prompt caching](prompt-caching.md); compact rarely and in large steps, and keep stable material at the front.

---

## References

- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — Anthropic Engineering; the attention-budget framing, compaction, tool-result clearing, just-in-time context, and subagents
- [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) — Liu et al., 2023; models use the start and end of long inputs better than the middle
- [Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://www.trychroma.com/research/context-rot) — Chroma, 2025; performance degrades as input grows, even on simple tasks
- [Prompting best practices — long context](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) — documents first, query last, and XML-tagged documents
- [Compaction overview](https://platform.claude.com/docs/en/build-with-claude/compaction) and [Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing) — Anthropic's server-side compaction options and tool-result clearing
