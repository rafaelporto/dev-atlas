---
name: atlas-changelog
description: >
  Create, update, release and validate a CHANGELOG.md following Keep a Changelog 1.1.0
  and Semantic Versioning, as recommended by dev-atlas (tools/git/changelog). Four modes:
  init (create the file, optionally seeded from existing tags), add (propose categorized
  entries for [Unreleased] from the commits since the last tag), release (move [Unreleased]
  to a dated version section and suggest the SemVer bump), check (report-only validation).
  Every write is shown as a dry-run and applied only after confirmation; never commits,
  tags or pushes. Self-contained; uses the dev-atlas MCP server only if it is connected.
  Use when asked to "update the changelog", "add to the changelog", "cut a release",
  "prepare the release", "validate the changelog", "create a changelog", "atualiza o
  changelog", "adiciona no changelog", "corta o release", "prepara o release", "valida o
  changelog", "cria o changelog".
user-invocable: true
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - "Bash(git log *)"
  - "Bash(git tag --list *)"
  - "Bash(git describe *)"
  - "Bash(git diff *)"
  - "Bash(git rev-parse *)"
  - "Bash(git show *)"
  - "Bash(git remote get-url *)"
  - "Bash(date *)"
  - mcp__dev-atlas__get_article
---

# atlas-changelog

You maintain the `CHANGELOG.md` of the repository you are invoked in, following the format dev-atlas recommends: **Keep a Changelog 1.1.0** plus **Semantic Versioning 2.0.0**.

Modes, chosen from the argument or the operator's request:

| Mode | Invocation | Writes? |
|---|---|---|
| `init` | `/atlas-changelog init` | Creates `CHANGELOG.md` (after confirmation) |
| `add` | `/atlas-changelog add` or `/atlas-changelog add "<entry text>"` | Edits `[Unreleased]` (after confirmation) |
| `release` | `/atlas-changelog release [X.Y.Z]` | Turns `[Unreleased]` into a version section (after confirmation) |
| `check` | `/atlas-changelog check` | Never — report only |

If the mode is unclear, ask the operator which one they want.

## Operating principles

- **Operator language.** This file is written in en-US, but the skill can be invoked in any language. Talk to the operator in the language they use: if they write in pt-BR, answer in pt-BR. Code, file paths, git commands and changelog headings stay verbatim.
- **Entry language is a separate decision.** The language the operator speaks never decides the language of the changelog entries. Resolve it in Step 2.
- **Headings are always English.** `## [Unreleased]`, `### Added`, `### Fixed`, and the other headings are Keep a Changelog keywords and are never translated, even when the entries are written in another language.
- **Dry-run first.** Show the exact content or diff of every write and wait for explicit confirmation.
- **Self-contained.** The format rules below are embedded so the skill works without the dev-atlas MCP server. If the MCP is connected, it is used only to check those rules (Step 1).

## Format rules

> These rules mirror `tools/git/changelog.md` in dev-atlas. When changing either, update both in the same commit.

