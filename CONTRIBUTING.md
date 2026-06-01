# Contributing to dev-atlas

Thanks for taking the time to contribute. **dev-atlas** is a personal, open-source knowledge base — it's actively maintained, but the bar is consistency over volume. The fastest way to land a change is to follow the conventions below.

---

## Ways to contribute

| You want to... | Do this |
|---|---|
| Suggest a new article | Open an [issue](https://github.com/rafaelporto/dev-atlas/issues/new/choose) using the **Article request** template |
| Fix a typo or technical error | Open a pull request directly (or use the **Correction** issue template) |
| Report a broken link | Open an issue using the **Broken link** template |
| Discuss an approach before writing | Start a thread in [Discussions](https://github.com/rafaelporto/dev-atlas/discussions) |

---

## Repository conventions

These rules keep articles searchable, linkable, and consistent. They are enforced on review.

### File & directory naming

- Files: `kebab-case.md` — e.g. `chain-of-responsibility.md`.
- Directories: `lowercase-kebab-case/` — e.g. `design-patterns/behavioral/`.
- Section index: always `README.md`.
- Never use `PascalCase`, `camelCase`, or underscores (except `_templates/`).

### Article templates

Two templates live in [`_templates/`](_templates/). Pick the right one and follow **all** sections in order — never skip, merge, or rename:

- **`concept.md`** — for principles, patterns, architectural styles, language features.
  Sections: *What is it?* → *Why does it matter?* → *How it works* → *Examples* → *When to use* → *When NOT to use* → *References*.
- **`how-to.md`** — for step-by-step procedural guides.
  Sections: *Prerequisites* → *Steps* → *Verification* → *Common issues* → *References*.

Every article must:

- Open with a blockquote (`>`) summarizing the topic in one sentence.
- Have a jargon-free first sentence in *What is it?*.
- Include at least one external reference (book, official doc, or authoritative post).

### Code examples

- **Language articles** (under `languages/<lang>/`) — use the directory's language.
- **Mobile architecture articles** (under `software-engineering/architecture/mobile/`) — provide examples in **Swift**, **Kotlin**, and **Flutter (Dart)** (one block per language).
- **Everything else** — propose a language in your PR description; the maintainer will confirm before merge.

### Diagrams

- ASCII art for simple structural diagrams (layers, flows).
- Mermaid (```` ```mermaid ```` ) for anything ASCII makes unreadable.
- Diagrams belong in the *How it works* section.

### Updating section indexes

Every new article requires updating the **parent** `README.md` (the navigation table). If your change expands scope or adds a subsection, walk up the tree and update each ancestor `README.md` (including the root) until you reach one whose description is still accurate.

---

## Pull request checklist

Before opening a PR, confirm:

- [ ] File and directory names use `kebab-case.md`.
- [ ] Article follows the full template (no skipped or renamed sections).
- [ ] Opening blockquote present; first *What is it?* sentence jargon-free.
- [ ] At least one external reference cited.
- [ ] Parent `README.md` updated; ancestor `README.md` files updated if scope changed.
- [ ] Internal links resolve (no broken paths).
- [ ] No personal data (emails, phones, tokens, secrets) anywhere in the diff.

---

## Style notes

- Write in **English**.
- Be concise — cut filler ("it is worth noting that", "as we can see").
- Treat the *When to use / When NOT to use* sections as first-class — trade-offs matter as much as definitions.

---

## Out of scope

- No runnable projects, build systems, or dependency files (`package.json`, `pyproject.toml`, etc.). This repo only ships Markdown.
- No content sourced from private/internal systems.

---

## Questions?

Open a thread in [Discussions](https://github.com/rafaelporto/dev-atlas/discussions). Maintainer response time is best-effort.
