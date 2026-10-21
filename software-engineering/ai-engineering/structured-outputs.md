---
type: concept
tags:
  - concept
  - ai-engineering
related:
  - software-engineering/ai-engineering/prompt-engineering
  - software-engineering/ai-engineering/tool-use
  - software-engineering/ai-engineering/evals
language: null
---

# Structured Outputs

> Getting machine-readable data back from a language model reliably — from a format example in the prompt, through schema-checked tool inputs, to output the provider guarantees matches your JSON Schema — and validating it in your own code anyway.

---

## What is it?

Structured output means asking a language model to answer in a fixed, machine-readable shape — usually JSON matching a schema — instead of free text. The schema is the contract between the model and the rest of your system: the code that reads the answer knows which fields exist, what type each one has, and which values are allowed.

Three mechanisms get you there, from weakest to strongest:

1. **Prompt instruction** — describe the format and show an example; hope the model follows it.
2. **A tool used as a return channel** — define a "tool" whose input schema is the shape you want; the model "calls" it, and you read the arguments instead of executing anything.
3. **Native structured outputs** — pass a JSON Schema to the API, and the provider constrains generation so the response is guaranteed to parse and match.

---

## Why does it matter?

The moment an LLM's output feeds code instead of a person, free text becomes a liability. A parser fed "Sure! Here's the JSON you asked for:" followed by a Markdown code fence breaks. So does a missing field, a number returned as a string, or a category spelled differently from the enum your database expects. These failures are intermittent — the same prompt succeeds 98 times and fails twice — which makes them expensive to find in production.

A schema turns "the model usually returns something like this" into a typed interface. It also makes the rest of the system testable: an [eval](evals.md) can compare fields exactly instead of fuzzy-matching prose.

---

## How it works

### The three mechanisms

| | 1. Prompt instruction | 2. Tool input schema | 3. Native structured outputs |
|---|---|---|---|
| How | "Return JSON like this: …" plus an example | Tool definition whose `input_schema` is the result shape | JSON Schema passed as a response format |
| Guarantee | None — best effort | Valid input when the tool is marked strict | Response always parses and matches the schema |
| Failure mode | Preamble, code fences, missing fields, trailing prose | Model answers in text instead of calling the tool | Refusal or truncation (see below) |
| Use when | The provider has nothing better; quick prototypes | The data really is a tool call, or you need several possible shapes | You need one guaranteed shape back |

**Mechanism 1** relies entirely on [prompting](prompt-engineering.md): a clear format description and an example. It needs a defensive parser (strip code fences, extract the first `{…}` block) and a retry. Older workarounds — prefilling the reply with `{`, stop sequences, "output ONLY valid JSON" — are all scaffolding around the lack of a guarantee.

**Mechanism 2** reuses [tool use](tool-use.md). The schema is enforced on the tool's arguments rather than on the reply. In the Claude API, adding `strict: true` to a tool definition (with `additionalProperties: false` and every field in `required`) guarantees the arguments match. The catch is getting the model to call the tool at all: on current Claude models forced tool choice is not supported, so you rely on `tool_choice: auto` plus an instruction, and must handle a text reply.

```json
{
  "name": "record_ticket",
  "description": "Record the triage result for one support ticket.",
  "strict": true,
  "input_schema": {
    "type": "object",
    "properties": { "category": { "type": "string", "enum": ["billing", "bug", "feature", "other"] }, "summary": { "type": "string" } },
    "required": ["category", "summary"], "additionalProperties": false
  }
}
```

**Mechanism 3** moves the guarantee into the provider. Generation is constrained by a grammar compiled from your schema, so invalid JSON cannot be produced. In the Claude API this is `output_config.format` with `type: "json_schema"`; the SDKs add a `messages.parse` helper that takes a Pydantic model (Python) or a Zod schema (TypeScript) and returns the parsed object.

### Validate anyway

A schema guarantee is about *shape*, not *truth*. Your application still validates, for three reasons:

