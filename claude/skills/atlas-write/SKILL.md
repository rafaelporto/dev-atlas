---
name: atlas-write
description: >
  Create a new article or a new subsection in dev-atlas following the repository's
  canonical structure: the right template (concept / how-to), every section in order,
  front matter (type, tags from the controlled vocabulary, related, language), the
  parent and ancestor README.md indexes, the CHANGELOG entry and the commit proposal.
  Reads CLAUDE.md, _templates/ and _templates/tags.md at runtime as the source of truth.
  Every write is shown first and applied only after confirmation. Talks to the operator
  in their language; content is always written in English. Use when asked to "write an
  article", "new article", "add an article about", "add a subsection", "new topic",
  "atlas write", "escreve um artigo", "novo artigo", "cria um artigo sobre",
  "cria uma subseção", "novo assunto".
user-invocable: true
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Skill
  - "Bash(just new *)"
  - "Bash(just tags)"
  - "Bash(just check)"
  - "Bash(just build)"
  - "Bash(git status *)"
  - "Bash(git diff *)"
  - "Bash(git log *)"
  - "Bash(git rev-parse *)"
  - mcp__dev-atlas__list_sections
  - mcp__dev-atlas__list_tags
  - mcp__dev-atlas__search_articles
  - mcp__dev-atlas__get_article
  - mcp__dev-atlas__find_related
---

# atlas-write

You add content to dev-atlas — a new article, several articles, or a new subsection — so that it follows the repository's structure exactly: template, section order, front matter, tag vocabulary, README indexes, validation, CHANGELOG and commit.

## Operating principles

- **Operator language.** This file is written in en-US, but the skill can be invoked in any language. Talk to the operator in the language they use: if they write in pt-BR, keep answering in pt-BR. Article content, file paths, headings, front matter, commit messages and CHANGELOG entries are always in English.
- **Repository files are the source of truth.** Every structural rule (templates, section order, front matter fields, tag vocabulary, README conventions, code example language) is read from `CLAUDE.md` and `_templates/` in Step 1. Never decide from memory; if a file is missing or contradicts this skill, the file wins — say so.
- **Dry-run first.** Show the exact placement, content or diff of every write and wait for explicit confirmation. A confirmation covers that write only.
- **MCP is optional.** The dev-atlas MCP server is used, when connected, to map the wiki and find duplicates; without it, fall back to `Glob`/`Grep`.

---

## Step 0 — Locate the repository

Run `git rev-parse --show-toplevel`. Confirm it is dev-atlas: the root must contain `CLAUDE.md`, `_templates/concept.md`, `_templates/how-to.md`, `_templates/tags.md` and `mcp-server/`. If any is missing, tell the operator this skill only runs inside dev-atlas and stop. All paths below are relative to that root.

Run `git status --short`. If the working tree is not clean, list the pending changes and ask whether to continue — they must not end up in this skill's commit.

## Step 1 — Load the rules

Read, in full:

- `CLAUDE.md` — language rules for code examples, folder structure, naming, front matter, templates, README conventions, "What NOT to Do", no-email rule.
- `_templates/concept.md` and `_templates/how-to.md` — the exact section headings and their order.
- `_templates/tags.md` — the tag vocabulary, its usage rules, and the "Adding a new tag" workflow.

Then map the wiki: if `mcp__dev-atlas__list_sections` is available, call it once and keep the result; otherwise `Glob` the `README.md` files under the five content sections. Do not call `list_sections` again later in the run.

## Step 2 — Intake

Collect, asking only for what the operator has not already said:

1. **Topic** — what the content is about, in one sentence.
2. **Kind** — one article in an existing section, a new subsection (directory + `README.md` + articles), or several articles at once.
3. **Type of each article** — `concept` (explains a concept, pattern, style) or `how-to` (procedural guide). Suggest one and say why.
4. **Code example language** — apply the `CLAUDE.md` "Language" rule to the destination path. If it falls under "All other articles", ask the operator; never pick one.

Check for overlap: `mcp__dev-atlas__search_articles` with the topic's key terms (or `Grep` over the content sections). If an article already covers the topic, show it and ask whether to extend it, write a narrower article, or stop.

## Step 3 — Placement proposal (dry-run)

Present one proposal and wait for explicit confirmation before writing anything:

- **Files** — the full path of every file to create (kebab-case, `.md`), and for a new subsection, its directory and `README.md`. Never a new top-level section unless the operator asked for one explicitly.
- **Front matter per article** — `type`, `tags`, `related`, `language`:
  - `tags` only from `_templates/tags.md`, at least one Domain tag, and every usage rule in that file applied (e.g. `design-pattern` + a pattern category, `operating-system` + exactly one OS tag, `overview` only for section overviews).
  - A tag that does not exist yet is proposed separately, following "Adding a new tag": category, a usage rule line for the Rules list, and every article that should carry it. Avoid one-off tags.
  - `related` — full repo paths without `.md`, each one verified to exist.
  - `language` — the technical-context slug, or `null`.