1. The file is `CHANGELOG.md` at the repository root.
2. It starts with `# Changelog` and a short header citing Keep a Changelog and Semantic Versioning (template in Mode `init`).
3. Versions are in descending order; `## [Unreleased]` is always the first section.
4. A version heading is `## [X.Y.Z] - YYYY-MM-DD` (ISO 8601). A yanked version is `## [X.Y.Z] - YYYY-MM-DD [YANKED]`.
5. Allowed categories, only these, in this order: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`. A category with no entries is omitted.
6. Each entry is one `- ` line written for the people who use the project — the effect they will notice — with no commit hash, author name, or email.
7. Breaking changes are prefixed with `**BREAKING:**`.
8. Compare links live at the bottom: `[X.Y.Z]: <repo-url>/compare/<prev-tag>...<tag>`, and `[Unreleased]: <repo-url>/compare/<last-tag>...HEAD`. The first version has no previous tag, so it links to `<repo-url>/releases/tag/<tag>`.
9. Suggested bump from the `[Unreleased]` content: `Removed` or any `**BREAKING:**` → major; `Added` or `Deprecated` → minor; only `Fixed`/`Security` → patch; `Changed` → minor, or major when breaking. Before `1.0.0`: breaking → minor, everything else → patch.
10. Released sections are never deleted or rewritten.

---

## Step 0 — Locate the repository

Run `git rev-parse --show-toplevel`. If it fails, tell the operator this is not a git repository and stop. All paths below are relative to that root.

## Step 1 — Optional: check the rules against dev-atlas

If `mcp__dev-atlas__get_article` is available, call it once with `id: "tools/git/changelog"`. Compare its "How it works" section with the **Format rules** above.

- If they diverge (for example, a different category order), **the article wins**: apply the article's rule for this run and warn the operator: "The rules embedded in atlas-changelog are out of date relative to `tools/git/changelog` (difference: <what>). I used the article's version."
- If the tool is unavailable or errors, continue silently with the embedded rules.

## Step 2 — Resolve the entry language (modes `init` and `add`)

1. Read, if present, `CLAUDE.md`, `.claude/CLAUDE.md`, and `AGENTS.md` at the repository root. Do not scan subdirectories.
2. If any of them states the language for documentation, changelog, or written content, use it.
3. Otherwise, ask the operator once per run: "This repository doesn't define a language for the changelog. Should I write it in English (en-US)?" If `CHANGELOG.md` already has entries, add which language they are in (for example: "the existing entries are in pt-BR").
4. Keep the answer for the rest of this run only. Never write the choice to any file.

`release` and `check` do not write entry text and skip this step.

## Step 3 — Detect changelog generators

Look for these signals with `Glob`/`Grep`:

| Signal | Tool |
|---|---|
| `.changeset/` directory | Changesets |
| `release-please-config.json` or `.release-please-manifest.json` | release-please |
| `cliff.toml`, or `[tool.git-cliff]` in `pyproject.toml` | git-cliff |
| `.releaserc*`, `release.config.*`, or a `"release"` key in `package.json` | semantic-release |
| `changes/` or `newsfragments/` directory, or `[tool.towncrier]` in `towncrier.toml`/`pyproject.toml` | towncrier |

If one is found:

- Tell the operator: "This repository generates CHANGELOG.md with <tool>. Hand edits will be overwritten on the next release."
- `check` runs normally.
- `init`, `add`, and `release` **stop** and explain how to do the same through the tool — for example, `npx changeset` to add an entry with Changesets, a new fragment in `changes/` with towncrier, or fixing the commit message for release-please/git-cliff/semantic-release.

## Step 4 — Run the mode

### Mode `init`

1. If `CHANGELOG.md` already exists, stop and suggest `check`. Never overwrite it.
2. Resolve the compare-link base URL from `git remote get-url origin`, converting an SSH remote (scp-like `host:owner/repo.git` syntax) to `https://host/owner/repo` and dropping any trailing `.git`. If there is no remote, or the host is not GitHub or GitLab, omit the compare links and tell the operator.
3. List tags: `git tag --list 'v*' --sort=-v:refname` (also try without the `v` prefix if nothing matches).
4. If there are tags, ask: "I found N tags. Should I create the file with only `[Unreleased]`, or seed one section per tag?" If there are more than 10, also ask whether to seed all of them or only the latest 10.
5. When seeding, for each tag: the date is `git log -1 --format=%cs <tag>`; the entries are proposed from `git log <previous-tag>..<tag>` using the same classification as Mode `add`.
6. Build the file from this template (header text always in English):

   ```markdown
   # Changelog

   All notable changes to this project will be documented in this file.

   The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
   and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

   ## [Unreleased]

   [Unreleased]: <repo-url>/compare/<last-tag>...HEAD
   ```

7. Show the whole file as a dry-run. Write it with `Write` only after confirmation.

### Mode `add`

**Manual entry** (`/atlas-changelog add "<text>"`): suggest the category for the text, rewrite it only if it breaks rule 6, show the resulting `[Unreleased]` section, and write after confirmation.

**From commits** (no text given):

1. If `CHANGELOG.md` does not exist, suggest `init` and stop.
2. Base: `git describe --tags --abbrev=0`. If there is no tag, the range is the whole history (`HEAD` instead of `<base>..HEAD` below). If the latest version in the file has no matching tag (a release was cut but never tagged), warn the operator: "Version X.Y.Z in the changelog has no tag; the commits since <base> include changes already recorded." Then rely on the duplicate check below.
3. Read `git log <base>..HEAD --no-merges --format='%h%x09%s%n%b%x00'`. Read `git diff --stat <base>..HEAD` or `git show --stat <hash>` only for commits whose message is too vague to classify.
4. Exclude, and list as excluded with the reason:
   - types `chore`, `ci`, `build`, `test`, `style`;
   - `docs` that only touch internal documentation (keep docs changes users read, such as public API docs);
   - `refactor` with no observable effect;
   - merge commits;
   - changes already represented anywhere in the file — `[Unreleased]` or a released section (similar wording) — show these as possible duplicates, naming the section, rather than dropping them silently.
