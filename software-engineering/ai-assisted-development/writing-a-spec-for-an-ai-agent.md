---
type: how-to
tags:
  - concept
  - ai-assisted-development
related:
  - software-engineering/ai-assisted-development/spec-driven-development
  - software-engineering/ai-assisted-development/agent-instruction-files
  - software-engineering/ai-assisted-development/overview
  - software-engineering/concepts/tdd
language: null
---

# How to Write a Spec for an AI Agent

> Size the task before you write anything, state the what and the why without deciding the how, then put back into the spec whatever the implementation taught you.

---

## Prerequisites

- A **version-controlled repository**. Every step below assumes you can read a diff and throw one away.
- A **coding agent** that can read files, edit them, and run commands.
- A **test suite that runs**, with a single documented command. This is the only part of the loop a machine verifies; without it the rest is proofreading.
- An **[agent instruction file](agent-instruction-files.md)** at the repository root, holding build and test commands, conventions, and boundaries. Standing context does not belong in a per-task spec.
- Optionally, an SDD tool. The commands below use `spec-kit` and `openspec` as **illustrations of one implementation** — none of the steps require either. The workflow is the point; the CLI is not.

---

## Steps

### 1. Size the task before writing a spec

Do this first. No official tool puts sizing at the front of its workflow — spec-kit begins at `constitution`, Kiro at `requirements` — and the most consistent complaint about SDD in practice is the result: process applied to work that did not ask for it. Böckeler watched a small bug become four user stories and sixteen acceptance criteria.

Decide before you type:

| The task is… | Do this | Do not |
|---|---|---|
| A typo, a one-line fix, a well-understood logic error | Say it in chat, read the diff, run the tests | Write a spec |
| Small and well understood, a few files | A short spec, or a plan in conversation; implement in small steps | Generate a full requirements/design/tasks set |
| Large, multi-session, or compliance-sensitive | The full workflow, with review between phases | Skip the approval gates |
| A change to an existing system | A **delta** — what changes, what stays | Re-specify working behaviour |

Kiro's own documentation draws the low end of this line: use plain chat for "typos, simple logic errors, or well-understood one-line changes."

### 2. Write the what and the why — not the how

Two or three paragraphs and a handful of acceptance criteria. Implementation decisions do not belong here; they belong in step 4, where they can be argued about separately.

```bash
# spec-kit
specify "Analysts can export the current report view as CSV,
         including active filters, so they can share numbers
         with people who lack tool access."
```

```bash
# openspec — a change proposal against the spec that already exists
openspec proposal add csv-export
```

Write acceptance criteria in a form that is checkable rather than admirable:

```markdown
1. GIVEN a report with active filters
   WHEN the user exports
   THEN only the rows matching the current filters appear in the file.

2. GIVEN a report with no rows
   WHEN the user selects "Export as CSV"
   THEN the export control is disabled and a message explains why.
```

If a criterion cannot fail, it is not a criterion. Delete it.

### 3. Run one clarification pass

Ask the agent what is ambiguous, then answer it in the spec — not in chat, where the answer is lost on the next session.

```bash
# spec-kit
/clarify
```

Read the questions carefully rather than answering them fast. They are a free review of your own thinking, and a question you cannot answer is usually a decision you have not made.

### 4. Only now: plan and tasks

Design after the "what" is settled, then break it into units small enough to review individually, each traceable to a requirement.

```bash
# spec-kit
/plan     # stack, architecture, data flow, error handling
/tasks    # small, reviewable, testable units
```

Check the task list against the requirements before implementing: every requirement should have at least one task, and every task should name the requirement it serves. Tasks with no requirement are scope you did not agree to.

### 5. Implement in small increments, with tests

Do not hand over the whole task list and come back later. Take a task or two, get them green, review the diff, then continue.

```bash
# spec-kit
/implement

# then, every increment:
make test        # or whatever your instruction file documents
git diff         # read it — all of it
```

This is where the spec earns its cost or does not. [TDD](../concepts/tdd.md) fits naturally here: the test is the one specification that fails on its own when the code drifts, and Simon Willison reports that red/green TDD "helps agents write more succinct and reliable code with minimal extra prompting."