- **Title and summary** — the `# Title` and the one-sentence `>` blockquote.
- **Indexes** — the parent `README.md` row to add, then each ancestor up to the root, stopping at the first one that already describes the new content accurately.
- **Back-links** — existing articles that should list the new one in `related` (optional; the operator may drop any).

Format it as a table plus the README rows, e.g.:

| File | Type | Tags | Related | Language |
|---|---|---|---|---|
| software-engineering/architecture/event-sourcing.md | concept | architecture, concept | software-engineering/architecture/cqrs | null |

## Step 4 — Scaffold and write

Follow the confirmed proposal exactly; any change to it goes back to Step 3.

1. **New subsection first** — create the directory and its `README.md`: a `# Section` heading, one intro line, and the navigation table `| [Title](file.md) | One-line description |`. No front matter, no article content.
2. **New tag** (if approved) — add it to `_templates/tags.md` in its category and its usage rule to the Rules list.
3. **Each article** — run `just new <type> <path>`, then fill the copied template:
   - front matter from the proposal;
   - `# Title`, the `>` blockquote, the `---` separator;
   - every template section, in order — never skip, merge, or rename one;
   - concept: jargon-free first sentence in "What is it?", diagrams (ASCII or Mermaid) only in "How it works", "When to use" and "When NOT to use" as real trade-offs;
   - how-to: numbered steps with a command/code block each, a Symptom / Likely cause / Fix table in "Common issues";
   - code examples in the language decided in Step 2;
   - at least one external authoritative reference;
   - no email addresses, phone numbers or other personal data; no filler phrases.
4. **Extending an existing article** (Step 2 option) — edit it in place, keeping its section structure; show the diff.

Show each written article (or diff) to the operator and apply their corrections before moving to Step 5.

## Step 5 — Indexes and cross-links

1. **Parent README** — add one row per new article (or the new subsection) to the navigation table, matching the existing rows' order and wording style.
2. **Ancestors** — walk up to the root `README.md`; at each one ask "does this still accurately describe what is underneath?" Update descriptions or add the subsection row only where the answer is no, and stop at the first README that is still accurate.
3. **Back-links** — add the new article's path to the `related` list of each existing article the operator approved in Step 3. Touch nothing else in those files.

Show the combined diff of all README and back-link edits before applying it.

## Step 6 — Validate

Run `just check` (build + tests + strict link audit + email check).

- On failure, read the error (unknown tag, broken `related`, missing title or blockquote, broken link, email-shaped string), fix it, and rerun until it passes. A fix that changes the confirmed proposal goes back to Step 3.
- Never bypass or weaken the check, and never edit `mcp-server/` to make it pass.

When it passes, tell the operator:
"The MCP server builds its index at startup, so it does not see the new content yet. Reconnect it with `/mcp` → dev-atlas → Reconnect (or restart Claude Code)."

## Step 7 — CHANGELOG

The CHANGELOG entry ships in the same commit as the content, and it is entirely the job of the `atlas-changelog` skill — this skill holds no changelog rules.

- If `atlas-changelog` is available, invoke it in `add` mode, passing a plain summary of what was created or extended (paths and one sentence each).
- If it is not installed, read `claude/skills/atlas-changelog/SKILL.md` from this repository and follow its `add` mode exactly as written there.

Either way, `atlas-changelog`'s own dry-run and confirmation apply.

## Step 8 — Commit proposal

Never commit without an explicit ok for this specific commit.

1. Run `git status --short` and `git log --oneline -10` to read the repository's commit style.
2. Propose, in one message:
   - **Files to stage** — exactly the files this run created or edited (articles, READMEs, back-linked articles, `tags.md` if a tag was added, `CHANGELOG.md`), listed by path. Nothing else, even if the tree has other changes.
   - **Message** — Conventional Commits, matching `git log`: `feat(<scope>): add <what>` for new content, `docs(<scope>): …` when only extending an existing article; `<scope>` is the section or subsection slug (e.g. `architecture`, `databases`, `go`). A body of 1–3 lines saying what was added and where it is linked from. Append any attribution trailer the session requires.
   - **Branch and remote** — the current branch (`git rev-parse --abbrev-ref HEAD`).
3. After the ok, run `git add <files>` and `git commit`. Show the resulting `git log -1 --stat`.
4. **Never push.** Pushing is a separate action, outside this skill; mention it as the next step only.

## Guardrails

- **Dry-run first.** Every write is shown and confirmed; one confirmation covers one write only.
- **No personal data.** Never write an email address (even an example one), phone number, token or secret. Use placeholders such as `"<email>"`.
- **Templates are read-only**, except adding an approved tag to `_templates/tags.md`.
- **No new top-level section** unless the operator explicitly asked for one.
- **No tooling changes.** Never edit `mcp-server/`, the `Justfile`, or `claude/`.
- **No moves or renames.** If content needs to move, point the operator to `just move` / `just move-apply` and stop.
- **No git writes beyond the confirmed commit** — no push, branch, reset, stash, checkout, or amend.
- **Content stays in English**, whatever language the operator speaks.
