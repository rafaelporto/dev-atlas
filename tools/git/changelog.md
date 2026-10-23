---
type: concept
tags:
  - tool
related:
  - tools/git/maintaining-a-changelog
  - tools/git/conventional-commits
  - tools/git/tags-and-releases
language: null
---
# Changelog

> A curated, human-readable file that lists the notable changes in each released version of a project, so the people who depend on it can decide whether and how to upgrade.

---

## What is it?

A changelog is a file, usually `CHANGELOG.md` at the root of the repository, that tells the people who use a project what changed from one version to the next. It is written for humans, not machines: each entry describes an effect the reader can notice ("Added a `timeout` option to the client"), not the work that produced it ("refactor retry loop").

The most widely used format is [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), usually paired with [Semantic Versioning](https://semver.org/spec/v2.0.0.html). It groups entries by version, newest first, and within each version by a fixed set of categories.

A changelog is not the same as **release notes**. The changelog is the cumulative history of every release, versioned in the repository. Release notes are the text published for a single release — on a GitHub Release page, an app store listing, or an announcement — and are often derived from that version's changelog section.

---

## Why does it matter?

Git already records every change, but `git log` answers a different question for a different reader:

| `git log` | `CHANGELOG.md` |
|---|---|
| Every commit, including "fix typo", "wip", and merges | Only changes that affect people who use the project |
| Grouped by commit | Grouped by released version |
| Written in the vocabulary of whoever wrote the code | Written in the vocabulary of whoever uses the project |
| Breaking changes look like any other commit | Breaking changes, deprecations, and security fixes are called out explicitly |

A good changelog lets a consumer answer, in seconds:

- **Can I upgrade?** — "I am on 2.3; what changes if I move to 3.0, and what breaks?"
- **Which version fixed it?** — "The bug that bit us in production: is it fixed, and since when?"
- **What is going away?** — the `Deprecated` category works as a **deprecation contract**: it announces a removal at least one release before it happens, so consumers can migrate on their own schedule instead of discovering the removal when their build breaks.

Without a changelog, every consumer has to reconstruct this from diffs, pull requests, and commit messages — the same work, repeated by each of them, with worse results.

---

## How it works

### The Keep a Changelog rules

Keep a Changelog 1.1.0 defines a small set of conventions:

- **Newest version first.** Readers almost always care about the latest changes, so they read from the top and stop.
- **An `[Unreleased]` section at the top** collects changes that are merged but not yet released. Cutting a release turns it into a version section.
- **One heading per version**, in the form `## [X.Y.Z] - YYYY-MM-DD`, with dates in **ISO 8601** to avoid the ambiguity of `03/04/2026`.
- **A fixed set of categories**, always in the same order, each one omitted when it has no entries:

  | Category | Use it for |
  |---|---|
  | `Added` | New features |
  | `Changed` | Changes in existing functionality |
  | `Deprecated` | Features that will be removed in an upcoming release |
  | `Removed` | Features removed in this release |
  | `Fixed` | Bug fixes |
  | `Security` | Fixes for vulnerabilities |

- **Compare links** at the bottom of the file turn every version heading into a link to the diff between that version and the previous one. The first version has no predecessor, so it links to its tag or release page instead.
- **Yanked releases** — versions pulled because of a serious bug or security issue — stay in the file, marked `## [X.Y.Z] - YYYY-MM-DD [YANKED]`, so nobody wonders whether the version ever existed.

### Mapping categories to a version bump

Keep a Changelog does not prescribe how categories map to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). In practice, the categories in `[Unreleased]` are a good heuristic for the next version number:

| `[Unreleased]` contains | Suggested bump |
|---|---|
| `Removed`, or any entry marked `**BREAKING:**` | Major (`2.4.1` → `3.0.0`) |
| `Added` or `Deprecated` (and nothing breaking) | Minor (`2.4.1` → `2.5.0`) |
| Only `Fixed` and/or `Security` | Patch (`2.4.1` → `2.4.2`) |

`Changed` is deliberately absent from the table: a changed behaviour can be backward compatible (minor) or breaking (major), and only the author knows which. Before `1.0.0`, SemVer treats the public API as unstable; a common convention is to bump the minor version for breaking changes and the patch version for everything else.

This is the same signal [Conventional Commits](conventional-commits.md) encodes in commit messages (`feat` → minor, `fix` → patch, `!` → major). The changelog is where that signal is presented to humans.

### Lifecycle

```
  pull request                        release                    tag
  ────────────                        ───────                    ───
  merges a change ──► entry added ──► [Unreleased] becomes ──► vX.Y.Z tagged
                      under            [X.Y.Z] - YYYY-MM-DD,     on the commit
                      [Unreleased]     new empty [Unreleased]    that cut it
                                       added on top,
                                       compare links updated
```

The changelog is updated in the same pull request as the change, not reconstructed at release time. The release step only renames the section, adds the date, and updates the links; then the commit is tagged (see [Tags and Releases](tags-and-releases.md)). The detailed procedure — manual, with fragments, or generated from commits — is in [Maintaining a Changelog](maintaining-a-changelog.md).

