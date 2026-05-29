# Claude Instructions — dev-atlas

## Project Overview

**dev-atlas** is a personal, open-source knowledge base for software engineering. It is a structured Markdown wiki — not a blog, not a course, not a project with runnable code. Its purpose is to document core concepts, architectural patterns, design patterns, and tools in a consistent, linkable format.

There is no build system, no package manager, and no runtime **for the content itself**. The only content artefacts are Markdown files.

The repository **also includes a local TypeScript MCP server in `mcp-server/`** that exposes this knowledge base to AI agents (Claude Code and other MCP clients). The MCP server is tooling, not content — it has its own build system and runtime, isolated to its subdirectory. See `mcp-server/README.md`.

---

## Language

- All content (article text, headings, code comments, identifiers) must be in **English**.
- Code examples follow these rules by topic:
  - **Language articles** (anything under `languages/<lang>/`) — write all examples in the directory's language. E.g. articles under `languages/go/` use Go, `languages/swift/` uses Swift, `languages/dart/` and `languages/flutter/` use Dart, `languages/react/` uses TypeScript with JSX (unless the article is specifically about plain JavaScript).
  - **Mobile architecture articles** (anything under `software-engineering/architecture/mobile/` or explicitly about mobile development) — provide examples in **Swift**, **Kotlin**, and **Flutter (Dart)**, one block per language.
  - **All other articles** — ask the user which language to use before writing any code example.

---

## Folder Structure

```
dev-atlas/
├── README.md                       # Root index — navigation table for all sections
├── _templates/                     # Article templates — NOT content, never link from README
│   ├── concept.md
│   ├── how-to.md
│   └── tags.md                     # Tag vocabulary — validated by the MCP server at startup
├── mcp-server/                     # Tooling — TypeScript MCP server (see mcp-server/README.md)
├── software-engineering/
│   ├── README.md                   # Section index
│   ├── architecture/
│   │   └── mobile/                 # Mobile-specific architectural patterns (MVC, MVP, MVVM, MVI, VIPER, Clean, Modular)
│   ├── concepts/
│   │   ├── solid/                  # The five SOLID principles
│   │   └── pragmatic-principles/   # DRY, KISS, YAGNI
│   ├── databases/
│   │   ├── concepts/
│   │   ├── engines/
│   │   └── types/                  # Relational, document, key-value, graph, time-series, etc.
│   └── design-patterns/
│       ├── behavioral/
│       ├── creational/
│       └── structural/
├── languages/
│   ├── dart/
│   ├── flutter/
│   ├── go/
│   ├── react/
│   └── swift/
└── tools/
    ├── ci-cd/
    ├── code-quality/
    ├── containerization/
    ├── iac/
    ├── local-dev/
    ├── observability/
    └── orchestration/
```

All three top-level content sections (`software-engineering/`, `languages/`, `tools/`) exist and are actively populated. Do not create a fourth top-level **content** section without explicit user request.

The `mcp-server/` directory is **tooling**, not content. It contains the local MCP server that exposes the wiki to AI agents. `mcp-server/node_modules/`, `mcp-server/dist/`, `mcp-server/package-lock.json`, `mcp-server/audit-report.md`, and any local `.npmrc` files are in `.gitignore`. The lock file is ignored on purpose: it would expose the npm registry where dependencies were downloaded; in a public repo, we do not share that information. Reviews focus on `mcp-server/src/`. (Trade-off: future installs may resolve transitive versions differently — acceptable in this personal-tooling context.)

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| File names | kebab-case, `.md` extension | `chain-of-responsibility.md` |
| Directory names | lowercase kebab-case | `design-patterns/`, `behavioral/` |
| Section index | always named `README.md` | `architecture/README.md` |
| Templates dir | underscore prefix | `_templates/` |

Never use `PascalCase`, `camelCase`, or underscores in file or directory names (except `_templates`).

---

## Article Templates

There are two templates in `_templates/`. Always use the right one:

### Front matter

Every article requires YAML front matter at the top with these fields:

- `type`: `concept` or `how-to`
- `tags`: list of tags from `_templates/tags.md`
- `related`: list of paths to related articles (full repo path, no `.md` extension)
- `language`: language slug (e.g., `go`, `swift`) or `null` if language-agnostic

`README.md` files (section indexes) do **not** carry front matter.

The MCP server validates this at startup; unknown tags, broken `related` paths, or missing `# Title`/blockquote in the body fail the server boot with a clear error (Fail Fast).


### `concept.md` — for explaining a concept, pattern, or architectural style

