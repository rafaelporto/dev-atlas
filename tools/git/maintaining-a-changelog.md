---
type: how-to
tags:
  - tool
related:
  - tools/git/changelog
  - tools/git/conventional-commits
  - tools/git/tags-and-releases
language: null
---
# How to Maintain a Changelog

> Keep a `CHANGELOG.md` in the Keep a Changelog format up to date — by hand on every pull request, with per-PR fragments, or generated from Conventional Commits — and enforce it in CI.

---

## Prerequisites

- A Git repository that publishes versioned releases following [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and marks each release with a tag (see [Tags and Releases](tags-and-releases.md)).
- Familiarity with the format itself — categories, `[Unreleased]`, compare links — described in [Changelog](changelog.md).
- Optional, per step:
  - Step 4 (fragments): Node.js for **Changesets**, or Python for **towncrier**.
  - Step 5 (generation): commits that follow [Conventional Commits](conventional-commits.md); a GitHub repository for **release-please** (it runs as a GitHub Action, no local install); the **git-cliff** binary (`brew install git-cliff` or `cargo install git-cliff`).
  - Step 6 (CI): permission to add a workflow to the repository (the example uses GitHub Actions).

---

## Steps

### 1. Create the file

Create `CHANGELOG.md` at the repository root with the standard header and an empty `[Unreleased]` section:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

[Unreleased]: https://github.com/<owner>/<repo>/compare/v1.2.0...HEAD
```

If the project already has releases, list the existing tags to decide whether to backfill one section per version:

```bash
git tag --list 'v*' --sort=-v:refname     # newest first
git log -1 --format=%cs v1.2.0            # date of a tag, in ISO 8601
git log --oneline v1.1.0..v1.2.0          # commits that went into 1.2.0
```

Backfilling is optional. Starting with only `[Unreleased]` and documenting from now on is a legitimate choice for a project with a long untracked history.

### 2. Add an entry to `[Unreleased]` in every pull request

Each pull request that changes something a user can notice adds one line under `[Unreleased]`, in the right category:

```markdown
## [Unreleased]

### Added
- Cursor-based pagination for `client.list()`.

### Fixed
- Retries now respect the `Retry-After` response header.
```

Guidelines for the entry:

- Describe the **effect**, not the implementation: "Retries respect `Retry-After`", not "refactor RetryPolicy".
- Mark breaking changes with `**BREAKING:**` and say what to do instead.
- Do not add entries for changes users cannot observe: CI config, test-only changes, internal refactors, dependency bumps with no visible effect.
- Leave out commit hashes and author names — the compare links and the pull request already carry them.

### 3. Cut a release

When releasing, turn `[Unreleased]` into a version section. Pick the version from the categories present (Removed or `**BREAKING:**` → major; Added or Deprecated → minor; only Fixed/Security → patch), and get today's date:

```bash
date +%F    # e.g. 2026-10-23
```

Edit the file — add the new heading below `[Unreleased]` and update the compare links:

```diff
 ## [Unreleased]

+## [1.3.0] - 2026-10-23
+
 ### Added
 - Cursor-based pagination for `client.list()`.

-[Unreleased]: https://github.com/<owner>/<repo>/compare/v1.2.0...HEAD
+[Unreleased]: https://github.com/<owner>/<repo>/compare/v1.3.0...HEAD
+[1.3.0]: https://github.com/<owner>/<repo>/compare/v1.2.0...v1.3.0
```

Commit the change, then tag that commit and push both:

```bash
git add CHANGELOG.md
git commit -m "chore(release): 1.3.0"
git tag -a v1.3.0 -m "v1.3.0"
git push origin main v1.3.0
```

Optionally, publish the section as the release notes on GitHub:

```bash
awk '/^## \[1\.3\.0\]/{f=1; next} /^## \[/{f=0} f' CHANGELOG.md > release-notes.md
gh release create v1.3.0 --title "v1.3.0" --notes-file release-notes.md
```

### 4. Optional: use fragments to avoid merge conflicts

When many pull requests are open at once, they all edit the same lines under `[Unreleased]` and conflict with each other. Fragment tools solve this: each pull request adds its **own small file**, and the release step merges the fragments into `CHANGELOG.md` and deletes them.

**Changesets** (JavaScript/TypeScript, especially monorepos):

```bash
npm install --save-dev @changesets/cli
npx changeset init          # creates .changeset/
npx changeset               # interactive: pick packages, bump type, write the summary
```

Each run creates a file such as `.changeset/brave-lions-sing.md`:

```markdown
---
"my-client": minor
---

Add cursor-based pagination to `client.list()`.
```

At release time:

```bash
npx changeset version       # bumps versions, writes CHANGELOG.md, deletes the fragments
```

Changesets writes its own headings (`### Minor Changes`, `### Patch Changes`) rather than the Keep a Changelog categories; accept that, or customize the output with a custom `changelog` generator in `.changeset/config.json`.

**towncrier** (Python, but language-agnostic in practice). Configure Keep a Changelog categories in `towncrier.toml`:

```toml
[tool.towncrier]
directory = "changes"
filename = "CHANGELOG.md"

[[tool.towncrier.type]]
directory = "added"
name = "Added"
showcontent = true

[[tool.towncrier.type]]
directory = "fixed"
name = "Fixed"
showcontent = true
```

Each pull request adds a fragment named `<issue-or-pr-number>.<type>.md`:

```bash
echo 'Retries now respect the `Retry-After` response header.' > changes/482.fixed.md
```

At release time:

```bash
towncrier build --version 1.3.0     # writes the section, deletes the fragments
```

### 5. Optional: generate the changelog from Conventional Commits

If every commit follows [Conventional Commits](conventional-commits.md), a tool can classify the commits since the last tag, pick the next version, and write the section for you.

**release-please** keeps a "release pull request" open that accumulates the changelog and the version bump; merging it creates the tag and the GitHub Release. Minimal workflow at `.github/workflows/release-please.yml`:

```yaml
name: release-please
on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: simple
```

release-please uses its own headings (`### Features`, `### Bug Fixes`); the `changelog-sections` option in its config file renames them.

**git-cliff** generates the changelog locally or in CI from a template. It ships a Keep a Changelog template:

```bash
git cliff --init keepachangelog     # creates cliff.toml
```

Tune which commits land in which category in `cliff.toml`:

```toml
[git]
conventional_commits = true
filter_unconventional = true
commit_parsers = [
  { message = "^feat", group = "Added" },
  { message = "^fix", group = "Fixed" },
  { message = "^perf", group = "Changed" },
  { message = "^(chore|ci|build|test|style|docs)", skip = true },
]
```

Generate and release:

```bash
git cliff --bumped-version                   # prints the next version, e.g. v1.3.0
git cliff --tag v1.3.0 --output CHANGELOG.md # rewrites the file including the new section
```

Whichever tool you pick, it becomes the **only** writer of `CHANGELOG.md` — hand edits are overwritten on the next run. Fix bad entries by fixing the commit messages (or the tool's config), not the file. **semantic-release** is a further option in the same family: fully automated releases on every merge, with changelog writing provided by a plugin.

### 6. Enforce it in CI

A pull request check catches forgotten entries. It fails unless `CHANGELOG.md` changed or the pull request carries a `skip-changelog` label (for changes with no user-visible effect). `.github/workflows/changelog.yml`:

```yaml
name: changelog
on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]

jobs:
  changelog:
    if: ${{ !contains(github.event.pull_request.labels.*.name, 'skip-changelog') }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Require a CHANGELOG.md entry
        run: |
          git diff --name-only "origin/${{ github.base_ref }}...HEAD" | grep -qx 'CHANGELOG.md' \
            || { echo "::error::Add an entry under [Unreleased] in CHANGELOG.md, or apply the skip-changelog label."; exit 1; }
```

With fragments (step 4), check for a new file in `.changeset/` or `changes/` instead. With full generation (step 5), skip this check and lint the commit messages instead.

---

## Verification

After cutting a release, check the file against this list:

- [ ] `## [Unreleased]` is the first section and is empty (or holds only changes merged after the release).
- [ ] The new version heading reads `## [X.Y.Z] - YYYY-MM-DD` and sits directly below `[Unreleased]`.
- [ ] Versions are in descending order, with no duplicates.
- [ ] Only the six categories appear, in order: Added, Changed, Deprecated, Removed, Fixed, Security.
- [ ] The compare links exist for `[Unreleased]` and the new version, and point to tags that exist:

  ```bash
  git tag --list 'v1.3.0' 'v1.2.0'    # both must be printed
  ```

- [ ] Nothing user-visible was left out — skim the commits and the changed files of the release:

  ```bash
  git log --oneline v1.2.0..v1.3.0
  git diff --stat v1.2.0..v1.3.0
  ```

On a hosting platform, open the `[1.3.0]` compare link from the rendered file and confirm it shows the expected diff.

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Every other pull request conflicts on `CHANGELOG.md` | All pull requests append to the same lines under `[Unreleased]` | Rebase and keep both entries; if it happens often, switch to fragments (step 4) |
| Compare link returns 404 | Link added before the tag was pushed, or tag prefix mismatch (`v1.3.0` vs `1.3.0`) | Push the tag; make the links use the same prefix as the tags |
| Release cut but links still point to the previous version | Section renamed without updating the footer | Update `[Unreleased]` to compare from the new tag and add the new version's link |
| Version bump does not match the content | A `Removed` or `**BREAKING:**` entry released as a minor or patch | If not yet published, re-cut as a major; if published, release a new major and note the mistake — do not move the tag |
| Same change listed twice | Entry added by hand and again by a generator, or kept twice in a conflict resolution | Pick one writer for the file; remove the duplicate from `[Unreleased]` before release |
| Generated changelog lists internal commits | `chore`, `ci`, `test`, or `refactor` commits not excluded by the generator config | Add `skip` rules for those types (git-cliff `commit_parsers`, release-please `changelog-sections` with `hidden: true`) |

---

## References

- [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/) — the format this guide maintains.
- [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) — how to choose the version number.
- [Changesets](https://github.com/changesets/changesets) — per-PR changeset files, versioning, and changelog generation for JavaScript projects.
- [towncrier](https://towncrier.readthedocs.io/en/stable/) — news-fragment-based changelog builder.
- [release-please](https://github.com/googleapis/release-please) and [release-please-action](https://github.com/googleapis/release-please-action) — release pull requests generated from Conventional Commits.
- [git-cliff — Configuration](https://git-cliff.org/docs/configuration) — template-based changelog generator.
- [GitHub Docs — Automatically generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes).