### Does it grow forever?

Yes, and usually that is fine:

- Text is cheap. Projects with more than a decade of releases have changelogs of a few hundred kilobytes.
- Newest-first ordering means nobody reads the whole file — readers stop as soon as they reach their current version.
- Old entries stay useful for anyone upgrading across many versions at once.

When the file becomes unwieldy to browse, the usual mitigations are:

- **Archive per major version.** Keep the current major in `CHANGELOG.md` and move older ones to files such as `docs/changelog/1.x.md`, linked from the bottom of the main file.
- **One file per version**, with an index — common in large projects that publish long release notes.
- **Use the hosting platform's releases page** as the main reading surface, with the file as its source.

Whatever the mitigation, **never delete old entries** — that removes the only place where that history is written for users.

---

## Examples

### A complete changelog

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Cursor-based pagination for `client.list()`.

## [2.1.0] - 2026-10-01

### Added
- `timeout` option on the client constructor.

### Deprecated
- `client.fetchAll()` — use `client.list()` instead. It will be removed in 3.0.0.

### Fixed
- Retries now respect the `Retry-After` response header.

### Security
- Upgrade the HTTP parser to fix CVE-2026-0001 (request smuggling).

## [2.0.0] - 2026-08-15

### Removed
- **BREAKING:** Drop support for Node.js 18.

### Changed
- **BREAKING:** `client.get()` now rejects on non-2xx responses instead of resolving with the error body.

## [1.4.2] - 2026-07-02 [YANKED]

### Fixed
- Connection pool no longer leaks sockets on timeout.

[Unreleased]: https://github.com/<owner>/<repo>/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/<owner>/<repo>/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/<owner>/<repo>/compare/v1.4.2...v2.0.0
[1.4.2]: https://github.com/<owner>/<repo>/compare/v1.4.1...v1.4.2
```

### Bad entries next to good ones

```markdown
<!-- Bad: copied from git log — internal, vague, or meaningless to users -->
### Changed
- refactor RetryPolicy (a1b2c3d)
- Merge pull request #482 from feature/pagination
- misc fixes and improvements
- update deps

<!-- Good: each entry states the effect a user can observe -->
### Changed
- Retries back off exponentially (100 ms, 200 ms, 400 ms) instead of every 100 ms.

### Fixed
- `client.list()` no longer returns duplicate items when a page boundary changes during iteration.

### Security
- Upgrade the TLS library to fix CVE-2026-0002.
```

---

## When to use

- **Libraries, SDKs, and packages** consumed by other projects — the changelog is how consumers decide whether to bump a dependency.
- **Public APIs, CLIs, and plugins** with versioned releases, where users need to know what breaks and what is deprecated.
- **Mobile and desktop apps** that ship discrete versions — the changelog feeds store release notes and support teams.
- **Internal shared components** (design systems, platform libraries) consumed by other teams on their own release cadence.
- Practices that keep it useful:
  - Update it **in the same pull request** as the change, under `[Unreleased]`.
  - Write each entry for the **consumer**: what they will notice, not how it was built.
  - Mark breaking changes explicitly (`**BREAKING:**`) and say what to do instead.
  - **Deprecate before removing**: an entry under `Deprecated` in one release, then under `Removed` in a later major release.
  - Keep the category names and order fixed, dates in ISO 8601, and compare links up to date.

## When NOT to use

- **As a copy of `git log`.** A changelog that lists every commit is noise; readers stop trusting it, and the important entries are lost among merges and typo fixes.
- **Hiding breaking changes** in the middle of other entries, or under `Changed` without a marker — the one entry readers most need is the one they miss.
- **Removing without deprecating.** A `Removed` entry with no earlier `Deprecated` entry means consumers had no warning.
- **Vague entries** such as "bug fixes", "performance improvements", "various updates" — they say nothing a reader can act on.
- **Inconsistent formats** — mixed date formats, ad-hoc categories, versions out of order — which make the file hard to scan and impossible to parse.
- **Generating it from commits without commit discipline.** Tools that build a changelog from [Conventional Commits](conventional-commits.md) only produce a good result when every commit follows the convention and is written for the user; otherwise the output is `git log` with headings.
- **When it adds little**: an internal application deployed continuously, with no consumers who pick a version. There, deploy logs and links to the merged pull requests cover the need, and a changelog becomes ceremony that nobody reads.
- **Rewriting released sections.** Once a version is published, its entries are history; fix mistakes with a new entry rather than silently editing the past.

## References

- [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) — the de facto standard format and its rationale.
- [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) — the versioning scheme changelog sections usually follow.
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) — commit format that tooling uses to generate changelogs and version bumps.
- [GNU Coding Standards — Change Logs](https://www.gnu.org/prep/standards/html_node/Change-Logs.html) — the historical `ChangeLog` format the modern convention evolved from.
