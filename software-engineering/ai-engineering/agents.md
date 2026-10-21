---
type: concept
tags:
  - concept
  - ai-engineering
related:
  - software-engineering/ai-engineering/tool-use
  - software-engineering/ai-engineering/agent-memory
  - software-engineering/ai-engineering/context-engineering
  - software-engineering/ai-engineering/evals
  - software-engineering/ai-engineering/cost-and-latency-optimization
language: null
---

# Agents

> A system where the model, not your code, decides the next step — powerful for open-ended tasks, expensive and hard to predict everywhere else, so start with a fixed workflow and climb only when it fails.

---

## What is it?

An agent is a program in which a language model repeatedly chooses what to do next — which tool to call, what to look at, when it is finished — until the task is done. Your code provides the tools and the guard rails; the model provides the plan, one step at a time.

The useful distinction, from Anthropic's *Building effective agents*, is between two kinds of LLM system:

- **Workflow** — "systems where LLMs and tools are orchestrated through predefined code paths." *Your code* picks the path: call the model to classify, then call it to draft, then validate.
- **Agent** — "systems where LLMs dynamically direct their own processes and tool usage, maintaining control over how they accomplish tasks." *The model* picks the path.

Both are built from the same block: an LLM augmented with [tools](tool-use.md), retrieval, and [memory](agent-memory.md). The difference is who holds the control flow.

---

## Why does it matter?

Some tasks cannot be written as a fixed sequence because the number and kind of steps depend on what is found along the way: investigating a bug, researching a question across sources, resolving a support ticket that might need two lookups or ten. A workflow either hard-codes too few steps or branches into an unmaintainable tree. An agent adapts.

That flexibility is paid for in three currencies:

- **Tokens.** Every loop iteration resends the growing conversation. Anthropic measured agents using about 4× the tokens of a chat interaction, and multi-agent systems about 15×.
- **Predictability.** The same input can take a different path each run, which makes testing a statistical exercise — see [Evals](evals.md).
- **Compounding errors.** A wrong early step is built upon by every later one, and nothing in the loop necessarily notices.

So the engineering question is rarely "how do I build an agent?" and usually "is the cheapest system that works a single call, a workflow, or an agent?"

---

## How it works

### The agent loop

```
            ┌────────────────────────────────────────────────┐
            ▼                                                │
   ┌──────────────────┐   ┌──────────────────┐   ┌──────────┴─────────┐
   │ OBSERVE          │──▶│ DECIDE           │──▶│ ACT                │
   │ task + history + │   │ model call:      │   │ app runs the tool, │
   │ last tool result │   │ answer or tool?  │   │ appends the result │
   └──────────────────┘   └────────┬─────────┘   └────────────────────┘
                                   │ no tool requested / cap reached
                                   ▼
                                 STOP
```

Every iteration is one API call. The loop ends on a **stop criterion**, and a production agent needs all of these:

- **Done.** The model answers instead of requesting a tool (in the Claude API, `stop_reason` is something other than `tool_use`).
- **Turn cap.** A maximum number of iterations. An agent that has not finished in *N* steps is usually stuck, not almost done.
- **Budget cap.** A ceiling on tokens or cost per task, checked from the `usage` of each response.
- **Human checkpoint.** A pause for confirmation before irreversible actions, or when the agent reports it is blocked.

### The five workflow patterns

Before reaching for an agent, check whether one of these fixed patterns fits. They are cheaper, faster, and testable step by step.

**1. Prompt chaining** — split the task into a fixed sequence; each call works on the previous output, with optional code checks ("gates") in between.

```
 input ─▶ [LLM: outline] ─▶ gate ─▶ [LLM: draft] ─▶ [LLM: translate] ─▶ output
```

*Use case:* write a document from an outline, check the outline against requirements, then draft.

**2. Routing** — classify the input and send it to a specialised prompt, tool set, or model.

```
                           ┌─▶ [refund handler]
 input ─▶ [LLM: classify] ─┼─▶ [technical handler]
                           └─▶ [general FAQ — smaller, cheaper model]
```

*Use case:* customer-service triage; send easy questions to a cheap model and hard ones to a capable one.

**3. Parallelization** — run calls at the same time and combine them in code. *Sectioning* splits a task into independent parts; *voting* runs the same task several times and aggregates.

```
 sectioning:   input ─┬─▶ [LLM: part A] ─┬─▶ merge
                      └─▶ [LLM: part B] ─┘

 voting:       input ─┬─▶ [LLM: run 1] ─┐
                      ├─▶ [LLM: run 2] ─┼─▶ majority vote
                      └─▶ [LLM: run 3] ─┘
```

*Use case:* one call answers while another screens for policy violations (sectioning); several independent reviews of a risky code change (voting).

**4. Orchestrator–workers** — a central model breaks the task into subtasks that cannot be known in advance, delegates them to workers, and synthesises the results.

