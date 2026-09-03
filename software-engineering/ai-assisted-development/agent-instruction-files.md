---
type: concept
tags:
  - concept
  - ai-assisted-development
related:
  - software-engineering/ai-assisted-development/overview
  - software-engineering/ai-assisted-development/spec-driven-development
  - software-engineering/ai-assisted-development/writing-a-spec-for-an-ai-agent
language: null
---

# Agent Instruction Files

> A checked-in Markdown file that tells any coding agent how your project builds, tests, and expects to be changed — the cheapest part of an AI-assisted practice to adopt, and the easiest to overfill.

---

## What is it?

An agent instruction file is a plain Markdown file in your repository that a coding agent reads automatically before it starts work. It holds the things the agent would otherwise have to guess: how to build, how to run the tests, which conventions the codebase follows, and what it must not touch.

The open format for this is **`AGENTS.md`**, described by its own documentation as "a simple, open format for guiding coding agents" and, more memorably, as "a README for agents: a dedicated, predictable place to provide the context and instructions to help AI coding agents work on your project." It is used by over 60,000 open-source projects, and in December 2025 it was donated to the Linux Foundation's newly formed Agentic AI Foundation alongside MCP and goose.

Vendor-specific and tool-specific variants implement the same idea:

| Name | Where it comes from | Notes |
|---|---|---|
| `AGENTS.md` | Open format, Agentic AI Foundation | The reference format; read by many agents and editors |
| `CLAUDE.md` | Anthropic's Claude Code | Same role, tool-specific filename |
| `constitution` | GitHub spec-kit | "Immutable" project principles applied to every change |
| steering files | Amazon Kiro | `product.md`, `tech.md`, `structure.md` — split by concern |

Different filenames, one mechanism: **standing instructions, read on every task, versioned with the code.**

---

## Why does it matter?

Of everything in the [spec-driven development](spec-driven-development.md) toolkit, this layer has the best return for the effort. A specification is written per task and thrown away or maintained at a cost; an instruction file is written once and pays back on every prompt, in every session, for every person on the team — and it works whether or not you adopt any staged spec workflow at all.

It also solves a problem specific to agents: **context does not persist.** A new session starts blind. Without a file like this, every developer re-explains the same build command, and the agent re-derives the same conventions from whatever files it happened to read first — differently each time. The instruction file makes that derivation deterministic and reviewable, because it is a diff like any other.

The secondary benefit is that it is honest documentation. Unlike a README written for a launch and never revisited, an instruction file that is wrong produces visibly wrong agent behaviour, which is a feedback signal a stale README never gets.

---

## How it works

### Nearest file wins

`AGENTS.md` files nest. An agent reads the closest one to the file it is editing, so a monorepo gives each package its own — OpenAI's own repository has 88 of them. The resolution order in practice:

```
   explicit instruction in the chat        ← highest precedence
              │
              ▼
   AGENTS.md nearest the edited file       ← packages/api/AGENTS.md
              │
              ▼
   AGENTS.md at the repository root        ← AGENTS.md
              │
              ▼
   user-level / global configuration       ← lowest precedence
```

The documentation is explicit that "explicit user chat prompts override everything," and that when files conflict, "the nearest AGENTS.md to the edited file takes priority." That gives you a usable pattern: **the root file holds what is true everywhere; a nested file holds only what differs.**

### There is no prescribed schema

This is worth stating plainly, because a lot of secondary writing about `AGENTS.md` invents structure it does not have. The format has **no required fields**: "AGENTS.md is just standard Markdown. Use any headings you like." The site *suggests* topics — project overview, build and test commands, code style, testing instructions, security considerations, commit and PR conventions, deployment steps — but they are suggestions, not a schema.

The practical consequence: do not spend effort matching a template. Spend it on making each line true and checkable.

### What belongs in it, and what does not

| Include | Leave out |
|---|---|
| Build, test, lint, and run commands — verbatim | Anything the code already states unambiguously |
| Conventions a reader cannot infer from one file | Secrets, tokens, credentials, connection strings |
| Boundaries: what not to edit, what not to commit | Personal data, customer data, internal URLs |
| Where things live, when the layout is unusual | Long prose about architecture — link to a doc instead |
| Non-obvious gotchas that cost someone an hour | Aspirational rules nobody follows or checks |