### 6. Feed back what the implementation taught you

**This is the step that separates SDD from waterfall,** and the one every tool leaves to you. Kent Beck's objection to SDD is precisely that most descriptions of it assume you will learn nothing while building: "implementation is where the spec discovers what it should have said."

So after each increment, ask what you now know that the spec does not, and correct the spec — a missing edge case, a constraint that turned out to be wrong, an acceptance criterion that could not be met as written. Martin Fowler's framing is the goal to optimise for: the point of AI in development is "how to use it to accelerate the feedback loops," not how to avoid them.

If you find yourself resisting a spec edit because the spec is already approved, that is the waterfall failure arriving on schedule.

### 7. Decide the spec's fate explicitly

When the work lands, choose — and say which you chose, because a spec left in limbo is the worst of both options:

- **spec-first** — archive or delete it. It did its job guiding the change; the code and tests are now the truth.
- **spec-anchored** — keep it, and accept the maintenance. It must be updated by the next change to this behaviour, or it becomes confidently wrong documentation.

```bash
# openspec — fold the delta into the living spec
openspec archive csv-export
```

Default to spec-first unless something concrete justifies the upkeep: a regulated domain, a long-lived contract, or a genuine second audience for the intent.

---

## Verification

You are done when all of the following hold — not when the agent says it finished:

```bash
make test        # green, including the tests for the new behaviour
make lint        # clean
git diff --stat  # the change set is what the tasks described, and no more
```

Then check by hand:

- **Every requirement has a task, and every task has a requirement.** No orphans in either direction.
- **The diff contains no unrequested change.** Drive-by refactors, new dependencies, and reformatted files are scope you did not agree to; split or revert them.
- **A human read the whole diff.** Not skimmed. If it is too large to read, the increment was too large.
- **The spec matches what shipped.** If it does not, either fix the spec (step 6) or, if you are archiving it, note the divergence in the commit message.

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| The spec is too long to review; you would rather read the code | The workflow was applied to a task that did not need it — the sledgehammer case | Go back to step 1. Delete the spec, do it in conversation, or keep only the acceptance criteria |
| The agent duplicated a class or function that already exists | It never read the existing code; templates and checklists do not enforce compliance | Name the existing module in the spec explicitly; add an `Unchanged` / "do not touch" section; state boundaries in the instruction file |
| Spec and code have drifted apart | spec-anchored was chosen implicitly, then nobody maintained it | Decide (step 7): archive it, or make updating it part of the definition of done for that area |
| A small bug turned into sixteen acceptance criteria | The tool has one workflow size and it is not the size of your task | Use the tool's lightweight path (Kiro's Quick Spec, plain chat) or abandon the tool for this change |
| Regenerating from the same spec produces different code | LLM non-determinism — the failure mode of `spec-as-source` | Do not treat generated code as disposable. Commit and review the code as the artefact it is |
| The agent followed an instruction into an absurd outcome | Over-compliance: a rule stated without its boundary | Add the boundary, or delete the rule. Rules nobody checks belong in CI, not in prose |
| Requirements quietly contain implementation decisions | The separation is genuinely hard and no tool enforces it | Ask, of each line: could a reviewer who will not write this code judge it? If not, move it to the plan |

---

## References

- [Kiro — Specs best practices](https://kiro.dev/docs/specs/best-practices/) — official guidance on choosing between chat, a quick spec, and a full spec
- [github/spec-kit](https://github.com/github/spec-kit) — the `specify`, `clarify`, `plan`, `tasks`, `implement` commands used above
- [OpenSpec](https://openspec.dev/) — the `propose → apply → archive` delta workflow
- [Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) — Birgitta Böckeler, source of the sledgehammer and review-burden findings
- [Fragments: January 8](https://martinfowler.com/fragments/2026-01-08.html) — Martin Fowler on Kent Beck's critique and on feedback loops
- [Agentic Engineering Patterns](https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/) — Simon Willison on red/green TDD with agents
