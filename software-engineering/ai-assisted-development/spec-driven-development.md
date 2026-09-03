---
type: concept
tags:
  - concept
  - ai-assisted-development
related:
  - software-engineering/ai-assisted-development/overview
  - software-engineering/ai-assisted-development/agent-instruction-files
  - software-engineering/ai-assisted-development/writing-a-spec-for-an-ai-agent
  - software-engineering/concepts/tdd
language: null
---

# Spec-Driven Development (SDD)

> Writing down what you want before letting a coding agent build it — useful while the specification stays cheap to change, and waterfall the moment it does not.

---

## What is it?

Spec-driven development is the practice of writing a description of what you want built *before* asking an AI coding agent to generate the code, and treating that description — not the prompt — as the artefact you review and revise.

The term arrived with a set of tools in 2025 (Amazon's **Kiro**, GitHub's **spec-kit**, the **Tessl Framework**, and the open-source **OpenSpec**), each of which walks you through a staged workflow: describe the requirements, agree on a design, break it into tasks, then let the agent implement.

It is worth being blunt about the state of the term. Birgitta Böckeler, who examined the three original tools for `martinfowler.com`, found that SDD "isn't very well defined yet, and it's already semantically diffused" — many people now use *spec* as a synonym for *detailed prompt*. So when someone says they practise SDD, the useful question is not whether they write specs. It is **what happens to the spec after the code exists**, which is the axis the rest of this article turns on.

---

## Why does it matter?

The motivating failure is familiar to anyone who has prompted an agent for a non-trivial feature: you describe a goal, and you get back code that, in GitHub's own words, "looks right, but doesn't quite work." GitHub's diagnosis is that developers treat coding agents like search engines when they behave more like "literal-minded pair programmers" — very good at pattern completion, and entirely dependent on you having stated the thing you actually wanted.

A written specification attacks that in three ways:

- **It forces the ambiguity out early.** The questions a reviewer would raise in code review get raised while changing the answer is still cheap.
- **It gives the agent a stable target.** The spec is context that survives a compaction, a new session, or a different model.
- **It gives the review something reviewable.** A diff shows you what changed; a spec shows you what was *supposed* to change.

The counterweight is the DORA 2025 finding that AI is an amplifier: it raises throughput and instability together, and teams with weak processes "ship low-quality work… only faster." That cuts both ways here. It is the strongest argument for adding *some* discipline to agent-assisted work — and the strongest warning that the discipline has to come from your practices, not from installing a tool that generates more Markdown.

---

## How it works

### The common workflow

All the SDD tools implement variations on one pipeline. Names differ; the shape does not:

```
   ┌──────────────────────┐
   │ constitution /       │  Standing rules for the whole project.
   │ steering             │  Written once, read on every task.
   └──────────┬───────────┘  (see: agent-instruction-files)
              │
              ▼
   ┌──────────────────────┐
   │ specify              │  What to build and why. No implementation
   │  → requirements.md   │  decisions. User stories, acceptance criteria.
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │ clarify              │  The agent asks about what you left ambiguous.
   │                      │  Optional in spec-kit; a phase of its own in Kiro.
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │ plan                 │  How to build it. Stack, architecture,
   │  → design.md         │  data flow, error handling.
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │ tasks                │  Small, reviewable, testable units,
   │  → tasks.md          │  each traceable back to a requirement.
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │ implement            │  The agent works the task list. You review
   │                      │  the output of each phase.
   └──────────────────────┘
```

Kiro puts explicit **approval gates** between requirements, design, and tasks — you confirm each before the next is generated. spec-kit exposes the same stages as slash commands, plus `analyze` for cross-artefact consistency and a `constitution` of "immutable" project principles. OpenSpec compresses the whole thing into `propose → apply → archive`.

### The three levels

This is the distinction that makes the topic tractable. Böckeler separates what the tools mean by "spec-driven" into three levels, and they carry very different costs:

