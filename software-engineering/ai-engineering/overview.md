---
type: concept
tags:
  - concept
  - ai-engineering
  - overview
related:
  - software-engineering/ai-engineering/prompt-engineering
  - software-engineering/ai-engineering/context-engineering
  - software-engineering/ai-engineering/rag
  - software-engineering/ai-engineering/agents
  - software-engineering/ai-engineering/evals
  - software-engineering/ai-engineering/prompting-vs-rag-vs-fine-tuning
  - software-engineering/ai-assisted-development/overview
language: null
---

# AI Engineering

> Building systems on top of large language models: what the parts are, which levers improve them, and why the cheapest lever is almost always the right one to pull first.

---

## What is it?

AI engineering is the work of turning a general-purpose language model into a reliable part of a product. The model itself is bought, not built: you call it over an API and pay per token. The engineering is everything around that call — what you put into the prompt, which data you fetch for it, which actions you let it take, how you check what comes back, and what it all costs.

It is a different job from [AI-assisted development](../ai-assisted-development/overview.md). There, an LLM helps you write software. Here, the LLM *is* part of the software you are shipping, and its behaviour is something you design, test, and operate.

---

## Why does it matter?

A model call is easy to make and hard to make dependable. The same prompt can return a perfect answer, a plausible wrong answer, or a correctly formatted refusal, and nothing in the HTTP response tells you which. Three properties drive almost every design decision in this section:

- **Output is probabilistic.** The same input does not guarantee the same output. Correctness has to be measured over many runs, not asserted once — see [Evals](evals.md).
- **The model only knows what it sees.** It has no access to your data, your users, or anything after its training cutoff unless you put it in the context. Most "the model is wrong" bugs are "the model was not shown the right thing" bugs.
- **Every token costs money and time.** Input, output, and reasoning tokens are billed and add latency. A design that works in a demo can be unaffordable at production volume.

Practitioners who skip the fundamentals tend to reach for the most powerful-sounding technique — an autonomous agent, a fine-tuned model — when a clearer prompt or better retrieval would have solved the problem at a fraction of the cost.

---

## How it works

### The building blocks

```
                ┌──────────────────────────────────────────────┐
                │                 Your application              │
                │                                               │
 user input ──▶ │  prompt     context        tools              │
                │  (system,   (history,      (functions the     │
                │  examples)  retrieved      model may call)    │
                │             documents)                        │
                │       └──────────┬──────────────┘             │
                │                  ▼                            │
                │           ┌─────────────┐                     │
                │           │  LLM (API)  │ ◀── loop while it    │
                │           └─────────────┘     asks for tools   │
                │                  │                            │
                │                  ▼                            │
                │   validate · guard · log · measure (evals)    │
                └──────────────────┬───────────────────────────┘
                                   ▼
                                response
```

- **Model** — a hosted LLM, chosen by capability, price, and latency.
- **Prompt** — the instructions: role, task, rules, examples. See [Prompt Engineering](prompt-engineering.md).
- **Context** — everything else the model reads on this call: conversation history, retrieved documents, tool results. See [Context Engineering](context-engineering.md).
- **Retrieval** — fetching the relevant slice of a large knowledge base at query time. See [RAG](rag.md).
- **Tools** — functions the model can ask your code to run. See [Tool Use](tool-use.md) and [MCP](model-context-protocol.md).
- **Agent loop** — letting the model call tools repeatedly until it decides the task is done. See [Agents](agents.md), [Agent Memory](agent-memory.md), and [Agent Skills](agent-skills.md).
- **Verification** — schemas, guardrails, and evals that turn "it looked right" into a number. See [Structured Outputs](structured-outputs.md), [Prompt Injection and Guardrails](prompt-injection-and-guardrails.md), and [Evals](evals.md).

### The levers, in order of cost

When the output is not good enough, there is a natural order in which to try fixes. Each step up the ladder costs more to build, more to run, or more to change later:

