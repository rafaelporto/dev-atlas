---
type: concept
tags:
  - tool
related: []
language: null
---
# Conventional Commits

> A small, agreed-upon vocabulary for commit messages that makes history machine-readable and enables automated changelogs, version bumps, and release tooling.

---

## What is it?

Conventional Commits is a specification for the format of commit messages. It defines a strict structure — a **type**, an optional **scope**, an optional `!` to mark breaking changes, and a short **description** — followed by an optional longer body and optional footers.

The format:

```
<type>(<optional scope>)[!]: <description>

[optional body]

[optional footer(s)]
```

The minimal example:

```
feat: add rate limiter to login endpoint
```

A more complete one:

```
feat(auth)!: drop support for HS256 tokens

Tokens signed with HS256 are no longer accepted. Existing sessions are
invalidated; clients must re-authenticate with the new RS256 flow.

BREAKING CHANGE: HS256 tokens are no longer accepted.
Refs: #1428
```

The specification is maintained at [conventionalcommits.org](https://www.conventionalcommits.org/) and the current stable version is **1.0.0**.

---

## Why does it matter?

A consistent commit format turns history from prose into structured data. Tooling can:

- Generate **CHANGELOG.md** automatically — every `feat:` becomes a new feature entry; every `fix:` becomes a bug fix.
- Determine the **next semantic version** automatically — `feat:` triggers a minor bump, `fix:` a patch, `!` or `BREAKING CHANGE:` a major. This is the foundation of tools like [semantic-release](https://github.com/semantic-release/semantic-release) and [release-please](https://github.com/googleapis/release-please).
- Filter and search history by intent — "show me all the fixes in the auth scope this quarter."
- Drive commit linting in CI so messages are validated before they enter `main`.

Beyond tooling, the format imposes a small but real discipline on authors. Choosing a type forces you to classify the change. Keeping the description short forces you to summarize. Both are good habits independent of automation.

---

## How it works

### Types

The spec mandates two types and lets teams add others. Conventional, widely-adopted types:

| Type | Meaning | Triggers (in SemVer tooling) |
|---|---|---|
| `feat` | A new feature for the user. | **Minor** version bump. |
| `fix` | A bug fix for the user. | **Patch** version bump. |
| `docs` | Documentation only. | None. |
| `style` | Whitespace, formatting, missing semicolons — no code logic change. | None. |
| `refactor` | A code change that neither fixes a bug nor adds a feature. | None. |
| `perf` | A performance improvement. | Patch. |
| `test` | Adding or correcting tests. | None. |
| `build` | Build system or dependencies. | None. |
| `ci` | CI configuration. | None. |
| `chore` | Routine maintenance — bumping dev dependencies, cleanup. | None. |
| `revert` | Reverts a previous commit. | Varies. |

### Scope

The scope is a noun in parentheses describing the section of the codebase: `feat(auth)`, `fix(api)`, `docs(readme)`. It is optional but recommended for any project with more than a handful of modules. The set of valid scopes is up to the team — common practice is to align scopes with top-level directories or major subsystems.

### Breaking changes

A change that breaks backward compatibility is marked in **either** of two ways (or both):

1. A `!` immediately before the colon: `feat(api)!: rename POST /users to POST /accounts`
2. A `BREAKING CHANGE:` footer:
   ```
   feat(api): rename POST /users to POST /accounts

   BREAKING CHANGE: POST /users no longer exists. Clients must use POST /accounts.
   ```

Either form triggers a **major** version bump in SemVer-aware tooling.

### Footers

Footers follow the body, separated by a blank line. Common footers:

- `BREAKING CHANGE: <description>`
- `Refs: #123`
- `Closes: #456`
- `Co-authored-by: Name <email>`
- `Reviewed-by: Name <email>`

The format follows [git trailers](https://git-scm.com/docs/git-interpret-trailers) — `Token: value`, one per line.

### Description rules

The description (the line after the colon) follows established Git conventions independent of Conventional Commits:

- Use the imperative mood: "add" not "added" or "adds".
- Do not capitalize the first letter (style preference; some teams capitalize).
- No period at the end.
- Aim for ≤ 50 characters in the subject line, ≤ 72 in body lines, so `git log --oneline` and email clients display cleanly.

---

## Examples

### A patch fix

```
fix(api): return 401 instead of 500 for expired tokens

The token expiry handler was raising an uncaught exception when the
exp claim was missing entirely, leading to a generic 500. Now we
explicitly check for missing or expired exp and return 401.

Closes: #314
```

### A new feature with scope

```
feat(payments): add idempotency-key header support

Repeated POSTs with the same Idempotency-Key now return the original
response without re-processing. Keys expire after 24 hours.
```

### A breaking change with `!`

```
feat(cli)!: rename --verbose to --debug

The --verbose flag is removed. Scripts must use --debug instead.

BREAKING CHANGE: --verbose no longer exists.
```

### A revert

```
revert: feat(payments): add idempotency-key header support

This reverts commit 9f3a1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a.

Refs: #520
```

### Mapping commits to SemVer

For a project at version `1.4.2`:

| Commits since last release | Next version |
|---|---|
| Only `chore`, `docs`, `style`, `test`, `ci` | `1.4.2` (no bump) |
| At least one `fix`, no `feat`, no breaking | `1.4.3` |
| At least one `feat`, no breaking | `1.5.0` |
| Any commit with `!` or `BREAKING CHANGE:` footer | `2.0.0` |

This mapping is what enables fully automated releases from CI.

---

## When to use

- Any project that publishes versioned releases — libraries, CLIs, services with a public API.
- Any project that wants automated changelogs or release notes.
- Teams that already do code review and want a small extra signal in the history about *what kind* of change each commit is.
- Multi-package monorepos, where scope makes "which package did this affect?" obvious.

## When NOT to use

- Throwaway prototypes or personal projects where the overhead exceeds the benefit.
- Teams that squash every PR into a single message — Conventional Commits still helps in the merge commit, but the per-commit value disappears, so the discipline is weaker.
- When the team will not enforce it consistently. A half-followed convention is worse than no convention — automated tooling will misclassify the unstructured commits and the changelog will be wrong.

## References

- [Conventional Commits 1.0.0 specification](https://www.conventionalcommits.org/en/v1.0.0/) — the canonical reference.
- [Angular's commit message guidelines](https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md) — the convention from which Conventional Commits is derived.
- [Semantic Versioning 2.0.0](https://semver.org/) — the versioning scheme the commit types map to.
- [semantic-release](https://github.com/semantic-release/semantic-release) — popular automation built on Conventional Commits.
- [commitlint](https://commitlint.js.org/) — linter that validates commit messages against the spec.
- [Tim Pope — A Note About Git Commit Messages](https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html) — origin of the 50/72 rule and imperative mood guidance.
