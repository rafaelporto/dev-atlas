---
type: concept
tags:
  - tool
related: []
language: null
---
# The Staging Area

> Git's three-stage model — working tree, index, repository — gives you a sandbox to compose the next commit before it becomes history.

---

## What is it?

The **staging area** (also called the **index**, or **cache** in older docs) is an intermediate snapshot of files sitting between your working tree and the next commit Git will create. It is a real file on disk, `.git/index`, listing every path that will be part of the next commit and the blob hash of its contents.

Git uses a three-stage model:

```
┌────────────────┐   git add    ┌────────────────┐   git commit   ┌────────────────┐
│  Working tree  │ ───────────▶ │  Index / stage │ ─────────────▶ │   Repository   │
│ (files on disk)│              │ (.git/index)   │                │  (.git/objects)│
└────────────────┘              └────────────────┘                └────────────────┘
        ▲                              │                                  │
        └──────── git checkout / restore ──────────────────────────────────┘
```

Most version control systems have only two: the working copy and the repository. The staging area is what makes Git different.

---

## Why does it matter?

The index lets you **compose a commit** rather than just snapshot whatever is on disk. You can:

- Stage some files and leave others. Two unrelated changes in your working tree become two separate commits with focused messages.
- Stage parts of a single file (`git add -p`). A bug fix and a refactor that landed in the same file go into separate commits.
- Inspect what is about to be committed (`git diff --staged`) versus what is not yet staged (`git diff`).
- Resolve merge conflicts as a sequence of edits to the index, not the working tree.

The cost is one extra concept to learn. The payoff is clean, reviewable, bisectable history: commits that each represent one logical change rather than one snapshot in time.

---

## How it works

The index is a flat list of entries. Each entry holds:

- The file's path.
- The blob hash of the file's contents.
- The file mode (`100644` normal, `100755` executable, `120000` symlink).
- Cached `stat()` info (mtime, size, inode) used to detect whether the working file has changed since it was staged — this is what makes `git status` fast on large repos.

```
.git/index entries:
┌──────────────────────────────────────────────────────────────────────────┐
│ 100644  ce0136... README.md          stat(...)                           │
│ 100644  8baef1... src/main.go        stat(...)                           │
│ 100755  4a1b22... scripts/build.sh   stat(...)                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### What each command does to the index

| Command | Effect |
|---|---|
| `git add <file>` | Read the file, write a blob, update the index entry for `<file>`. |
| `git add -p` | Interactively pick hunks to stage. The unselected hunks remain in the working tree but are not in the index. |
| `git rm <file>` | Remove the entry from the index *and* delete from the working tree. |
| `git rm --cached <file>` | Remove from the index only; the file stays on disk but is no longer tracked. |
| `git restore --staged <file>` | Reset the index entry to match `HEAD` — unstages the file. |
| `git restore <file>` | Copy the index version of the file back into the working tree — discards uncommitted changes. |
| `git commit` | Build a tree from the index, write a commit pointing to that tree, advance the branch. |
| `git commit -a` | Add every modified, already-tracked file to the index first, then commit. **Untracked files are not included.** |

### Three diffs, three questions

Because there are three states (working tree, index, last commit), there are three useful diffs:

```bash
git diff              # working tree vs index  → "what have I changed but not staged?"
git diff --staged     # index vs HEAD          → "what am I about to commit?"
git diff HEAD         # working tree vs HEAD   → "all uncommitted changes, combined"
```

### Merge conflicts and the index

During a conflict, the index holds *three* versions of each conflicted file:

- **Stage 1** — the common ancestor.
- **Stage 2** — the version from `HEAD` (yours).
- **Stage 3** — the version being merged in (theirs).

Editing the file and running `git add` collapses these into a single stage-0 entry, which is what `git commit` will record. `git status` shows conflicted paths until every entry is resolved.

---

## Examples

Compose two commits from a mixed working tree:

```bash
# Two unrelated changes in two files
echo "# fix login bug" >> src/auth.go
echo "// refactor: extract helper" >> src/db.go

# Stage and commit just the auth fix
git add src/auth.go
git diff --staged              # confirms only auth.go is staged
git commit -m "fix: handle empty session token"

# Now stage and commit the refactor
git add src/db.go
git commit -m "refactor(db): extract query helper"
```

Split a single file into two commits:

```bash
# src/util.go has both a bug fix and an unrelated whitespace cleanup.
git add -p src/util.go
# (y to stage the bug-fix hunk, n to skip the whitespace hunk)
git commit -m "fix(util): correct off-by-one in pagination"

# Now stage the rest
git add src/util.go
git commit -m "style: normalize whitespace in util.go"
```

Inspect the index directly:

```bash
git ls-files --stage
# 100644 ce0136... 0  README.md
# 100644 8baef1... 0  src/main.go
# Stage 0 = no conflict. Stages 1/2/3 only appear during merges.
```

Recover from a wrong `git add`:

```bash
git add src/secret.env       # oops
git restore --staged src/secret.env   # unstage
echo "src/secret.env" >> .gitignore
```

---

## When to use

- When a commit should represent **one logical change**, not "everything I happened to be doing this afternoon."
- When reviewing your own work before committing — `git diff --staged` is a last sanity check on what is about to enter history.
- When working with merge conflicts — the index is the data structure you are resolving.
- When using interactive add to break large changes into focused commits.

## When NOT to use

- For experimental "save points" while exploring. The staging area is not a workspace snapshot tool — make throwaway commits or use [stash](stash.md) instead.
- As a substitute for branches. If a change is large enough that you want to set it aside and come back later, branch or stash; don't leave it in the index for days.

## References

- [Pro Git — Recording Changes to the Repository](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository).
- [Pro Git — Reset Demystified](https://git-scm.com/book/en/v2/Git-Tools-Reset-Demystified) — the clearest written explanation of working tree vs index vs HEAD.
- [git-scm — git-add(1)](https://git-scm.com/docs/git-add) — full reference including `-p` and `-i` interactive modes.
- [git-scm — gitformat-index(5)](https://git-scm.com/docs/gitformat-index) — binary format of the `.git/index` file.
