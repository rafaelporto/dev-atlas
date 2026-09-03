---
type: concept
tags:
  - concept
  - ai-assisted-development
  - overview
related:
  - software-engineering/ai-assisted-development/spec-driven-development
  - software-engineering/ai-assisted-development/agent-instruction-files
  - software-engineering/ai-assisted-development/writing-a-spec-for-an-ai-agent
  - software-engineering/concepts/tdd
language: null
---

# AI-Assisted Development

> Building software with a coding agent in the loop — what changes, what does not, and which of the two is easier to get wrong.

---

## What is it?

AI-assisted development is writing software with an LLM doing part of the typing. The model reads your prompt and your codebase, proposes code, and — when it runs as an *agent* — edits files, runs commands, and reads the output on its own before proposing the next step.

The label covers a wide range of practices, from asking a chat window for a regex to handing an agent a written specification and reviewing what comes back an hour later. Those are different jobs with different failure modes, which is why it helps to place any given practice on a spectrum rather than argue about "using AI" in general.

---

## Why does it matter?

Two findings frame everything else in this section.

**The cost of producing code fell; the cost of being right did not.** Simon Willison distinguishes *vibe coding* — generating code you do not read — from what he calls agentic engineering: "professional software engineers using coding agents to improve and accelerate their work by amplifying their existing expertise." The distinguishing feature is not the tool. It is whether anyone verified the result.

**AI is an amplifier, not a fix.** DORA's 2025 report (~5,000 respondents, 90% AI adoption) found that AI adoption correlates with *higher* delivery throughput and *higher* instability at the same time. It magnifies whatever a team already has: strong delivery practices get faster, and weak ones ship low-quality work faster. Speed applied to an unverified process is not a productivity gain, it is a larger blast radius.

Together these say something specific: the leverage is real, and it lands on your existing engineering discipline. If there is no discipline for the leverage to land on, the throughput shows up anyway — as rework.

---

## How it works

### The spectrum

```
  vibe coding                                          agentic engineering
       │                                                        │
       ├── generate and ship without reading                    │
       │   (fine for a throwaway script; not for production)    │
       │                                                        │
       ├── generate, read the diff, run the tests               │
       │                                                        │
       ├── plan in conversation, implement in small steps       │
       │                                                        │
       └── write a spec, generate, review, feed back ───────────┤
                                                       verified by a human
                                                       who understands it
```

Nothing on this spectrum is universally correct. The mistake is applying the right-hand end to a one-line fix, or the left-hand end to a payment flow.

### Three layers

Practices in this section stack. Each layer is useful on its own, and each one is cheaper to adopt than the one after it:

```
┌─────────────────────────────────────────────────────────┐
│  3. Verification    tests, review, types, CI            │
│                     the only layer a machine checks     │
├─────────────────────────────────────────────────────────┤
│  2. Specification   what to build, and why              │
│                     per task; see spec-driven-development│
├─────────────────────────────────────────────────────────┤
│  1. Persistent      build commands, conventions,        │
│     context         boundaries; see agent-instruction-  │
│                     files                               │
└─────────────────────────────────────────────────────────┘
```

Read the stack bottom-up for adoption order and top-down for importance. Layer 1 costs an afternoon and pays back on every task. Layer 2 costs per task and needs sizing judgement. Layer 3 is the one you cannot skip: a specification is prose, and prose does not fail a build.

### The learning loop

Unmesh Joshi describes the cycle that turns activity into competence:

```
   observe & understand  ──▶  experiment & try  ──▶  recall & apply
          ▲                                                │
          └────────────────────────────────────────────────┘
```

An agent that hands you a finished answer removes the middle step — the part where you break things and find out why. Joshi's argument is that there are no shortcuts here, and that skipping the loop defers a cost rather than avoiding it:

- **Illusion of speed** — velocity is high while the work stays inside the well-trodden case, then collapses when a requirement steps outside it.
- **Deskilling and the maintenance cliff** — without internalised knowledge of the design, "what seems like a small change becomes a time-consuming black-hole," consuming the time the generation saved.
- **No domain learning** — most real difficulty is in the business context, which is exactly the part a general model has never seen. Generated code delivers the functionality "without the learning, leaving zero internalized knowledge."

This is not an argument against using agents. It is an argument for noticing which code you need to *understand* versus merely *have*, and for keeping the loop intact on the former.

---

## Examples

A repository set up for the three layers has all of them in version control, next to the code:

```
my-service/
├── AGENTS.md              # layer 1 — persistent context for any agent
├── specs/
│   └── 004-export-report/
│       ├── requirements.md   # layer 2 — what and why
│       └── tasks.md          #           broken down, traceable
├── src/
├── tests/                 # layer 3 — the part that actually verifies
└── .github/workflows/ci.yml
```

Sizing is the judgement that governs all three. Kiro's own documentation draws the line at the low end — use plain chat for "typos, simple logic errors, or well-understood one-line changes" — and reserves the full specification workflow for complex or compliance-sensitive work:

```
one-line fix ─────────▶ conversation, read the diff, run the tests
small, well-understood ▶ short spec or none; implement in small steps
large or regulated ────▶ full spec, approval gates, task breakdown
```

---

## When to use

- **Work you can verify.** There is a test suite, a type checker, a reviewer, or a runnable result that tells you whether the output is right.
- **Breadth outside your fluency.** Translating clear intent into a language, framework, or config format you know less well.
- **Mechanical volume.** Repetitive refactors, boilerplate, test scaffolding, migration of a known pattern across many files.
- **Exploration before commitment.** Standing up two throwaway approaches to see which one you prefer, then discarding both.
- **Existing delivery discipline.** Per DORA, the leverage lands on your practices — so it lands best where CI, review, and small changes already exist.

## When NOT to use

- **Tasks smaller than the process.** A typo or a one-line fix does not need a spec, a plan, or a task breakdown. The ceremony costs more than the change.
- **Code you need to learn, not just obtain.** If the point is to understand a subsystem, a domain, or a new technology, generating the answer defeats the point — the learning loop charges interest either way.
- **Domains you cannot check.** If you cannot tell a correct result from a plausible one — an unfamiliar regulatory rule, a numerical method, a security boundary — generation produces confident output with no error signal.
- **As a substitute for verification.** No amount of specification, prompting, or process replaces tests and human review. Prose does not compile.
- **Where the input cannot leave.** Customer PII, biometrics, credentials, and regulated data are governed by policy, not convenience.

---

## References

- [The Learning Loop and LLMs](https://martinfowler.com/articles/llm-learning-loop.html) — Unmesh Joshi, on why shortcutting the loop defers rather than avoids the cost
- [Agentic Engineering Patterns](https://simonwillison.net/2026/Feb/23/agentic-engineering-patterns/) — Simon Willison, distinguishing agentic engineering from vibe coding
- [DORA — State of AI-assisted Software Development 2025](https://dora.dev/dora-report-2025/) — AI as amplifier: throughput and instability rise together
- [Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) — Birgitta Böckeler
- [Kiro — Specs best practices](https://kiro.dev/docs/specs/best-practices/) — official guidance on when a spec is the wrong tool