```
                         ┌─▶ [worker: file 1] ─┐
 task ─▶ [orchestrator] ─┼─▶ [worker: file 2] ─┼─▶ [orchestrator: synthesise] ─▶ result
                         └─▶ [worker: file N] ─┘
```

*Use case:* a code change touching an unknown number of files; research across an unknown number of sources.

**5. Evaluator–optimizer** — one call produces, another critiques against criteria, and the loop repeats until the critique passes or a cap is hit.

```
 input ─▶ [LLM: generate] ─▶ [LLM: evaluate] ── pass ──▶ output
                ▲                   │
                └──── feedback ─────┘ fail
```

*Use case:* literary translation, or search tasks where the evaluator decides whether more searching is needed.

Orchestrator–workers and evaluator–optimizer already hand some control to the model; a full agent is the limit case where the model decides everything.

### Multi-agent systems and subagents

A **subagent** is an agent started by another agent to handle a sub-task in its own fresh context, returning only a condensed result. Anthropic's research system — a lead agent spawning parallel search subagents — outperformed a single agent by 90.2% on their internal research eval.

| Gains | Costs |
|---|---|
| **Isolated context** — each subagent explores without polluting the lead's window | **Tokens** — about 15× a chat interaction in Anthropic's measurement |
| **Parallelism** — independent searches run at the same time | **Coordination** — agents duplicate work or contradict each other |
| **Specialisation** — different prompts, tools, or models per role | **Lossy hand-offs** — whatever the subagent omits from its summary is gone |

The same write-up names where it fits poorly: domains where all agents need the same context, and tasks with many interdependencies — which includes most coding work, where fewer sub-tasks are truly parallel. Use subagents for broad, parallelisable, high-value tasks; not by default.

### Reliability

- **Caps everywhere.** Turn cap, token or cost cap, and a timeout per tool call.
- **Human checkpoints before irreversible actions.** Deleting, paying, sending, deploying — gate them in the tool, not in the prompt.
- **Log every step.** The model's request, the tool input, the tool output, the `usage`. When an agent misbehaves, the trace is the only way to find which step went wrong. Feed those traces into [evals](evals.md).
- **Keep the context lean.** Long loops accumulate tool results; compaction and clearing old results are covered in [Context Engineering](context-engineering.md).
- **Design the tools well.** Most agent failures are tool failures — vague descriptions, overlapping tools, unhelpful errors. See [Tool Use](tool-use.md).

---

## Examples

A minimal hand-written loop with two fictional tools, a turn cap, and an exit on `stop_reason`. Tool errors are returned to the model as `is_error` results so it can correct itself.

**Python — Claude API**

```python
import json
import anthropic

client = anthropic.Anthropic()
MAX_TURNS = 8  # an agent that has not finished in 8 calls is stuck, not almost done

TICKETS = {"T-42": {"title": "Export to CSV times out", "plan": "free", "rows": 250_000}}
KB = {"export": "Free-plan exports are capped at 100,000 rows; filter the export or upgrade."}

def get_ticket(ticket_id: str) -> str:
    if ticket_id not in TICKETS:
        raise ValueError(f"No ticket {ticket_id!r}. IDs look like T-123.")
    return json.dumps(TICKETS[ticket_id])

def search_kb(query: str) -> str:
    hits = [text for key, text in KB.items() if key in query.lower()]
    if not hits:
        raise ValueError("No articles matched. Retry with one keyword, e.g. 'export'.")
    return "\n".join(hits)

TOOL_FUNCS = {"get_ticket": get_ticket, "search_kb": search_kb}
tools = [
    {"name": "get_ticket", "description": "Fetch a support ticket by ID. Call first when the user mentions a ticket.",
     "input_schema": {"type": "object", "properties": {"ticket_id": {"type": "string"}}, "required": ["ticket_id"]}},
    {"name": "search_kb", "description": "Search the help-centre knowledge base. Call to find the documented cause or fix.",
     "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
]

messages = [{"role": "user", "content": "Triage ticket T-42 and draft a short reply."}]
final = None

for turn in range(MAX_TURNS):
    response = client.messages.create(
        model="claude-sonnet-5-5",  # model IDs at time of writing
        max_tokens=2048, tools=tools, messages=messages,
    )
    print(f"turn={turn} stop={response.stop_reason} out_tokens={response.usage.output_tokens}")  # step log
    if response.stop_reason != "tool_use":
        final = response
        break
    messages.append({"role": "assistant", "content": response.content})
    results = []
    for block in response.content:
        if block.type != "tool_use":
            continue
        func = TOOL_FUNCS.get(block.name)
        try:
            if func is None:
                raise ValueError(f"Unknown tool {block.name!r}.")
            output, failed = func(**block.input), False
        except (ValueError, TypeError) as exc:
            output, failed = f"Error: {exc}", True
        results.append({"type": "tool_result", "tool_use_id": block.id, "content": output, "is_error": failed})
    messages.append({"role": "user", "content": results})

if final is None:
    raise RuntimeError(f"Agent did not finish within {MAX_TURNS} turns")
print(next(b.text for b in final.content if b.type == "text"))
```

