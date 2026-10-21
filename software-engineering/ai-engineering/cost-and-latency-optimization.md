---
type: concept
tags:
  - concept
  - ai-engineering
related:
  - software-engineering/ai-engineering/prompt-caching
  - software-engineering/ai-engineering/evals
  - software-engineering/ai-engineering/context-engineering
  - software-engineering/ai-engineering/agents
  - software-engineering/ai-engineering/prompting-vs-rag-vs-fine-tuning
language: null
---

# Cost and Latency Optimization

> What drives the cost and speed of an LLM system, the levers that move each one, and why you measure cost per completed task — against an eval — before pulling any of them.

---

## What is it?

Cost and latency optimisation is the work of making an LLM system cheaper and faster without making it worse. Almost everything you pay and wait for comes from three things:

- **Tokens** — how many go in (prompt, context, history, tool results) and how many come out (answer, reasoning, tool calls).
- **Model** — larger models cost more per token and are usually slower; smaller ones are cheap and fast but fail more often on hard tasks.
- **Calls** — how many requests one user task takes: a single call, a fixed workflow, or an agent loop of dozens of turns.

Every lever in this article changes one of those three. This article is the hub: each lever is summarised here and linked to the article that covers it in depth.

---

## Why does it matter?

- **Demos hide the bill.** A prototype making ten calls a day costs nothing; the same design at a million calls a day can be unaffordable. Agent loops make it worse, because each turn resends the whole growing context.
- **Latency is UX.** Users abandon slow interfaces. A response that takes twenty seconds to start feels broken even when it is correct.
- **Cost per token is the wrong unit.** A cheaper model that fails the task still bills its tokens, then the retry, then whatever the failure costs downstream. A pricier model that finishes in fewer turns can be the cheaper option. Measure **cost per completed task**.
- **Optimisation can quietly cut quality.** Every lever except the "free wins" trades capability for money. Without an [eval](evals.md) you cannot tell whether you cut cost or cut correctness.

---

## How it works

### The levers

Each lever is tagged with what it moves: **cost**, **latency**, or **both**. Free wins (no quality trade-off) come first; trade-offs come last.

| Lever | Moves | Quality risk |
|---|---|---|
| Prompt caching | both | none |
| Leaner input tokens | both | low, if validated |
| Leaner output tokens | both | low |
| Batch API | cost (latency goes *up*) | none |
| Streaming | perceived latency | none |
| Parallelism | latency | none |
| Fewer calls | both | medium |
| Lower reasoning effort | both | medium |
| Smaller model / routing | both | high |

### Free wins