| Level | What it means | What it buys | What it costs |
|---|---|---|---|
| **spec-first** | The spec guides one round of generation, then is discarded. Code remains the primary artefact. | Ambiguity surfaced early; a reviewable statement of intent; better first-pass output. | Writing time on every task, and the judgement to skip it when the task is small. |
| **spec-anchored** | The spec survives delivery and evolves with the code as a living contract. | Durable intent for long-lived or regulated systems; onboarding context; a place where "why" lives. | Two artefacts to keep in sync. Nothing enforces the sync, so drift is the default outcome. |
| **spec-as-source** | The spec *is* the source. Code is generated and disposable — marked `GENERATED FROM SPEC — DO NOT EDIT`. | In theory: edit intent, regenerate implementation, never touch code. | LLM non-determinism. The same spec regenerates into different code. |

All the reviewed tools support spec-first. Spec-anchored is where most of them *aspire* to be and none of them convincingly land — spec-kit's branch-per-spec structure, for instance, reads as spec-first regardless of its "living, executable artifacts" language. Only Tessl explicitly pursues spec-as-source.

### Why spec-as-source is the hard one

Böckeler draws the parallel that anyone who lived through the 1990s will recognise: **Model-Driven Development**. MDD also promised code generated from a formal higher-level description, and it failed for business applications because it "sits at an awkward abstraction level and just creates too much overhead and constraints."

SDD relaxes MDD's worst constraint by replacing formal models with natural language. But, in her words, "the price for that is LLMs' non-determinism." In practice, regenerating from an unchanged Tessl spec produced *different* code, and getting reproducibility back meant refining the spec until it pinned the implementation down — which is the road back to writing code, in a worse notation.

The risk, then, is not that spec-as-source is unambitious. It is that it can inherit MDD's rigidity *and* the LLM's unpredictability at once. Böckeler reaches for the German word for exactly this: **Verschlimmbesserung** — an improvement that makes things worse.

### The objection you have to answer

The sharpest critique is Kent Beck's, and it is not about specs — it is about *when*. Writing the whole specification before implementing, he argues, "encodes the (to me bizarre) assumption that you aren't going to learn anything during implementation that would change the specification." His formulation is the one to remember:

> **"Implementation is where the spec discovers what it should have said."**

Martin Fowler endorses the point and generalises it: the belief that "if only we could get the specification 'right', the rest of this would be easy" has been "the constant background siren to my career in tech." His conclusion is the resolution of this whole article — "the key to making full use of AI in software development is how to use it to accelerate the feedback loops," not how to remove them.

So the load-bearing rule is this: **a specification is useful only while it is cheap to change.** SDD that locks the spec before implementation is waterfall with a Markdown renderer. SDD that uses the spec to *shorten* the loop — small spec, implement, learn, correct the spec — is Extreme Programming with one extra artefact. The word "spec" tells you nothing about which one you are doing; the size of the spec and what you do with what you learned tell you everything.

---

## Examples

### A requirement, in the structured form the tools use

Kiro's `requirements.md` combines a user story with `GIVEN/WHEN/THEN` acceptance criteria — the same shape BDD has used for years:

```markdown
## Requirement 1 — Export a report

**User story:** As an analyst, I want to export a report as CSV so that
I can share the numbers with people who do not have access to the tool.

### Acceptance criteria

1. GIVEN a report with at least one row
   WHEN the user selects "Export as CSV"
   THEN a CSV file downloads containing the header row and all visible rows.

2. GIVEN a report with active filters
   WHEN the user exports
   THEN only the rows matching the current filters appear in the file.

3. GIVEN a report with no rows
   WHEN the user selects "Export as CSV"
   THEN the export control is disabled and a message explains why.
```

Note what is absent: no file format library, no endpoint, no streaming decision. Those belong in the design phase. Keeping them out is what makes the requirement reviewable by someone who is not going to write the code — and the profession's historical record at maintaining that separation is, as Böckeler notes, not good.

### Tasks traceable back to requirements

```markdown
## Tasks

- [ ] 1. Add CSV serialisation for a report row set
      _Requirements: 1.1, 1.2_
- [ ] 2. Add the export control to the report toolbar
      _Requirements: 1.1, 1.3_
- [ ] 3. Disable the control when the row set is empty
      _Requirements: 1.3_
- [ ] 4. Apply active filters to the exported set
      _Requirements: 1.2_
```

The `_Requirements:_` back-references are the useful part. They are what lets you check, at review time, that every requirement has a task and every task has a reason to exist.

### Full spec vs. spec delta

For an existing system, the full-spec approach fights you: the current behaviour is already implemented, so a complete specification is mostly re-description. OpenSpec instead works in **deltas** — a change proposal against the spec that already exists:

