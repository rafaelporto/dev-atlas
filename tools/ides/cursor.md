---
type: concept
tags:
  - tool
  - ide
related:
  - tools/ides/overview
  - tools/ides/vscode
language: null
---
# Cursor

> A fork of VS Code rebuilt around AI-assisted coding, where an integrated model can read, explain, and edit your codebase through chat and inline commands.

---

## What is it?

Cursor is a code editor forked from [VS Code](vscode.md). It keeps VS Code's interface, extensions, and settings, and adds a layer of AI features: an inline edit command, a chat panel that is aware of your open files and the whole repository, and autocomplete that predicts multi-line edits rather than single tokens. The underlying models are large language models (from providers like Anthropic and OpenAI) accessed through Cursor's service.

Because it is a VS Code fork, most VS Code extensions and keybindings work unchanged — the migration cost is close to zero for an existing VS Code user.

## Why does it matter?

AI coding assistants have moved from novelty to daily tool. Cursor's bet is that the assistant should be *built into* the editor's core rather than bolted on as an extension, so it can index the project, reference files by name, and apply multi-file edits with your review.

For developers already comfortable in VS Code, Cursor offers those capabilities without relearning an editor. The trade-off is that meaningful use requires sending code to an external model, and the strongest features sit behind a paid plan.

## How it works

Cursor indexes the workspace to build a semantic view of the codebase, then uses that index to ground the model's answers in your actual code. Three interaction modes dominate:

```
┌─────────────────────────────────────────────┐
│ Cursor (VS Code fork)                        │
│  ├── Tab      → predictive multi-line edits  │
│  ├── Inline   → "edit this selection" (Cmd+K)│
│  └── Chat     → repo-aware Q&A + agent edits │
│                    │                         │
│                    ▼                         │
│            Cursor service → LLM provider     │
└─────────────────────────────────────────────┘
```

You can attach specific files, folders, or symbols to a chat as context, and an "agent" mode can plan and apply a series of edits across files, which you accept or reject as a diff. A **Privacy Mode** prevents code from being stored server-side, though the code is still transmitted to generate a response.

**Complexity level: Low.** Identical to VS Code to set up; the only new surface is the AI features.

## Getting Started

Download Cursor from [cursor.com](https://cursor.com) and, on first launch, import your VS Code settings and extensions when prompted. Sign in to enable AI features.

Key shortcuts: `Cmd/Ctrl+K` for inline edit, `Cmd/Ctrl+L` for the chat panel, `Tab` to accept a predicted edit. Model selection and privacy settings live in **Cursor Settings**.

| Symptom | Likely cause | Fix |
|---|---|---|
| AI features unavailable | Not signed in, or free quota exhausted | Sign in; check usage in Cursor Settings |
| Suggestions ignore project context | Workspace not indexed, or file not attached | Wait for indexing; attach files/folders to the chat with `@` |
| An extension misbehaves | Version built for newer VS Code API | Check the extension's compatibility; Cursor tracks VS Code releases with a lag |
| Concern about code leaving the machine | Default sends code to the service | Enable **Privacy Mode**; review your organization's policy first |

## Examples

Cursor's configuration is VS Code's — the same `settings.json` shown in the [VS Code article](vscode.md) applies. The distinctive artefact is a **project rules** file that steers the AI:

```
// .cursor/rules/style.mdc
---
description: Project coding conventions
alwaysApply: true
---
- Prefer pure functions; avoid shared mutable state.
- Match the existing file's naming and comment density.
- Do not add dependencies without asking.
```

These rules are prepended to the model's context so generated code follows house style. Keep them short and specific.

## When to use

- You already use VS Code and want AI assistance built into the editor rather than as a separate extension.
- Large codebases where repo-aware chat and multi-file edits save real navigation time.
- Exploratory work, unfamiliar code, or scaffolding where an assistant accelerates the first draft.

## When NOT to use

- Environments where source code must not leave the machine and no compliant model deployment is available.
- When a free, extension-based assistant already meets your needs and the paid tiers are not justified.
- Single-language JVM/.NET work where a dedicated IDE's native analysis matters more than AI chat.

## References

- [Cursor documentation](https://docs.cursor.com)
- [VS Code documentation](https://code.visualstudio.com/docs) (shared foundation)
