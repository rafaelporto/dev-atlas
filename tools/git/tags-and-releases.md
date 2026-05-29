---
type: concept
tags: []
related: []
language: null
---
# Tags and Releases

> Tags are immutable, human-meaningful names for specific commits — usually a release; annotated tags add author, date, message, and an optional cryptographic signature.

---

## What is it?

A **tag** is a named reference to a specific commit, intended never to move. Where a branch is a mutable pointer that advances with each commit, a tag is a permanent label — typically used to mark releases (`v1.0.0`, `v2.3.1`) or other meaningful points in history.

Git has two kinds of tags:

- **Lightweight tag** — just a file under `.git/refs/tags/` containing a commit hash. No metadata. Functionally identical to a branch that nobody updates.
- **Annotated tag** — a full Git object stored in `.git/objects/`, containing a tagger name and email, a timestamp, a message, and a pointer to the commit. Can be GPG- or SSH-signed.

Annotated tags are the right default for anything that marks an official release. Lightweight tags are fine for personal bookmarks or scripts.

A **release** is a project-level concept layered on top of tags. Platforms like GitHub and GitLab expose "Releases" UIs that attach release notes, downloadable artifacts, and pre-release flags to a tag. The tag is the canonical anchor; the release page is metadata around it.

---

## Why does it matter?

Tags answer the question "what version of the code did we ship?" with a single, immutable identifier. Without tags, identifying a release means knowing a commit hash, which is opaque and easy to lose. With tags:

- `git checkout v1.4.2` jumps to the exact code shipped as 1.4.2.
- `git log v1.4.2..v1.5.0` shows every commit that went into the next release.
- `git diff v1.4.2 v1.5.0` shows exactly what changed between releases.
- Package managers, container registries, and CDN paths can be keyed off tag names.
- A signed tag is a verifiable claim that a particular maintainer authorized this version.

Tags also enforce a contract with users: a published `v1.4.2` should *never* change. Re-tagging a different commit as `v1.4.2` after release breaks every consumer's checksum, cache, and trust assumption.

---

## How it works

### Lightweight vs annotated

```bash
# Lightweight
git tag v1.0.0

# Annotated
git tag -a v1.0.0 -m "Release 1.0.0"

# Annotated and signed
git tag -s v1.0.0 -m "Release 1.0.0"
```

Inspect the difference:

```bash
git cat-file -t v1.0.0
# commit      ← lightweight: the tag ref directly points at a commit
# tag         ← annotated:  the tag ref points at a tag object that points at the commit

git show v1.0.0
# (annotated) shows tagger, date, message, signature, then the commit.
# (lightweight) shows just the commit.
```

### Where tags live

```
.git/refs/tags/
├── v1.0.0       ← file containing a commit hash (lightweight)
└── v1.1.0       ← file containing a tag object hash (annotated)
```

Annotated tags live in `.git/objects/` like commits and blobs.

### Tags are not pushed by default

Unlike branches, `git push` does not push tags. They must be pushed explicitly:

```bash
git push origin v1.0.0           # push one tag
git push origin --tags           # push all local tags
git push --follow-tags           # push current branch + annotated tags reachable from it
```

`--follow-tags` is usually the right choice — it pushes only annotated tags that are reachable from the branch being pushed, avoiding accidentally publishing experimental lightweight tags.

### Deleting tags

```bash
git tag -d v1.0.0                       # locally
git push origin --delete v1.0.0         # on the remote
```

**Deleting and re-creating a published tag is dangerous.** Consumers may have cached the old commit hash; re-pointing the tag silently changes the world from their perspective. Treat published tags as permanent. If you must publish a corrected release, cut a new version (`v1.0.1`) instead.

### Semantic Versioning