```bash
# A change proposal, not a from-scratch specification
openspec proposal add csv-export     # describe only what changes
openspec apply csv-export            # implement the delta
openspec archive csv-export          # fold it into the living spec
```

```markdown
## Change: add CSV export

### Added
- Analysts can export the current report view as CSV.

### Modified
- The report toolbar gains an export control, disabled for empty results.

### Unchanged
- Filtering, pagination, and permissions behave exactly as before.
```

The `Unchanged` section is doing real work: it is how you tell an agent what *not* to touch, in a codebase where "everything else" is too large to enumerate.

---

## When to use

- **Greenfield work and new features.** GitHub scopes its own toolkit to greenfield projects, feature additions, and legacy modernisation — that is the claim its authors are willing to make, and it is a reasonable place to start.
- **Regulated or compliance-sensitive changes,** where an approval gate between "what" and "how" is something you want anyway, and where a written, reviewed intent has value beyond guiding the agent.
- **Work too large for one conversation.** If the task will not fit in a session — many files, several days, a stable target across model or context resets — the spec is what carries the intent across the boundary.
- **Where the spec is a team alignment artefact.** When a second person, a product owner, or a future maintainer needs to agree on the "what" before anyone commits to the "how".
- **On an existing codebase, in delta form.** Describe the change, not the system. Full re-specification of working software is mostly wasted motion.

## When NOT to use

- **Typos, simple logic errors, and well-understood one-line changes.** This is Kiro's own guidance, and it matters because the tools do not enforce it: Böckeler watched a small bug inflate into four user stories and sixteen acceptance criteria — "using a sledgehammer to crack a nut."
- **When reviewing the spec costs more than reviewing the code.** spec-kit generated files that were redundant with each other and with the existing code, prompting the verdict every reviewer should be allowed to reach: "I'd rather review code than all these markdown files."
- **UI and other work where taste beats description.** Peter Steinberger, who abandoned SDD after using it, deliberately *under*-specifies interface work and iterates in real time; "designing a big spec, then let the model build it… IMO that's the old way of thinking about building software."
- **When the spec is frozen before implementation.** See Beck, above. If nothing you learn while building is allowed back into the spec, you have adopted waterfall and blamed the agent for the outcome.
- **`spec-as-source` for business applications.** Non-determinism plus MDD's abstraction problem. Interesting as an experiment; not a practice to bet a product on today.
- **As a replacement for tests or code review.** A spec is prose: nothing executes it, nothing fails when it drifts from reality. [TDD](../concepts/tdd.md) remains the only specification a machine checks for you on every commit — which is why the two complement each other rather than compete.
- **As a way to buy control you do not have.** Templates, checklists and constitutions create a strong impression of control that the agents do not always honour: in Böckeler's runs, spec-kit's agent duplicated existing classes and treated research notes as new requirements. Larger context windows are not instruction compliance.

---

## References

- [Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) — Birgitta Böckeler; the three levels, the MDD parallel, and hands-on findings
- [Fragments: January 8](https://martinfowler.com/fragments/2026-01-08.html) — Martin Fowler on Kent Beck's critique and on accelerating feedback loops
- [The Learning Loop and LLMs](https://martinfowler.com/articles/llm-learning-loop.html) — Unmesh Joshi
- [Spec-driven development with AI](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) — GitHub's official introduction to spec-kit
- [github/spec-kit](https://github.com/github/spec-kit) — the toolkit and its workflow commands
- [Kiro — Specs](https://kiro.dev/docs/specs/) and [Specs best practices](https://kiro.dev/docs/specs/best-practices/) — Amazon's official documentation, including when *not* to use a spec
- [OpenSpec](https://openspec.dev/) — lightweight, tool-agnostic SDD built around spec deltas
- [Spec-driven development](https://www.thoughtworks.com/radar/techniques/spec-driven-development) — Thoughtworks Technology Radar Vol. 34 (November 2025), ring: **Assess**
- [Just Talk To It — the no-bs Way of Agentic Engineering](https://simonwillison.net/2025/Oct/14/agentic-engineering/) — Simon Willison's notes on Peter Steinberger's case against SDD
- [DORA — State of AI-assisted Software Development 2025](https://dora.dev/dora-report-2025/)
