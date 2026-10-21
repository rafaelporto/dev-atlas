---
type: concept
tags:
  - concept
  - ai-engineering
related:
  - software-engineering/ai-engineering/context-engineering
  - software-engineering/ai-engineering/structured-outputs
  - software-engineering/ai-engineering/evals
  - software-engineering/ai-engineering/agents
language: null
---

# Prompt Engineering

> Writing the instructions a language model reads — role, task, rules, examples, and structure — so that it does what you meant on the first try, and knowing when to let the model reason before it answers.

---

## What is it?

Prompt engineering is the practice of writing the text you send to a language model so that it reliably produces the output you want. It covers what you say (the task, the rules, the reasons behind them), how you lay it out (sections, tags, examples), and how much thinking you ask for before the answer.

The prompt has two parts in most APIs:

- **System prompt** — standing instructions for the whole conversation: who the model is working for, what the task is, what the output looks like, and which constraints apply.
- **User turn** — the specific input for this request: the document to summarise, the ticket to classify, the question to answer.

Prompt engineering is the first and cheapest lever in the [overview's ladder](overview.md#the-levers-in-order-of-cost). Its sibling, [context engineering](context-engineering.md), decides *what else* the model reads on a call; prompt engineering decides how you ask.

---

## Why does it matter?

A model has no access to the knowledge in your head. It does not know your users, your quality bar, or why a rule exists — only what is in the prompt. Most disappointing outputs are not model failures; they are underspecified requests that the model filled in with a reasonable but wrong guess.

Prompt changes are also the fastest change you can make: no new infrastructure, no new data, a diff of a few lines. That makes prompting the right place to start, and the place where an [eval](evals.md) pays off fastest — because without one, a wording change that fixes one case and breaks three others looks like progress.

---

## How it works

### Write for a brilliant colleague with zero context

The most useful mental model: the reader is a very capable new colleague who has never seen your project. They will do exactly what you ask, competently, and fill gaps with sensible defaults that may not be yours. Anthropic's own test is to show the prompt to a person with minimal context — if they would be confused, the model will be too.

| Vague | Specific |
|---|---|
| "Summarise this ticket." | "Summarise this ticket in two sentences for an on-call engineer deciding whether to wake someone up. Lead with user impact." |
| "NEVER use ellipses." | "The reply is read aloud by a text-to-speech engine, which cannot pronounce ellipses, so do not use them." |
| "Be concise." (when a format is required) | "Return the label on line 1 and one sentence of justification on line 2." |

Two habits do most of the work:

- **Give the reason, not only the rule.** A model generalises from a stated purpose ("the output is read aloud") to cases the rule never named.
- **State the role and audience.** "You triage bug reports for a small open-source CLI; maintainers use your labels to decide what to fix first" sets priorities that a bare "classify this" does not.

Loud emphasis ("CRITICAL", "you MUST") is a holdover from older, less steerable models. Current models follow plain instructions; piling on emphasis makes them over-apply the rule. Say it once, at normal volume, with the reason.

### Few-shot examples

Examples are the strongest signal in a prompt: the model matches their length, tone, and structure more closely than any written instruction. A small set of input/output pairs (*few-shot* or *multishot* prompting) is often the quickest way to pin down a format or a judgement call.

- **How many:** three to five is a good default. One example tends to be copied; a handful lets the model infer the pattern.
- **Make them diverse.** Vary length, phrasing, and edge cases. If every example answer is one sentence, every answer will be one sentence — including the ones that needed three.
- **Watch for over-copying.** Models reuse specific phrases, entities, and even mistakes from examples. Label them as illustrative, keep them realistic, and never put the real answer to the current input in an example.
- **Keep them current.** Examples tuned against an older model freeze that model's quirks into the new one; revisit them when you change models.

### Structure with XML tags

When a prompt mixes instructions, reference data, examples, and the variable input, wrap each kind in its own tag. Tags make boundaries unambiguous — to the model and to the next engineer reading the prompt.

```
<instructions>
Classify the report using the labels below. Reply with the label on line 1
and one sentence of justification on line 2.
</instructions>

<examples>
  <example>
    <report>...</report>
    <answer>...</answer>
  </example>
</examples>

<report>
{the user's bug report goes here}
</report>
```

There are no magic tag names; pick descriptive ones and use them consistently. Tags also make it clear which text is *data*, which matters when that data comes from users — see [Prompt Injection and Guardrails](prompt-injection-and-guardrails.md).

### Shaping the start of the answer

On older models and some other providers, a common trick was **prefill**: writing the first characters of the assistant's reply (for example `{`) so the model continued from there.[^prefill] On current Claude models prefill is no longer supported. Use the replacements instead: [structured outputs](structured-outputs.md) when you need machine-readable output, and a plain system-prompt instruction ("Respond directly, without a preamble") when you only need to skip the introduction.

### Asking the model to reason

Some tasks — multi-step maths, debugging, weighing trade-offs — get better answers when the model works through intermediate steps before committing. There are two ways to get that:

| | Explicit chain-of-thought | Native reasoning ("extended thinking") |
|---|---|---|
| How | The prompt asks the model to write its steps before the answer, e.g. in `<reasoning>` then `<answer>` tags | The model reasons in separate blocks before the visible answer; you enable or tune it with a request parameter |
| Origin | Prompting technique (Wei et al., 2022) | Trained into recent models |
| Cost | Reasoning is ordinary output tokens | Reasoning is billed as output tokens, even when not displayed |
| Control | Wording | A configuration knob (thinking mode, effort level) |
| Best for | Models without native reasoning, or with it turned off | Current reasoning-capable models |

On a model with native reasoning, writing "think step by step" into the prompt is redundant at best. In the Claude API, current models use **adaptive thinking** — the model decides per request whether and how much to think — and you steer depth with the **effort** parameter (`low`, `medium`, `high`, `xhigh`, `max`). Lowering effort is a more reliable way to get less reasoning than asking for it in prose. On several current Claude models, a prompt that asks the model to write out its reasoning in the visible answer may be declined; keep reasoning in thinking blocks instead.

When reasoning pays off:

```
  task needs several dependent steps?  ──no──▶  answer directly (low effort)
              │ yes
              ▼
  model has native reasoning?  ──yes──▶  use thinking; raise effort only if evals show a gain
              │ no
              ▼
  explicit chain-of-thought in tags, then parse <answer>
```

Prompt chaining — splitting a task into several calls where each output feeds the next — is a workflow pattern rather than a prompt technique; see [Agents](agents.md).

---

## Examples

A triage prompt that combines a role, a stated reason, labelled examples, and XML tags separating data from instructions.

**Python — Claude API**

```python
import anthropic

client = anthropic.Anthropic()

SYSTEM = """You triage bug reports for a small open-source command-line tool.
Maintainers use your label to decide what to fix first, so precision matters
more than coverage: when a report is ambiguous, choose needs-info rather than guess.

Labels:
- bug: the tool behaves differently from its documentation
- feature: a request for behaviour the documentation does not promise
- needs-info: cannot be classified without more detail

Reply with the label on line 1 and one sentence of justification on line 2."""

EXAMPLES = """<examples>
<example>
<report>Running `sync --dry-run` deleted files. The docs say dry-run changes nothing.</report>
<answer>bug
Dry-run is documented as read-only but modified the filesystem.</answer>
</example>
<example>
<report>Could `sync` show a progress bar for large folders?</report>
<answer>feature
Asks for new output that the documentation does not describe.</answer>
</example>
<example>
<report>It doesn't work on my machine.</report>
<answer>needs-info
No command, platform, or observed behaviour is given.</answer>
</example>
</examples>"""

report = "After upgrading, `sync` ignores the --exclude flag on Windows paths."

response = client.messages.create(
    model="claude-sonnet-5-5",  # model IDs at time of writing
    max_tokens=2048,
    system=SYSTEM,
    output_config={"effort": "low"},  # a short classification needs little reasoning
    messages=[{
        "role": "user",
        "content": f"{EXAMPLES}\n\n<report>\n{report}\n</report>\n\nClassify the report above.",
    }],
)

for block in response.content:
    if block.type == "text":
        print(block.text)
```

**TypeScript — Claude API**

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM = `You triage bug reports for a small open-source command-line tool.
Maintainers use your label to decide what to fix first, so precision matters
more than coverage: when a report is ambiguous, choose needs-info rather than guess.

Labels:
- bug: the tool behaves differently from its documentation
- feature: a request for behaviour the documentation does not promise
- needs-info: cannot be classified without more detail

Reply with the label on line 1 and one sentence of justification on line 2.`;

const EXAMPLES = `<examples>
<example>
<report>Running \`sync --dry-run\` deleted files. The docs say dry-run changes nothing.</report>
<answer>bug
Dry-run is documented as read-only but modified the filesystem.</answer>
</example>
<example>
<report>Could \`sync\` show a progress bar for large folders?</report>
<answer>feature
Asks for new output that the documentation does not describe.</answer>
</example>
<example>
<report>It doesn't work on my machine.</report>
<answer>needs-info
No command, platform, or observed behaviour is given.</answer>
</example>
</examples>`;

const report = "After upgrading, `sync` ignores the --exclude flag on Windows paths.";

const response = await client.messages.create({
  model: "claude-sonnet-5-5", // model IDs at time of writing
  max_tokens: 2048,
  system: SYSTEM,
  output_config: { effort: "low" }, // a short classification needs little reasoning
  messages: [
    {
      role: "user",
      content: `${EXAMPLES}\n\n<report>\n${report}\n</report>\n\nClassify the report above.`,
    },
  ],
});

for (const block of response.content) {
  if (block.type === "text") console.log(block.text);
}
```

For a hard, multi-step problem the same call would raise `effort` to `high` and leave more room in `max_tokens`, because reasoning counts towards the output limit. The prompt itself would not change: no "think step by step", no reasoning section in the requested output.

---

## When to use

- **Always, first.** Every LLM feature has a prompt; making it clear and specific is the baseline before any other lever.
- **The output format or tone is inconsistent.** A few diverse examples and an explicit output description usually fix it.
- **The model makes a reasonable but wrong assumption.** Add the missing fact or the reason behind the rule.
- **Inputs mix instructions and data.** XML tags remove ambiguity about which text is which.
- **Answers on multi-step problems are shallow.** Turn on or raise native reasoning; fall back to explicit chain-of-thought only on models without it.

## When NOT to use

- **The real gap is missing context.** Rewording cannot conjure facts the model never saw; fix what goes into the window instead — see [Context Engineering](context-engineering.md) and [RAG](rag.md).
- **You have no eval.** Micro-tuning wording against a handful of hand-checked cases chases noise; build an [eval](evals.md) before iterating further.
- **You need a guaranteed machine-readable shape.** Use [structured outputs](structured-outputs.md), not "output ONLY valid JSON" plus regex.
- **You need hard enforcement.** A prompt instruction is a strong suggestion, not a security boundary; permissions and validation belong in code — see [Prompt Injection and Guardrails](prompt-injection-and-guardrails.md).
- **Prose-steering reasoning depth.** On models with native reasoning, "think harder" / "don't overthink" is less reliable than the effort setting.

---

## References

- [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) — Anthropic's living reference: clarity, examples, XML tags, thinking, and migrating away from prefill
- [Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview) — when prompt engineering is the right fix, and why success criteria and tests come first
- [Steering thinking](https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost) — adaptive thinking, effort levels, and why effort beats prose for controlling reasoning
- [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903) — Wei et al., 2022, the paper that introduced explicit chain-of-thought prompting

[^prefill]: In the Claude API, a request whose last message is a partial assistant turn returns a 400 error on current models (Claude 4.6 generation onwards). Older models and some other providers still accept it.
