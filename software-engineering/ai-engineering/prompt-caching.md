---
type: concept
tags:
  - concept
  - ai-engineering
related:
  - software-engineering/ai-engineering/cost-and-latency-optimization
  - software-engineering/ai-engineering/context-engineering
  - software-engineering/ai-engineering/agents
  - software-engineering/ai-engineering/tool-use
language: null
---

# Prompt Caching

> Reusing the provider's processed copy of a prompt prefix that many requests share — the highest-return cost and latency optimisation for agents and long conversations, and the easiest one to break silently.

---

## What is it?

Prompt caching lets the model provider remember the beginning of a prompt it has already processed, so the next request that starts with exactly the same text does not pay to process it again.

Most LLM requests repeat themselves. An agent resends its tool definitions and system prompt on every turn; a chat resends the whole history; a document Q&A app resends the same manual for every question. With caching, the provider stores the processed state of that shared **prefix** and reuses it. Reading from the cache is billed at a fraction of normal input price and the model starts answering sooner, because it skips work it has already done.

---

## Why does it matter?

- **Agent loops resend everything.** Every turn sends the system prompt, tools, and all prior turns again. A 40-turn task sends its first turn 40 times. Without caching, input cost grows roughly with the square of the number of turns.
- **Big savings without touching quality.** The model sees exactly the same tokens; only the billing and latency change. It is the rare optimisation with no quality trade-off.
- **Lower time to first token.** The cached part of the prompt does not need to be processed again, which matters most for long prefixes in interactive apps.
- **It fails silently.** A cache miss is not an error. A timestamp added to the system prompt keeps every request working and quietly multiplies the bill. Measuring is part of the technique.

---

## How it works

### It is a prefix cache

The cache key is the exact bytes of the prompt from the start up to a marked point. A request hits the cache only if everything before that point is **byte-identical** to an earlier request. A single changed character invalidates the cache for everything after it — but not before it.

```
request 1:  [tools][system prompt][document][turn 1][turn 2]  ← cached up to the marker
request 2:  [tools][system prompt][document][turn 1][turn 2][turn 3]
            └──────────────── cache read ─────────────────┘└ new ┘

request 3:  [tools][system prompt + "now: 10:42"][document]...
            └ hit ┘└──────────── everything from here is a miss ─────────┘
```

### Order the prompt from stable to volatile

Because only an unchanged prefix can be reused, put what never changes first and what changes every time last:

```
  tools  →  system prompt  →  stable documents  →  conversation history  →  new message
  (never)    (per deploy)      (per session)        (grows each turn)       (every request)
```

Anything dynamic — the current time, a request ID, the user's name, a feature flag — belongs at the end, in the new message, not in the system prompt.

### In the Claude API