The last row on each side is the one people get wrong. A gotcha ("integration tests need the container running, `make up` first") is high-value because it is unguessable. An aspiration ("always write clean, maintainable code") is noise: it consumes context, cannot be checked, and teaches the reader nothing.

---

## Examples

A lean root file. Every line is either a command or a constraint:

````markdown
# AGENTS.md

## Build and test

```bash
make deps          # install dependencies
make test          # unit tests — must pass before any commit
make test-int      # integration tests; needs `make up` running first
make lint          # golangci-lint; CI fails on any warning
```

## Conventions

- Errors are wrapped with `fmt.Errorf("...: %w", err)` — never discarded.
- Public functions carry a doc comment; private ones only when non-obvious.
- No new dependencies without a note in the PR description explaining why.

## Boundaries

- `internal/generated/` is generated by `make codegen`. Do not edit by hand.
- Database migrations are append-only. Never modify a committed migration.
- Do not change `deploy/` — infrastructure is owned by another team.
````

A nested file that states only the delta:

```markdown
# AGENTS.md — packages/web

Overrides the root file for this package only.

- Tests run with `pnpm test` here, not `make test`.
- This package targets the browser: no Node built-ins, no `fs`.
- Styling uses CSS modules. Do not introduce a second styling approach.
```

Kiro splits the same content across three steering files by concern, which is worth copying when a single file grows past a screen or two:

```
.kiro/steering/
├── product.md      # what this product is for, who uses it
├── tech.md         # stack, versions, build and test commands
└── structure.md    # where code lives and why
```

Kiro also makes the length problem explicit through **inclusion modes**: these three load on every interaction by default, but additional steering files can be set to load only when the edited file matches a pattern, only on an explicit `#filename` reference, or only when the request matches the file's description. That is the right instinct to borrow even without the tooling — context that is not relevant to the current task is not free.

---

## When to use

- **Every repository an agent touches.** The cost is one file; the payback starts on the first prompt.
- **Monorepos**, where per-package files carry the differences and the root file carries the shared truth.
- **Unguessable local setup** — a build step, a required service, a non-standard test command.
- **Hard boundaries** you need respected: generated directories, append-only migrations, code owned by another team.
- **Before adopting any spec workflow.** This layer works standalone; the staged workflows in [spec-driven development](spec-driven-development.md) assume something like it already exists.

## When NOT to use

- **As a substitute for enforcement.** A rule nobody checks is decoration. If it matters, put it in CI, a linter, or a type — the instruction file states conventions, it does not enforce them.
- **When you expect it to guarantee compliance.** It will not. Böckeler's runs showed agents ignoring elaborate templates and checklists outright — duplicating classes that already existed — and sometimes over-following instructions into unintended consequences. Larger context windows are not obedience.
- **As a place to accumulate rules indefinitely.** The Thoughtworks Radar's standing reservation about this whole category is that hand-crafting detailed rules for AI "ultimately doesn't scale." Every line competes for attention with every other line; a file nobody prunes stops working long before anybody notices.
- **For anything sensitive.** Instruction files are committed, shared, and often published. No credentials, no personal data, no customer data — ever.
- **To restate the code.** If a reader can learn it from one glance at the source, the file does not need to say it.
- **As architecture documentation.** Link to the document; do not inline it. This file is read on every task, and length is a real cost.

---

## References

- [AGENTS.md](https://agents.md/) — the official format: "a README for agents", nearest-file precedence, no required fields
- [Linux Foundation announces the Agentic AI Foundation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation) — AGENTS.md donated alongside MCP and goose, December 2025
- [Understanding Spec-Driven-Development: Kiro, spec-kit, and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) — Birgitta Böckeler, on constitutions, steering files, and the illusion of control
- [Kiro — Steering](https://kiro.dev/docs/steering/) — Amazon's split of standing context into product, tech, and structure, plus its inclusion modes
- [github/spec-kit](https://github.com/github/spec-kit) — the `constitution` command and its role as a project-wide rules layer
- [Spec-driven development](https://www.thoughtworks.com/radar/techniques/spec-driven-development) — Thoughtworks Technology Radar Vol. 34, on why hand-crafted rule sets do not scale
