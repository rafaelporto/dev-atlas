# Claude Instructions — dev-atlas

## Project Overview

**dev-atlas** is a personal, open-source knowledge base for software engineering. It is a structured Markdown wiki — not a blog, not a course, not a project with runnable code. Its purpose is to document core concepts, architectural patterns, design patterns, and tools in a consistent, linkable format.

There is no build system, no package manager, and no runtime. The only artefacts are Markdown files.

---

## Language

- All content (article text, headings, code comments, identifiers) must be in **English**.
- Code examples follow these rules by topic:
  - **Mobile articles** (anything under `architecture/mobile/` or explicitly about mobile development) — provide examples in **Swift**, **Kotlin**, and **Flutter (Dart)**, one block per language.
  - **All other articles** — ask the user which language to use before writing any code example.

---

## Folder Structure

```
dev-atlas/
├── README.md                  # Root index — navigation table for all sections
├── _templates/                # Article templates — NOT content, never link from README
│   ├── concept.md
│   └── how-to.md
└── software-engineering/      # Primary section (only section currently populated)
    ├── README.md              # Section index
    ├── architecture/
    ├── concepts/
    └── design-patterns/
        ├── behavioral/
        ├── creational/
        └── structural/
```

**Planned but not yet created:** `languages/` and `tools/` — these exist in the root `README.md` navigation table but have no files. Do not create them unless the user explicitly asks to add an article there.

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

When adding a new article, always update the parent `README.md` to include it.

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
3. Fill in all sections.
4. Add an entry to the section's `README.md`.

### New subsection (e.g., a new category under `design-patterns/`)

1. Create the directory.
2. Create `README.md` inside it.
3. Add a reference to it from the parent `README.md`.

### New top-level section (e.g., `languages/`, `tools/`)

1. Create the directory and its `README.md`.
2. Update the root `README.md` navigation table.
3. The `languages/` and `tools/` rows already exist in the root table — only add files, do not change the table structure.

---

## What NOT to Do

- Do not add runnable projects, `package.json`, `pyproject.toml`, or any dependency files.
- Do not create articles without following the full template structure.
- Do not write articles in the `_templates/` directory.
- Do not hardcode email addresses, phone numbers, or any personal data in any file.
- Do not reference or import anything from Nubank internal projects or `~/dev/nu/`.
- Do not create a `.claude/CLAUDE.md` for this project — this root `CLAUDE.md` is the single source of instructions.