- **Schema features are limited.** Providers support a subset of JSON Schema. In the Claude API, numeric bounds (`minimum`, `maximum`), string lengths, and recursive schemas are not supported, so "a score between 0 and 1" cannot be enforced by the schema alone.
- **Business rules span fields.** "Refund amount must not exceed the order total" is not expressible in JSON Schema at all.
- **Two stop conditions bypass the guarantee.** A refusal or a response cut off at `max_tokens` may not match the schema. Check the stop reason before trusting the payload.

The validation loop:

```
  call model with schema ──▶ check stop reason ──▶ parse ──▶ validate (Pydantic / Zod)
          ▲                                                        │
          │                   invalid: send the validation         │ valid
          └──────────── error back to the model, retry (max N) ◀───┤
                                                                   ▼
                                                             use the object
```

Feeding the exact validation error back ("refund_amount must be between 0 and order_total") works better than a blind retry, because it tells the model what to fix. Cap the retries and fall back to a human or a default when they run out.

### Pitfalls

- **Oversized or deeply nested schemas.** Every field is something the model must fill and you must validate. Providers also cap schema complexity — in the Claude API there are limits on optional parameters and union types, and the first request with a new schema pays a compilation delay. Flatten, mark fields required, and split one giant extraction into several focused calls.
- **Enums without an escape.** If `category` must be one of four values and the input fits none, the model picks the least-wrong one and you never find out. Add `"other"` or `"unknown"` and track how often it is used.
- **Reasoning forced into the same JSON.** Asking for the answer field alone on a hard task removes the space to think; asking for long reasoning inside the JSON mixes prose into data. Prefer native reasoning (thinking blocks) and keep the schema for the result. If you need an audit trail, add a short `justification` field and order it *before* the answer field, since the model generally writes fields in the order the schema lists them. On several current Claude models, asking the model to reproduce its full reasoning in the output may be declined — another reason to rely on thinking.
- **Case drift in enums.** In the Claude API, enum casing is not guaranteed; compare enum values case-insensitively.

---

## Examples

### Native structured output with the SDK parse helper

**Python — Claude API**

```python
from typing import Literal
import anthropic
from pydantic import BaseModel

class Ticket(BaseModel):
    category: Literal["billing", "bug", "feature", "other"]
    priority: Literal["low", "medium", "high"]
    summary: str

client = anthropic.Anthropic()

response = client.messages.parse(
    model="claude-sonnet-5-5",  # model IDs at time of writing
    max_tokens=4096,
    messages=[{
        "role": "user",
        "content": "Triage this ticket: 'I was charged twice for March and support has not replied.'",
    }],
    output_format=Ticket,
)

if response.stop_reason in ("refusal", "max_tokens"):
    raise RuntimeError(f"No usable output: {response.stop_reason}")
ticket = response.parsed_output  # a validated Ticket instance
print(ticket.category, ticket.priority)
```

**TypeScript — Claude API**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const Ticket = z.object({
  category: z.enum(["billing", "bug", "feature", "other"]),
  priority: z.enum(["low", "medium", "high"]),
  summary: z.string(),
});

const client = new Anthropic();

const response = await client.messages.parse({
  model: "claude-sonnet-5-5", // model IDs at time of writing
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content: "Triage this ticket: 'I was charged twice for March and support has not replied.'",
    },
  ],
  output_config: { format: zodOutputFormat(Ticket) },
});

if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
  throw new Error(`No usable output: ${response.stop_reason}`);
}
const ticket = response.parsed_output; // null if parsing failed
if (!ticket) throw new Error("Unparseable output");
console.log(ticket.category, ticket.priority);
```

### Business-rule validation with retry

The schema sent to the API uses only supported keywords; the Pydantic / Zod model adds the rule the provider cannot enforce, and the loop feeds the error back.

**Python — Claude API**

```python
import anthropic
from typing import Literal
from pydantic import BaseModel, ValidationError, model_validator