- **Prompt caching — both.** Stable prefixes (tools, system prompt, documents, history) are reused at a fraction of the input price and with lower time to first token. In Anthropic's published measurements it is the largest single cost lever for agent loops. See [Prompt Caching](prompt-caching.md).
- **Input tokens — both.** Send what the task needs and let the model fetch the rest: retrieve relevant chunks instead of whole documents ([RAG](rag.md)), keep the context window lean and compact long histories ([Context Engineering](context-engineering.md)), and design tools that return narrow, filtered results rather than data dumps ([Tool Use](tool-use.md)). Validate against the eval — a smaller prompt that forces extra discovery turns is not cheaper.
- **Output tokens — both.** Output is priced several times higher per token than input on current models, and it is generated sequentially, so it dominates latency. Ask for the exact output shape and length; ask for structured data instead of prose when code consumes it ([Structured Outputs](structured-outputs.md)). Use `max_tokens` as a backstop against runaway output, not as a way to shorten answers — hitting it cuts a response off mid-thought.
- **Batch API — cost.** Non-interactive work — bulk classification, enrichment, backfills, eval runs — goes through an asynchronous batch endpoint at a discount. In the Claude API at time of writing, the [Message Batches API](https://platform.claude.com/docs/en/build-with-claude/batch-processing) costs 50% of standard prices, stacks with caching, and returns results within 24 hours (most batches finish within one). Never for a user who is waiting.
- **Streaming — perceived latency.** Streaming does not reduce cost or total generation time; it shows the first tokens as soon as they exist. Time to first token (TTFT) becomes what the user feels. Use it for any long, user-facing response.
- **Parallelism — latency.** Independent calls run concurrently instead of one after another (classify 20 documents at once, not in a loop). Models can also request several tool calls in one turn; execute them in parallel. Total tokens are unchanged; wall-clock time drops.

### Trade-offs

- **Fewer calls — both.** Merge steps when one call does both jobs as well as two, and avoid a multi-agent design when a single agent suffices — coordinators, handoffs, and merges cost tokens a single agent never spends. See [Agents](agents.md).
- **Reasoning budget — both.** Models that reason before answering spend output tokens on thinking. Lower effort means fewer thinking tokens, fewer and terser tool calls, faster and cheaper responses. In the Claude API, current models use adaptive thinking (the model decides how much to think) and you steer it with `output_config.effort` (`low`, `medium`, `high`, `xhigh`, `max`). Sweep effort on the eval before touching the model.
- **Model choice and routing — both.** Use the smallest model that passes the eval. Variants:
  - **Router** — a rule or a cheap classifier sends easy requests to a small model and hard ones to a larger one.
  - **Cascade** — try the cheap model first and escalate to the larger one when a checker or low confidence flags the answer.
  - Before building either, measure the capable model at **lower effort**: it is often the cheaper option per completed task, and it keeps one model per conversation. Caches are per model, so routing turns *within* a conversation start from a cold cache each time; route between conversations or tasks, not between turns.

### Measuring

- **Cost per completed task** — total spend for a task (every call, retry, and judge call) divided by tasks that actually succeeded. Not per call, not per token.
- **Latency p50 and p95** — the median hides the slow tail users remember.
- **Time to first token** — the latency users perceive in streaming interfaces.
- **Usage fields** — log `response.usage` per request: input, output, cache-write, and cache-read tokens. They turn every estimate into a measurement.

Change one lever at a time, re-run the eval, and keep the change only if quality holds.

---

## Examples

### A two-model router

Easy, short requests go to a small model at low effort; everything else goes to the larger default model. A real router would use a classifier or a confidence signal, and both paths must pass the eval.

**Python — Claude API**

```python
import anthropic

client = anthropic.Anthropic()

# model IDs at time of writing
SMALL, LARGE = "claude-haiku-5-5", "claude-sonnet-5-5"
HARD_HINTS = ("why", "design", "compare", "debug", "trade-off")


def route(question: str) -> dict:
    hard = len(question) > 300 or any(h in question.lower() for h in HARD_HINTS)
    if hard:
        return {"model": LARGE}
    return {"model": SMALL, "output_config": {"effort": "low"}}


def ask(question: str) -> str:
    response = client.messages.create(
        max_tokens=2048,
        messages=[{"role": "user", "content": question}],
        **route(question),
    )
    print(response.model, response.usage.input_tokens, response.usage.output_tokens)
    return "".join(b.text for b in response.content if b.type == "text")
```

**TypeScript — Claude API**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// model IDs at time of writing
const SMALL = "claude-haiku-5-5";
const LARGE = "claude-sonnet-5-5";
const HARD_HINTS = ["why", "design", "compare", "debug", "trade-off"];

function route(question: string): Pick<Anthropic.MessageCreateParamsNonStreaming, "model" | "output_config"> {
  const hard = question.length > 300 || HARD_HINTS.some((h) => question.toLowerCase().includes(h));
  return hard ? { model: LARGE } : { model: SMALL, output_config: { effort: "low" } };
}

async function ask(question: string): Promise<string> {
  const response = await client.messages.create({
    max_tokens: 2048,
    messages: [{ role: "user", content: question }],
    ...route(question),
  });
  console.log(response.model, response.usage.input_tokens, response.usage.output_tokens);
  return response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}
```

### Streaming and measuring time to first token

**Python — Claude API**

```python
import time

start = time.perf_counter()
first_token_at = None

with client.messages.stream(
    model="claude-sonnet-5-5",
    max_tokens=4096,
    messages=[{"role": "user", "content": "Explain blue-green deployments."}],
) as stream:
    for text in stream.text_stream:
        if first_token_at is None:
            first_token_at = time.perf_counter() - start
        print(text, end="", flush=True)
    final = stream.get_final_message()

print(f"\nTTFT={first_token_at:.2f}s total={time.perf_counter() - start:.2f}s "
      f"output_tokens={final.usage.output_tokens}")
```

**TypeScript — Claude API**

```typescript
const start = performance.now();
let firstTokenAt: number | null = null;

const stream = client.messages.stream({
  model: "claude-sonnet-5-5",
  max_tokens: 4096,
  messages: [{ role: "user", content: "Explain blue-green deployments." }],
});

stream.on("text", (text) => {
  if (firstTokenAt === null) firstTokenAt = (performance.now() - start) / 1000;
  process.stdout.write(text);
});

const final = await stream.finalMessage();
const total = (performance.now() - start) / 1000;
console.log(`\nTTFT=${firstTokenAt?.toFixed(2)}s total=${total.toFixed(2)}s output_tokens=${final.usage.output_tokens}`);
```

### Submitting a batch

Bulk classification that nobody is waiting for. Results can come back in any order, so key them by `custom_id`.

**Python — Claude API**

```python
import time

from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

tickets = {"t-001": "The export button does nothing.", "t-002": "How do I rotate my API token?"}

batch = client.messages.batches.create(
    requests=[
        Request(
            custom_id=ticket_id,
            params=MessageCreateParamsNonStreaming(
                model="claude-haiku-5-5",
                max_tokens=1024,
                messages=[{"role": "user", "content": f"Label as bug, question, or feature request: {text}"}],
            ),
        )
        for ticket_id, text in tickets.items()
    ]
)

while client.messages.batches.retrieve(batch.id).processing_status != "ended":
    time.sleep(60)

for result in client.messages.batches.results(batch.id):
    if result.result.type == "succeeded":
        msg = result.result.message
        print(result.custom_id, next((b.text for b in msg.content if b.type == "text"), ""))
    else:
        print(result.custom_id, "failed:", result.result.type)
```

**TypeScript — Claude API**

```typescript
const tickets: Record<string, string> = {
  "t-001": "The export button does nothing.",
  "t-002": "How do I rotate my API token?",
};

const batch = await client.messages.batches.create({
  requests: Object.entries(tickets).map(([ticketId, text]) => ({
    custom_id: ticketId,
    params: {
      model: "claude-haiku-5-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: `Label as bug, question, or feature request: ${text}` }],
    },
  })),
});

while ((await client.messages.batches.retrieve(batch.id)).processing_status !== "ended") {
  await new Promise((resolve) => setTimeout(resolve, 60_000));
}

for await (const result of await client.messages.batches.results(batch.id)) {
  if (result.result.type === "succeeded") {
    const text = result.result.message.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    console.log(result.custom_id, text);
  } else {
    console.log(result.custom_id, "failed:", result.result.type);
  }
}
```

For per-model rates, see the [pricing page](https://platform.claude.com/docs/en/about-claude/pricing); this article deliberately quotes ratios only, because prices change with every model release.

---

## When to use

- **Production traffic with real volume.** When the monthly bill is a line item someone reviews, the free wins pay back quickly.
- **Latency hurts the experience.** Chat, autocomplete, voice, or any interface where a person is waiting for the first word.
- **Long agent loops.** Many turns over a growing context — caching, lean tool results, and effort have the largest effect here.
- **Bulk, non-interactive jobs.** Classification, enrichment, evals, backfills — the batch discount is close to free money.

## When NOT to use

- **Before an eval exists.** Without a quality score, a cheaper configuration is indistinguishable from a broken one — you cannot tell whether you cut cost or cut quality. Build the [eval](evals.md) first; until then, apply only the free wins.
- **On a tiny bill.** Engineering time costs more than the tokens; "nothing worth changing" is a valid finding.
- **Routing between models inside one conversation.** It forfeits the cache and can cost more than staying on one model at a lower effort.
- **Trimming `max_tokens` to save money.** It truncates answers rather than shortening them; a cut-off answer is a failed task you still pay for.
- **Reaching for fine-tuning or distillation to save cost** before exhausting the levers above — those change the model itself and belong to a different decision; see [Prompting vs RAG vs Fine-Tuning](prompting-vs-rag-vs-fine-tuning.md).

---

## References

- [Optimizing for cost and intelligence](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence) — Anthropic's measured results for caching, effort, model choice, and batching
- [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — current per-model input, output, cache, and batch rates
- [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) — Claude docs on the effort parameter and how it trades thoroughness for tokens
- [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) — Claude docs on the Message Batches API and its discount
- [Streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming) — Claude docs on streaming responses with server-sent events