Most projects tag using [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`, optionally with pre-release (`-rc.1`, `-beta.2`) and build metadata (`+sha.5114f85`). Conventional Commits ([conventional-commits](conventional-commits.md)) is designed to map commit types to SemVer bumps automatically.

The `v` prefix (`v1.0.0` vs `1.0.0`) is a convention — both are common, but consistency within a project matters more than the choice.

### Signed tags

Signed tags let downstream consumers verify that a release came from a trusted maintainer.

```bash
# Configure signing once
git config --global user.signingkey <key-id>
git config --global tag.gpgSign true

# Create a signed tag
git tag -s v1.0.0 -m "Release 1.0.0"

# Verify
git tag -v v1.0.0
# gpg: Good signature from "..." [ultimate]
```

GitHub displays a "Verified" badge on signed tags whose key is registered on the user's account. See [signing-commits](signing-commits.md) for the broader signing setup.

### GitHub / GitLab Releases

A platform "release" is not a Git concept — it is metadata stored on the host:

- A reference to the underlying tag.
- A release title and rich-text release notes (often generated from Conventional Commits).
- Attached binary assets (compiled binaries, source tarballs, signatures).
- Flags like "pre-release" and "latest".

Creating a release on GitHub via the CLI:

```bash
gh release create v1.0.0 \
    --title "v1.0.0" \
    --notes-file CHANGELOG.md \
    ./dist/myapp-linux-amd64 \
    ./dist/myapp-darwin-arm64
```

Without the platform-specific release object, a tag is still enough for everyone who installs from source.

---

## Examples

### Tag the current commit

```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

### Tag a past commit retroactively

```bash
git log --oneline                          # find the commit hash
git tag -a v0.9.0 9f3a1b2 -m "Release 0.9.0 (retroactive)"
git push origin v0.9.0
```

### List and inspect tags

```bash
git tag                                    # all tags, alphabetical
git tag -l 'v1.*'                          # filter by glob
git tag --sort=-creatordate | head -5      # 5 most recent

git show v1.0.0                            # tag metadata + diff of the tagged commit
git rev-parse v1.0.0                       # commit hash the tag points at
```

### See what changed between two releases

```bash
git log --oneline v1.4.2..v1.5.0
git diff v1.4.2 v1.5.0 -- src/
git shortlog v1.4.2..v1.5.0                # changes grouped by author
```

### Check out a release for inspection or hotfix

```bash
# Read-only inspection — detached HEAD is fine
git switch --detach v1.4.2

# To start a hotfix branch from a release
git switch -c hotfix/1.4.3 v1.4.2
```

### Replace a lightweight tag with an annotated one (before publishing)

```bash
git tag -d v1.0.0
git tag -a v1.0.0 -m "Release 1.0.0"
# Re-push only if not yet shared:
git push origin --force v1.0.0
```

Only do this for tags that have not been published. After release, never overwrite.

---

## When to use

- Marking releases — every published version of a library, application, or service should be tagged.
- Marking notable historical points: pre-major-refactor snapshots, last commit on a deprecated branch, security advisory boundaries.
- Triggering CI release pipelines — most CI systems can run jobs on tag push, often filtered to `v*` patterns.
- Generating changelogs and release notes between consecutive tags.

## When NOT to use

- As a way to "remember a commit" temporarily — use a branch instead. Tags are intended to be permanent.
- For moving labels like `latest` or `stable`. A tag is supposed to be immutable; using a moving tag re-introduces every problem tags exist to solve. Use a branch (`stable`), a release channel, or a package-manager `dist-tag` instead.
- To delete and re-create a published version. Once a tag is out, it is out. Cut a new version instead.

## References

- [Pro Git — Git Basics: Tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging) — canonical reference, covers both tag kinds in depth.
- [Pro Git — Signing Your Work](https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work) — GPG and SSH signing for tags and commits.
- [git-scm — git-tag(1)](https://git-scm.com/docs/git-tag).
- [Semantic Versioning 2.0.0](https://semver.org/) — the versioning scheme tags usually express.
- [GitHub Docs — About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).
- [GitLab Docs — Releases](https://docs.gitlab.com/ee/user/project/releases/).