class Refund(BaseModel):
    order_total: float
    refund_amount: float
    reason: Literal["damaged", "late", "wrong_item", "other"]

    @model_validator(mode="after")
    def within_total(self):
        if not 0 <= self.refund_amount <= self.order_total:
            raise ValueError("refund_amount must be between 0 and order_total")
        return self

SCHEMA = {
    "type": "object",
    "properties": {
        "order_total": {"type": "number"},
        "refund_amount": {"type": "number"},
        "reason": {"type": "string", "enum": ["damaged", "late", "wrong_item", "other"]},
    },
    "required": ["order_total", "refund_amount", "reason"],
    "additionalProperties": False,
}

client = anthropic.Anthropic()
messages = [{"role": "user", "content": "Order of 40.00 arrived broken; customer wants a full refund plus 10 for the hassle."}]

for attempt in range(3):
    response = client.messages.create(
        model="claude-sonnet-5-5",
        max_tokens=4096,
        messages=messages,
        output_config={"format": {"type": "json_schema", "schema": SCHEMA}},
    )
    text = next(b.text for b in response.content if b.type == "text")
    try:
        refund = Refund.model_validate_json(text)
        break
    except ValidationError as err:
        messages.append({"role": "assistant", "content": response.content})  # full content, reasoning included
        messages.append({"role": "user", "content": f"That output failed validation:\n{err}\nReturn corrected JSON."})
else:
    raise RuntimeError("Validation failed after 3 attempts; route to a human")
```

**TypeScript — Claude API**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const Refund = z
  .object({
    order_total: z.number(),
    refund_amount: z.number(),
    reason: z.enum(["damaged", "late", "wrong_item", "other"]),
  })
  .refine((r) => r.refund_amount >= 0 && r.refund_amount <= r.order_total, {
    message: "refund_amount must be between 0 and order_total",
  });

const SCHEMA = {
  type: "object",
  properties: {
    order_total: { type: "number" },
    refund_amount: { type: "number" },
    reason: { type: "string", enum: ["damaged", "late", "wrong_item", "other"] },
  },
  required: ["order_total", "refund_amount", "reason"],
  additionalProperties: false,
};

const client = new Anthropic();
const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "Order of 40.00 arrived broken; customer wants a full refund plus 10 for the hassle." },
];

let refund: z.infer<typeof Refund> | undefined;
for (let attempt = 0; attempt < 3 && !refund; attempt++) {
  const response = await client.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 4096,
    messages,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
  const result = Refund.safeParse(JSON.parse(text));
  if (result.success) {
    refund = result.data;
  } else {
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: `That output failed validation:\n${JSON.stringify(result.error.issues)}\nReturn corrected JSON.` });
  }
}
if (!refund) throw new Error("Validation failed after 3 attempts; route to a human");
```

---

## When to use

- **Code consumes the output.** Extraction into database rows, classification into a fixed set, routing decisions, API payloads.
- **You need exact-match evals.** Typed fields make graders simple and deterministic.
- **The model drives another system.** A planner whose steps are executed by code needs a contract, not prose.
- **You are replacing a fragile parser.** Regex-over-prose, stop-sequence tricks, and prefill hacks are signs that native structured outputs would remove a class of bugs.

## When NOT to use

- **Humans read the output.** Summaries, explanations, emails, and chat replies read worse when squeezed through a schema; let the model write prose.
- **You need citations from the same call.** In the Claude API, structured outputs and citations are incompatible; split the work or keep the answer in prose with citations.
- **The schema is a dumping ground.** A 60-field nested object extracted in one call is slower, hits complexity limits, and fails in ways that are hard to debug; split it.
- **You treat the guarantee as validation.** Valid JSON can still be wrong; keep the business-rule checks and the eval.

---

## References

- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — Anthropic's guide: JSON outputs, strict tool use, supported schema features and limits, and incompatibilities
- [Pydantic — Models](https://pydantic.dev/docs/validation/latest/concepts/models/) — `BaseModel`, `model_validate_json`, and `ValidationError`
- [Zod — Basic usage](https://zod.dev/basics) — schemas, `safeParse`, and the structured `issues` you feed back to the model