Required sections (in order):
1. **What is it?** — definition, no jargon in the first sentence
2. **Why does it matter?** — problem it solves, motivation
3. **How it works** — mechanism, model, or logic; use diagrams when helpful
4. **Examples** — code examples following the language convention defined in the **Language** section above (or ASCII/pseudo-code when language-agnostic is more appropriate)
5. **When to use** — bulleted list of situations
6. **When NOT to use** — bulleted list of anti-patterns or misuse scenarios
7. **References** — at least one external authoritative source

### `how-to.md` — for procedural guides and step-by-step tutorials

Required sections (in order):
1. **Prerequisites**
2. **Steps** — numbered, each with explanation + code/command block
3. **Verification** — how to confirm success
4. **Common issues** — table with Symptom / Likely cause / Fix
5. **References**

Never skip sections. Never merge sections. Never rename sections.

---

## Section Index Files (README.md)

Every directory that contains articles must have a `README.md` that:
- Has a heading with the section name
- Contains a table listing each article: `| [Title](filename.md) | One-line description |`
- Does **not** contain full article content — only navigation

When adding a new article, always update the parent `README.md` to include it. Then evaluate whether any ancestor `README.md` (including the root) also needs updating — see "Keeping READMEs in sync" below.

---

## Diagrams

- Use **ASCII art** for simple structural diagrams (layers, flows).
- Use **Mermaid** (```` ```mermaid ```` ) for more complex diagrams when ASCII becomes unreadable.
- Keep diagrams in the **How it works** section.

---

## Writing Style

- Open every article with a blockquote (`> `) that summarizes it in one sentence.
- First sentence of **What is it?** must be jargon-free — assume the reader has heard the term but does not know what it means.
- Be concise and direct. Avoid filler phrases like "it is worth noting that" or "as we can see".
- Trade-offs matter: the **When to use / When NOT to use** sections are as important as the definition.
- Every article must link to at least one external reference (book, official doc, or authoritative post).

---

## Adding New Content

### New article in an existing section

1. Create the file following the naming convention.
2. Copy the appropriate template from `_templates/`.
3. Fill in the front matter (see **Front matter** subsection above and `_templates/tags.md`).
4. Fill in all sections.
5. Add an entry to the section's `README.md`.

### New subsection (e.g., a new category under `design-patterns/`, a new language under `languages/`, a new tool category under `tools/`)

1. Create the directory.
2. Create `README.md` inside it with a navigation table.
3. If new tags are needed for the section, update `_templates/tags.md` first (see its "Adding a new tag" workflow).
4. Add a reference to it from the parent `README.md`.

This rule applies to nested subsections too. Examples already in the repo: `concepts/solid/`, `concepts/pragmatic-principles/`, `architecture/mobile/`, `databases/types/`. Each nested subsection has its own `README.md`, and the parent links to that — not directly to the leaf articles.

### Overview articles inside a subsection

Several subsections start with an introductory article that summarizes the whole topic before the deep dives. Existing examples:

- `languages/<lang>/overview.md` (history, paradigms, ecosystem fit) — present in every language directory
- `concepts/pragmatic-principles/overview.md`
- `concepts/solid/solid.md`

The naming is intentionally not standardized (`overview.md` vs. the topic's own name) — use whichever reads better in the parent `README.md` navigation table. An overview article is a regular article and must follow the `concept.md` template.

### New top-level section

The three top-level content sections (`software-engineering/`, `languages/`, `tools/`) already exist and are populated. Do not add another top-level section without explicit user request. If asked:

1. Create the directory and its `README.md`.
2. Update the root `README.md` navigation table.

### Keeping READMEs in sync

Every new article, subsection, doc, or piece of information triggers this check: walk up the tree and ask, at each `README.md`, "does this still accurately describe what's underneath it?"

- **Immediate parent `README.md`** — must always be updated to include the new entry.
- **Ancestor `README.md` files and the root `README.md`** — update when the new content expands the scope, adds a new subsection, or makes an existing description inaccurate.

Stop walking up the tree as soon as you reach a `README.md` that already describes the new content accurately. This rule applies equally to new articles, new subsections, and edits that change the scope of existing content.

---

## What NOT to Do

- Do not add runnable projects, `package.json`, `pyproject.toml`, or any dependency files, **with one exception: the `mcp-server/` directory contains the TypeScript MCP server that exposes this knowledge base to AI agents. See `mcp-server/README.md` for details.**
- Do not create articles without following the full template structure.
- Do not write articles in the `_templates/` directory.
- Do not hardcode email addresses, phone numbers, or any personal data in any file.
- Do not reference or import anything from Nubank internal projects or `~/dev/nu/`.
- Do not create a `.claude/CLAUDE.md` for this project — this root `CLAUDE.md` is the single source of instructions.
