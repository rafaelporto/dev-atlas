---
type: concept
tags:
  - tool
related: []
language: null
---
# Git Internals

> Underneath the porcelain commands, Git is a small content-addressable object store and a set of named pointers into it — understanding both makes every other Git operation obvious.

---

## What is it?

Git's internals are the data structures Git keeps inside the `.git/` directory and the rules for reading and writing them. Most everyday Git commands (`add`, `commit`, `merge`, `rebase`) are convenience wrappers — the **porcelain** — over a smaller set of low-level commands — the **plumbing** — that read and write four object types in a key-value store and update a handful of named pointers.

Two facts capture most of the model:

1. **Every Git object is identified by the SHA-1 (or SHA-256) hash of its content.** Identical content produces identical hashes, anywhere on Earth.
2. **A branch is just a file containing a commit hash.** Nothing more.

---

## Why does it matter?

Git's porcelain commands are dozens of sub-commands with overlapping flags and historical baggage. Memorizing them is exhausting and brittle. Understanding the plumbing — four object types, a few pointers, an index file — collapses all of that into a small mental model that explains every higher-level operation:

- A commit hash does not change when you rename a branch. It is the same commit. The branch is a separate, mutable label.
- `git reset` does not destroy commits — it moves a branch pointer to a different commit, leaving the old commits unreferenced until garbage collection eventually reclaims them.
- A "merge conflict" is the index disagreeing with itself about what the next commit's tree should look like.
- `git push` succeeds when the remote can fast-forward its branch pointer to your commit; it fails when doing so would orphan commits.

Once these primitives are clear, the rest of Git — and especially recovering from mistakes — follows directly.

---

## How it works

### The object database

Inside `.git/objects/` Git stores objects, each named by the SHA hash of its content. There are four object types:

```
┌────────┐  Stores the contents of a single file. No filename, no metadata —
│ blob   │  just the bytes. Two files with identical content share one blob.
└────────┘

┌────────┐  Stores a directory listing: lines of (mode, type, hash, name).
│ tree   │  Each entry's hash points to a blob (file) or another tree (subdir).
└────────┘

┌────────┐  Stores: tree hash + parent commit hash(es) + author + committer
│ commit │  + message. A commit "is" a snapshot of a whole tree at a moment.
└────────┘

┌────────┐  An immutable, optionally signed pointer to another object —
│ tag    │  almost always a commit. (Lightweight tags are not objects; see
└────────┘  tags-and-releases.md.)
```

Hashes are content-addressed: a commit's hash transitively covers its tree, every blob and tree reachable from that tree, and every ancestor commit. Rewriting any byte anywhere in that graph changes the commit's hash. This is what makes Git tamper-evident.

```
                              commit C2 (parent: C1)
                              ├── tree T2
                              │   ├── README.md  → blob B1
                              │   └── src/       → tree T3
                              │                       └── main.go → blob B2
                              │
   commit C1 (root)           Sharing: if README.md is unchanged in C2,
   └── tree T1                T2 reuses blob B1 from T1.
       ├── README.md → blob B1
       └── src/      → tree T3 (different src, different hash)
```

### Refs — the mutable layer

Objects are immutable. The mutable part of Git is **refs**, plain text files under `.git/refs/`:

```
.git/refs/heads/main          # contains: 9f3a... (a commit hash) — a branch
.git/refs/heads/feature       # contains: a8e1... — another branch
.git/refs/tags/v1.0.0         # contains: 7c2b... — a tag
.git/refs/remotes/origin/main # contains: 9f3a... — last known position of origin's main
.git/HEAD                     # contains: ref: refs/heads/main — symbolic ref to current branch
```

A "branch" in Git is exactly a file under `refs/heads/` whose contents are a commit hash. `git commit` writes a new commit object, then updates the file `HEAD` points at to contain the new hash. That is it.

For performance, frequently used refs may be **packed** into `.git/packed-refs` instead of stored as individual files; the meaning is unchanged.

### The index (staging area)

Between the working tree (your files on disk) and the next commit Git will create sits the **index**, a binary file at `.git/index`. The index is a flat list of (path, blob hash, mode, stat info) entries — essentially the tree Git would build if you ran `git commit` right now.

`git add <file>` reads the file, writes its content as a blob, and updates the index entry to point at that blob. `git commit` turns the index into a tree (building parent trees as needed), writes a commit object pointing to that tree, and moves `HEAD` forward.

This is why the staging area is more than UI flair — it is the literal data structure that becomes the next commit. See [staging-area](staging-area.md) for the three-stage model in depth.

### Packs and garbage collection

Storing every object as a separate compressed file is fine for small repos. Large repos accumulate millions of objects, so Git periodically **packs** them: deltas between similar objects are computed, and many objects are stored together in a single `.pack` file with an `.idx` index.

Unreferenced objects (objects no longer reachable from any branch, tag, or `HEAD`) are eventually removed by `git gc`. Until they are removed, they remain recoverable via the **reflog** (`.git/logs/`), which records every move of every ref. See [reflog-recovery](reflog-recovery.md).

---

## Examples

Inspect what `git init` actually creates:

```bash
git init demo
cd demo
ls -la .git/

# Output:
#   HEAD              -> ref: refs/heads/main
#   config            (repo-local config)
#   description       (used by GitWeb; harmless)
#   hooks/            (sample hook scripts)
#   info/             (exclude file)
#   objects/          (empty — no objects yet)
#   refs/             (heads/ and tags/ — both empty)
```

Make a commit and walk the objects it creates:

```bash
echo "hello" > README.md
git add README.md
git commit -m "Initial commit"

# Show what HEAD points to:
cat .git/HEAD
# ref: refs/heads/main

cat .git/refs/heads/main
# 9f3a... (the commit hash)

# Show the commit object:
git cat-file -p HEAD
# tree 4b825dc6...
# author ...
# committer ...
#
# Initial commit

# Show the tree the commit points to:
git cat-file -p 4b825dc6...
# 100644 blob ce0136... README.md

# Show the blob's contents:
git cat-file -p ce0136...
# hello
```

Create a blob manually with the plumbing — no `git add`, no commit:

```bash
echo "raw content" | git hash-object -w --stdin
# Output: a hash, e.g. 8baef1...

# The blob is now in .git/objects/, even though no commit references it:
git cat-file -p 8baef1...
# raw content
```

Garbage collection will reclaim this blob eventually because nothing references it. To keep it, you would have to make it part of a tree, of a commit, of a branch.

---

## When to use

- When debugging "impossible" Git problems — understanding objects and refs tells you *what* happened, not just *what* a command did.
- When writing tooling that interacts with Git — hooks, CI scripts, custom merge drivers — using plumbing commands gives stable, scriptable behavior.
- When teaching Git to engineers who keep memorizing commands without retaining them. The model is smaller than the commands.

## When NOT to use

- In day-to-day work, prefer porcelain (`add`, `commit`, `switch`, `merge`). Plumbing is awkward and verbose for normal use.
- When the answer is "just run the porcelain command and move on" — don't reach for `cat-file` to inspect things that `git log` will tell you instantly.

## References

- [Pro Git — Chapter 10: Git Internals](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain) — the canonical reference.
- [Git for Computer Scientists](https://eagain.net/articles/git-for-computer-scientists/) — a short, precise description of the data model.
- [Write yourself a Git!](https://wyag.thb.lt/) — implement a Git clone from scratch in Python; the fastest way to internalize the model.
- [git-scm — Reference: Internals](https://git-scm.com/docs#_low_level_commands_plumbing) — list of plumbing commands.