The following are details of the Claude API at time of writing; check the [prompt caching documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) and the [pricing page](https://platform.claude.com/docs/en/about-claude/pricing) before relying on any number.

- **Render order** is `tools` → `system` → `messages`. A breakpoint on the last system block caches tools and system together.
- **Explicit breakpoints**: add `cache_control: {"type": "ephemeral"}` to a content block to cache everything up to and including it. Up to **4** breakpoints per request, so layers that change at different rates (tools and system, a per-session document, the conversation) can each have their own.
- **Automatic caching**: a top-level `cache_control` on the request places the breakpoint on the last cacheable block and moves it forward as a conversation grows — the simplest option for multi-turn chat. Use explicit breakpoints when the prompt ends in content unique to each request; otherwise every request pays to write a cache entry no one will read.
- **Minimum size**: prefixes shorter than a model-dependent minimum are silently not cached — 512 tokens on the newest models (Claude Sonnet 5.5, Claude Haiku 5.5, Claude Opus 5.5), up to 4,096 on some older ones.
- **Lifetime (TTL)**: 5 minutes by default; `{"type": "ephemeral", "ttl": "1h"}` keeps an entry for an hour. Each cache read refreshes the timer at no cost, so steady traffic keeps a 5-minute entry alive indefinitely.
- **Pricing as multiples of the base input price**: writing to the cache costs 1.25× (5-minute TTL) or 2× (1-hour TTL); reading costs 0.1× in general, 0.05× on Claude Sonnet 5.5 and Claude Opus 5.5, and less on some top-tier models. With the 5-minute TTL a single cache read already pays back the write premium.
- **Caches are per model.** Switching model for a request starts from an empty cache.

### Other providers

Several providers cache prompt prefixes; some do it automatically without any marker, and discounts, minimum sizes, and lifetimes differ. The design rules above — stable prefix first, nothing dynamic early, measure the hit rate — apply to all of them.

### Common cache breakers

| Breaker | Why it misses | Fix |
|---|---|---|
| Current date/time or a request ID in the system prompt | Prefix differs on every request | Move it to the latest user message |
| Tools built in a non-deterministic order, or per user | Tools render first; any change invalidates everything | Sort tools by name; keep one tool set per session |
| JSON serialised with unstable key order | Same data, different bytes | `sort_keys=True` or a canonical serialiser |
| Conditional system prompt sections (`if flag: ...`) | Every flag combination is a separate prefix | Pass the variable part later in `messages` |
| Switching models mid-conversation | Caches are per model | Pick the model per conversation, not per turn |
| Editing earlier turns (rewriting or trimming history) | Changes the prefix from that turn on | Treat history as append-only; trim rarely and in large batches |

### Measuring

The response `usage` object is the only proof that caching works. In the Claude API:

- `cache_creation_input_tokens` — tokens written to the cache on this request (paid at the write premium).
- `cache_read_input_tokens` — tokens served from the cache (paid at the read price).
- `input_tokens` — the uncached remainder after the last breakpoint, at full price.

Total prompt size is the sum of the three. **Cache hit rate** = `cache_read_input_tokens` ÷ (sum of all three). In a healthy agent loop, reads cover almost the whole prior conversation and each request writes only roughly the latest turn. Re-check after every change to prompt-assembly code — the typical failure is a later change that breaks a cache that used to work.

---

## Examples

### A long system prompt with a breakpoint, called twice

`STYLE_GUIDE` stands for a large, stable block — instructions, few-shot examples, a reference document — comfortably above the model's minimum cacheable size. The second call reads it from the cache.

**Python — Claude API**

```python
import anthropic

client = anthropic.Anthropic()

STYLE_GUIDE = open("style_guide.md").read()  # several thousand tokens, identical on every request


def review(snippet: str):
    return client.messages.create(
        model="claude-sonnet-5-5",  # model IDs at time of writing
        max_tokens=1024,
        system=[{
            "type": "text",
            "text": STYLE_GUIDE,
            "cache_control": {"type": "ephemeral"},  # cache tools + system up to here (5-minute TTL)
        }],
        messages=[{"role": "user", "content": f"Review this code against the style guide:\n{snippet}"}],
    )


for snippet in ["def f(x): return x*2", "class foo: pass"]:
    u = review(snippet).usage
    print(
        f"written={u.cache_creation_input_tokens} "
        f"read={u.cache_read_input_tokens} uncached={u.input_tokens}"
    )
# 1st call: written≈size of the style guide, read=0
# 2nd call: written=0, read≈size of the style guide — only the snippet is billed at full price
```

**TypeScript — Claude API**

```typescript
import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const STYLE_GUIDE = readFileSync("style_guide.md", "utf8"); // several thousand tokens, identical on every request

async function review(snippet: string): Promise<Anthropic.Message> {
  return client.messages.create({
    model: "claude-sonnet-5-5", // model IDs at time of writing
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: STYLE_GUIDE,
        cache_control: { type: "ephemeral" }, // cache tools + system up to here (5-minute TTL)
      },
    ],
    messages: [{ role: "user", content: `Review this code against the style guide:\n${snippet}` }],
  });
}

for (const snippet of ["def f(x): return x*2", "class foo: pass"]) {
  const u = (await review(snippet)).usage;
  console.log(
    `written=${u.cache_creation_input_tokens} read=${u.cache_read_input_tokens} uncached=${u.input_tokens}`,
  );
}
// 1st call: written≈size of the style guide, read=0
// 2nd call: written=0, read≈size of the style guide — only the snippet is billed at full price
```

### Before and after: a timestamp that broke the cache

**Python — Claude API**

```python
from datetime import datetime, timezone

now = datetime.now(timezone.utc).isoformat()

# Before: the timestamp sits at the front of the prefix — every request is a cache miss.
broken = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=1024,
    system=[{
        "type": "text",
        "text": f"Current time: {now}\n\n{STYLE_GUIDE}",
        "cache_control": {"type": "ephemeral"},
    }],
    messages=[{"role": "user", "content": "Review: def f(x): return x*2"}],
)

# After: the system prompt is frozen; the volatile value moves to the end, after the breakpoint.
fixed = client.messages.create(
    model="claude-sonnet-5-5",
    max_tokens=1024,
    system=[{"type": "text", "text": STYLE_GUIDE, "cache_control": {"type": "ephemeral"}}],
    messages=[{"role": "user", "content": f"Current time: {now}\n\nReview: def f(x): return x*2"}],
)
```

**TypeScript — Claude API**

```typescript
const now = new Date().toISOString();

// Before: the timestamp sits at the front of the prefix — every request is a cache miss.
const broken = await client.messages.create({
  model: "claude-sonnet-5-5",
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: `Current time: ${now}\n\n${STYLE_GUIDE}`,
      cache_control: { type: "ephemeral" },
    },
  ],
  messages: [{ role: "user", content: "Review: def f(x): return x*2" }],
});

// After: the system prompt is frozen; the volatile value moves to the end, after the breakpoint.
const fixed = await client.messages.create({
  model: "claude-sonnet-5-5",
  max_tokens: 1024,
  system: [{ type: "text", text: STYLE_GUIDE, cache_control: { type: "ephemeral" } }],
  messages: [{ role: "user", content: `Current time: ${now}\n\nReview: def f(x): return x*2` }],
});
```

Repeat the "before" request a minute later and `cache_read_input_tokens` stays at zero while `cache_creation_input_tokens` is charged every time — you pay the write premium on every request and never collect a read. The "after" version reads the style guide from the cache from the second request on.

---

## When to use

- **Agent loops.** Tools and system prompt are identical across turns, and the history grows append-only — the textbook case.
- **Multi-turn chat.** Automatic caching keeps the conversation so far in the cache as it grows.
- **Many questions over the same large context.** A manual, a codebase summary, a long set of few-shot examples — put it first, mark it, and ask varied questions after it.
- **Frequent calls within the TTL.** Requests that share a prefix and start within the cache lifetime of each other; for gaps of tens of minutes, consider the longer TTL.

## When NOT to use

- **One-off prompts.** A prefix used once pays the write premium and is never read.
- **Calls spaced beyond the TTL.** A nightly job or a user who returns hours later always misses; you pay the write, never the read.
- **Prefixes below the minimum size.** They are silently not cached; marking them changes nothing.
- **Mostly unique input.** If each request is dominated by different content (a fresh document every time), the cacheable share is small — the saving is honest but minor.
- **Marking the end of a prompt that ends in per-request content.** Place the breakpoint at the end of the *shared* portion instead, or every request writes an entry no other request can use.

---

## References

- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — Claude docs: breakpoints, automatic caching, TTLs, minimum sizes, and usage fields
- [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — current per-model rates for cache writes and cache reads
- [Optimizing for cost and intelligence](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence) — Anthropic's measured results, with caching as the largest single cost lever