```
  cost to build and maintain
        ▲
        │   6. Fine-tuning      change the model's weights
        │   5. Agents           let the model plan and loop
        │   4. Tools            let the model act and fetch live data
        │   3. Retrieval        fetch the relevant knowledge per query
        │   2. Context          choose, order, and trim what the model sees
        │   1. Prompt           say clearly what you want
        └───────────────────────────────────────────────▶
```

The rule is simple: **exhaust the cheaper lever before climbing**. A vague prompt does not get better with retrieval; a retrieval problem does not get better with an agent. The [decision article](prompting-vs-rag-vs-fine-tuning.md) covers the top and bottom of the ladder in detail. And none of the levers can be judged without an eval — without one, you cannot tell whether a change helped.

### Quality, cost, and latency

Every technique in this section moves at least one of three axes, usually at the expense of another:

| Technique | Quality | Cost | Latency |
|---|---|---|---|
| Clearer prompt, few-shot examples | ▲ | ≈ | ≈ |
| More reasoning (thinking, higher effort) | ▲ | ▲ | ▲ |
| Retrieval instead of stuffing everything in | ▲ | ▼ | ▼ |
| Prompt caching | ≈ | ▼ | ▼ |
| Smaller model / routing | ▼ or ≈ | ▼ | ▼ |
| Batch processing | ≈ | ▼ | ▲ (async) |
| Multi-agent fan-out | ▲ on broad tasks | ▲▲ | ▼ wall-clock, ▲ total |

See [Cost and Latency Optimization](cost-and-latency-optimization.md) and [Prompt Caching](prompt-caching.md) for the right-hand columns.

---

## Examples

The smallest useful unit is a single API call with a system prompt. Every other article in this section builds on this shape.

**Python — Claude API**

```python
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment

response = client.messages.create(
    model="claude-sonnet-5-5",  # model IDs at time of writing
    max_tokens=1024,
    system="You are a concise assistant for a software engineering wiki.",
    messages=[{"role": "user", "content": "In one sentence, what is RAG?"}],
)

for block in response.content:
    if block.type == "text":
        print(block.text)

print(response.usage.input_tokens, response.usage.output_tokens)
```

**TypeScript — Claude API**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

const response = await client.messages.create({
  model: "claude-sonnet-5-5", // model IDs at time of writing
  max_tokens: 1024,
  system: "You are a concise assistant for a software engineering wiki.",
  messages: [{ role: "user", content: "In one sentence, what is RAG?" }],
});

for (const block of response.content) {
  if (block.type === "text") console.log(block.text);
}

console.log(response.usage.input_tokens, response.usage.output_tokens);
```

Three things in this snippet recur everywhere: the response is a *list of blocks* (text, tool calls, reasoning), not a string; the `usage` field is your cost meter; and the system prompt is the first and cheapest lever you have.

---

## When to use

- **Language is the interface.** Summarising, extracting, classifying, drafting, answering questions over text — tasks where rules-based code would be brittle.
- **The input is unstructured and varied.** Support tickets, documents, logs, free-form user requests.
- **"Good enough, measured" is acceptable.** You can define success, build an eval, and tolerate a known error rate with a fallback.
- **The task needs judgement across many small steps.** Investigations, multi-source research, and code changes — where an agent with tools earns its cost.

## When NOT to use

- **Deterministic code already does it.** Parsing a known format, arithmetic, routing on a fixed field — a function is cheaper, faster, and always right.
- **Errors are expensive and silent.** If a wrong answer cannot be detected before it causes harm and there is no human check, a probabilistic component is the wrong tool.
- **You cannot measure success.** Without an eval, every change is a guess and regressions ship unnoticed.
- **The data cannot leave your boundary.** Regulated or sensitive data sent to a hosted model is a policy decision first and an engineering one second.
- **Starting at the top of the ladder.** Reaching for fine-tuning or a multi-agent system before trying a clear prompt and good context.

---

## References

- [AI Engineering: Building Applications with Foundation Models](https://www.oreilly.com/library/view/ai-engineering/9781098166298/) — Chip Huyen (O'Reilly, 2025), the reference book for the discipline
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) — Anthropic, on starting simple and climbing only when needed
- [Claude API documentation](https://platform.claude.com/docs/en/intro) — the provider documentation behind the examples in this section