**TypeScript — Claude API**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MAX_TURNS = 8; // an agent that has not finished in 8 calls is stuck, not almost done

const TICKETS: Record<string, object> = { "T-42": { title: "Export to CSV times out", plan: "free", rows: 250_000 } };
const KB: Record<string, string> = { export: "Free-plan exports are capped at 100,000 rows; filter the export or upgrade." };

const TOOL_FUNCS: Record<string, (input: Record<string, string>) => string> = {
  get_ticket: ({ ticket_id }) => {
    if (!(ticket_id in TICKETS)) throw new Error(`No ticket '${ticket_id}'. IDs look like T-123.`);
    return JSON.stringify(TICKETS[ticket_id]);
  },
  search_kb: ({ query }) => {
    const hits = Object.entries(KB).filter(([key]) => query.toLowerCase().includes(key)).map(([, text]) => text);
    if (hits.length === 0) throw new Error("No articles matched. Retry with one keyword, e.g. 'export'.");
    return hits.join("\n");
  },
};

const tools: Anthropic.Tool[] = [
  { name: "get_ticket", description: "Fetch a support ticket by ID. Call first when the user mentions a ticket.",
    input_schema: { type: "object", properties: { ticket_id: { type: "string" } }, required: ["ticket_id"] } },
  { name: "search_kb", description: "Search the help-centre knowledge base. Call to find the documented cause or fix.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
];

const messages: Anthropic.MessageParam[] = [{ role: "user", content: "Triage ticket T-42 and draft a short reply." }];
let final: Anthropic.Message | undefined;

for (let turn = 0; turn < MAX_TURNS; turn++) {
  const response = await client.messages.create({
    model: "claude-sonnet-5-5", // model IDs at time of writing
    max_tokens: 2048, tools, messages,
  });
  console.log(`turn=${turn} stop=${response.stop_reason} out_tokens=${response.usage.output_tokens}`); // step log
  if (response.stop_reason !== "tool_use") {
    final = response;
    break;
  }
  messages.push({ role: "assistant", content: response.content });
  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const block of response.content) {
    if (block.type !== "tool_use") continue;
    let output: string;
    let failed = false;
    try {
      const fn = TOOL_FUNCS[block.name];
      if (!fn) throw new Error(`Unknown tool '${block.name}'.`);
      output = fn(block.input as Record<string, string>);
    } catch (err) {
      output = `Error: ${(err as Error).message}`;
      failed = true;
    }
    results.push({ type: "tool_result", tool_use_id: block.id, content: output, is_error: failed });
  }
  messages.push({ role: "user", content: results });
}

if (!final) throw new Error(`Agent did not finish within ${MAX_TURNS} turns`);
for (const block of final.content) {
  if (block.type === "text") console.log(block.text);
}
```

The loop is deliberately bare so the mechanics are visible. In practice you rarely hand-write it:

- **SDK tool runners** — the Anthropic Python and TypeScript SDKs ship a (beta) *tool runner* that executes your tool functions, feeds results back, and stops when the model is done, with an optional iteration cap.
- **Claude Agent SDK** — a separate product that packages the Claude Code harness (built-in file and shell tools, permissions, subagents, sessions, hooks, MCP) as a Python and TypeScript library, for agents that need a full working environment rather than a few functions.

---

## When to use

- **Open-ended tasks with an unpredictable number of steps.** Investigations, multi-source research, changes whose scope is discovered while working.
- **Errors are cheap or detectable.** A test suite, a reviewer, or a validator catches a wrong path before it matters.
- **The task is valuable enough to pay for the loop.** The token multiple is justified by the time saved or the quality gained.
- **A workflow was tried and could not express the branching.** You climbed the ladder because the fixed path failed, not because agents are fashionable.

## When NOT to use

- **A fixed workflow suffices.** If you can draw the steps in advance, code them; prompt chaining or routing is cheaper, faster, and testable.
- **Latency or cost is critical.** Each iteration is a full model call over a growing context; interactive paths with tight budgets suffer.
- **Errors are costly and silent.** Financial, medical, or destructive actions with no verification step and no human in the loop.
- **Multi-agent by default.** Spawning subagents for tightly coupled work multiplies cost and loses information at every hand-off. Start with one agent — or none.
- **No traces, no evals.** An agent you cannot observe step by step and measure over many runs cannot be debugged or improved.

---

## References

- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) — Anthropic, the workflow vs agent distinction, the five patterns, and the case for starting simple
- [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) — Anthropic, the measured gains and token costs of a lead agent with parallel subagents, and where the pattern fits poorly
- [Tool runner (SDK)](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-runner) — Claude API documentation for the SDK helper that automates the loop
- [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) — the Claude Agent SDK: Claude Code's agent loop, tools, and context management as a library
