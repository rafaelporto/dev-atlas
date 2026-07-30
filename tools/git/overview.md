---
type: concept
tags:
  - tool
  - overview
related: []
language: null
---
# Git

> A distributed version control system that tracks changes to files as a content-addressable graph of immutable snapshots, designed for speed, integrity, and non-linear collaboration.

---

## What is it?

Git is a tool that records the history of a set of files and lets many people work on those files in parallel without losing each other's changes. Every copy of a Git repository contains the full history; there is no privileged "server" the way there is in older systems like Subversion or CVS. Operations that other systems require a network round-trip for — diffing, log inspection, branching, committing — are local and effectively instantaneous in Git.

Git was created by Linus Torvalds in April 2005, after the proprietary tool the Linux kernel had been using (BitKeeper) revoked its free-for-open-source license. Torvalds wrote the initial version in roughly two weeks. The design priorities, in order, were: speed, simple internal model, strong support for non-linear development (branching), fully distributed operation, and the ability to handle very large projects efficiently. Today Git underpins the overwhelming majority of source code hosted publicly on the internet.

---

## Why does it matter?

Modern software is built by groups of people changing the same files at the same time. Git is the lingua franca for coordinating that work. Even engineers who never run `git` from the command line interact with Git through GitHub, GitLab, Bitbucket, IDE plugins, or CI systems that read its history.

Beyond collaboration, Git provides a *cryptographically verifiable* history. Every commit is identified by a SHA hash that depends on the commit's contents, its parents, and the entire tree it points to. Rewriting any past change produces a different hash, which makes silent tampering detectable. This is why Git is used not just for source code but for configuration repositories, infrastructure-as-code, and any context where a tamper-evident audit trail of changes matters.

The distributed model also matters operationally. A developer on a plane can branch, commit, rebase, and inspect history with no network. A team can keep working when the central host is down. Disaster recovery is trivial because every clone is a full backup.

---

## How it works

At the bottom, Git is a **content-addressable key-value store** with a small layer of conventions on top. The store lives inside the `.git/` directory at the root of every repository. The store contains four kinds of objects:

```
┌──────────┐   points to a single file's contents
│  blob    │   ──────────────────────────────────
└──────────┘

┌──────────┐   points to a directory: a list of (mode, name, hash) entries,
│  tree    │   each entry's hash references a blob (file) or another tree (subdir)
└──────────┘

┌──────────┐   points to a top-level tree + author + committer + message
│  commit  │   + zero or more parent commit hashes
└──────────┘

┌──────────┐   a named, signed pointer to another object (usually a commit)
│  tag     │
└──────────┘
```

Every object is stored under a filename equal to the SHA-1 (or SHA-256, in newer repos) of its content. A commit's hash transitively covers everything reachable from it: its tree, every file in that tree, every parent commit, and so on back to the root. Two commits with identical content have identical hashes; two commits that differ by a single byte have completely different hashes.

**Branches** and **tags** are not objects — they are simply files in `.git/refs/` whose contents are the hash of a commit. A branch is "just a pointer." `git commit` creates a new commit object and moves the current branch's pointer forward to it. `HEAD` is a special pointer that names the currently checked-out branch (or, when detached, a specific commit).

For deeper detail on the object model and how this fits together, see [git-internals](internals.md).

The user-facing layer — `git add`, `git commit`, `git push`, `git merge` — is implemented in terms of these primitives. Understanding the primitives makes the rest of Git much less surprising.

---

## Examples

A minimal end-to-end session that exercises the core ideas:

```bash
# Create a new repository (initializes .git/)
git init myproject
cd myproject

# Write a file and add it to the staging area (index)
echo "hello" > README.md
git add README.md

# Record a commit — creates a blob, a tree, and a commit object
git commit -m "Initial commit"

# Inspect the commit graph
git log --oneline --graph

# Create a branch, switch to it, make a divergent change
git switch -c feature
echo "more" >> README.md
git commit -am "Extend README"

# Switch back to the main line and merge the work
git switch main
git merge feature

# Push to a remote (assumes 'origin' has been configured)
git push origin main
```

Inspect the raw objects Git produced. Each command shows that the user-facing operations are thin wrappers over the content-addressable store:

```bash
# Show the last commit object as Git stores it
git cat-file -p HEAD

# Output (truncated):
#   tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904
#   parent <hash>
#   author Jane Doe <email> 1700000000 +0000
#   committer Jane Doe <email> 1700000000 +0000
#
#   Extend README

# Show the tree the commit points to
git cat-file -p 4b825dc6...

# Show the blob a tree entry references
git cat-file -p <blob-hash>
```

---

## When to use

- Any project where more than one person changes the same files, or where the same person needs to track changes over time.
- Code that needs a verifiable history — auditing, compliance, security-sensitive infrastructure.
- Distributed teams or any workflow where contributors must work offline or independently and integrate later.
- Projects hosted on GitHub, GitLab, Bitbucket, Gitea, or any platform that speaks Git natively.

## When NOT to use

- Very large binary assets that change frequently (uncompressible video, design files, game assets) — Git tracks full snapshots and the repository grows quickly. Use [Git LFS](https://git-lfs.com/) or a purpose-built tool like Perforce, Plastic SCM, or DVC.
- Monorepos at extreme scale where the working tree alone exceeds tens of gigabytes. Companies in this category (Google, Meta) use proprietary VCS or heavy Git extensions (Microsoft's [Scalar](https://github.com/microsoft/scalar), Meta's [Sapling](https://sapling-scm.com/)).
- Tracking ephemeral state that does not benefit from history — generated artifacts, log files, build outputs. Use `.gitignore` to keep them out.
- Strictly linear, single-author workflows where the overhead of branches, merges, and remotes is pure ceremony — though even then, Git's audit log is often worth the small ceremony.

## References

- [Pro Git book](https://git-scm.com/book/en/v2) — Scott Chacon and Ben Straub. The canonical free reference; chapter 10 covers internals.
- [Git official documentation](https://git-scm.com/doc) — reference manual and tutorials.
- [Git for Computer Scientists](https://eagain.net/articles/git-for-computer-scientists/) — a short, precise description of Git's data model.
- [A Hacker's Guide to Git](https://wildlyinaccurate.com/a-hackers-guide-to-git/) — Joseph Wynn. Plumbing-first introduction.
- [Linus Torvalds — Tech Talk: Linux Git (Google, 2007)](https://www.youtube.com/watch?v=4XpnKHJAok8) — original design rationale, including why distributed.