5. Classify the rest:

   | Commit signal | Category |
   |---|---|
   | `feat` | Added |
   | `fix` | Fixed |
   | `perf` | Changed |
   | `!` after the type, or a `BREAKING CHANGE:` footer | `**BREAKING:**` prefix, under Changed or Removed as fits |
   | mentions deprecating something | Deprecated |
   | mentions a CVE or a security fix | Security |
   | not a Conventional Commit | classify by content and mark the classification as uncertain |

6. Rewrite each entry for the consumer (rule 6), in the language from Step 2.
7. Dry-run: show a table `commit → proposed entry → category`, the list of excluded commits with reasons, and the resulting `[Unreleased]` section. The operator may drop, edit, or recategorize entries.
8. After confirmation, insert the entries under `## [Unreleased]` with `Edit`, creating missing category headings in the rule-5 order.

### Mode `release`

1. If `[Unreleased]` has no entries, stop and suggest `add`.
2. Current version: the latest version heading in the file, or the latest tag if the file has none.
3. Suggest the next version with rule 9 and explain it, for example:

   ```
   [Unreleased] contains: 1 BREAKING, 2 Added, 3 Fixed
   Current version: 1.4.2  →  suggested: 2.0.0 (major, because of the BREAKING entry)
   ```

   If the operator passed `X.Y.Z` and it disagrees with the suggestion (for example `1.5.0` with a breaking entry), warn and ask for confirmation.
4. Date: `date +%F`.
5. Tag prefix: copy the existing tags' style (`v1.4.2` vs `1.4.2`); with no tags, use `v`.
6. Prepare the change: insert `## [X.Y.Z] - YYYY-MM-DD` directly below `## [Unreleased]` (so the entries move under it and `[Unreleased]` is left empty), update the `[Unreleased]` link to compare from the new tag, and add the new version's link.
7. Show the diff as a dry-run; apply with `Edit` after confirmation.
8. Print the next steps **as text only — never run them**:

   ```bash
   git add CHANGELOG.md
   git commit -m "chore(release): X.Y.Z"
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin <branch> vX.Y.Z
   ```

### Mode `check`

Read `CHANGELOG.md` and the tags (`git tag --list`), then report. Never edit.

| Check | Severity |
|---|---|
| File missing | 🔴 |
| `[Unreleased]` missing or not first | 🔴 |
| Versions not in descending order | 🔴 |
| Duplicate version | 🔴 |
| Date not `YYYY-MM-DD` | 🟡 |
| Category outside the six, or out of order | 🟡 |
| Compare link missing or pointing to a tag that does not exist | 🟡 |
| Git tag with no section, or section with no tag | 🟡 |
| Entry containing a commit hash, author name, or email | 🟡 |
| Vague entry ("misc fixes", "improvements", "updates") | 🟢 |
| `Removed` entry with no matching earlier `Deprecated` entry (heuristic — report as "possible") | 🟢 |
| Empty category heading | 🟢 |

Report inline, in the operator's language:

```
# atlas-changelog check — <repo name>
Rules: embedded | dev-atlas tools/git/changelog

## 🔴 High
- CHANGELOG.md:<line> — <what> — Fix: <suggestion>

## 🟡 Medium
...

## 🟢 Low
...

## Summary
Total: N (🔴 N / 🟡 N / 🟢 N)
```

If nothing is found, say so plainly. Finish by offering the mode that would fix each issue (`add`, `release`, or a manual edit for released sections), without running it.

## Guardrails

- **Dry-run first.** Every write (init / add / release) shows the exact content or diff and waits for explicit confirmation. No confirmation, no write.
- **One file only.** The only file this skill ever creates or edits is `CHANGELOG.md` at the repository root.
- **No git writes.** Never run commit, tag, push, branch, stash, reset, checkout, or any other command that changes git state. Next steps are printed as text for the operator to run.
- **No personal data.** Never copy author names, emails, or any personal data from commits into entries. Never write anything shaped like an email address.
- **Never delete history.** Released sections are never removed or rewritten; only `[Unreleased]` and the link footer are edited.
- **Generated changelogs are off-limits** for init / add / release (Step 3).
