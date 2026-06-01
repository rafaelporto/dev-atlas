---
type: how-to
tags:
  - tool
related: []
language: null
---
# How to Recover Lost Commits with the Reflog

> The reflog records every move of HEAD and branch tips on your machine — making commits that look "gone" almost always recoverable.

---

## Prerequisites

- The lost commit must have existed locally at some point — the reflog records *your* history, not anyone else's.
- The recovery window has not elapsed. By default Git keeps reflog entries for 90 days (`gc.reflogExpire`) and unreachable objects for 30 days (`gc.reflogExpireUnreachable`). Inside that window, commits are reliably recoverable.
- You have not yet run `git gc --prune=now --aggressive` since the loss (which would have purged unreferenced objects immediately).

---

## Steps

### 1. Inspect the reflog

The reflog lists every position `HEAD` (or a specific branch) has held, most recent first:

```bash
git reflog
# c1d2e3f (HEAD -> main) HEAD@{0}: reset: moving to HEAD~3
# 9f3a1b2                HEAD@{1}: commit: feat(auth): add rate limiter
# 4b2c3d4                HEAD@{2}: commit: feat(auth): add login endpoint
# a8e1b2c                HEAD@{3}: commit: docs: update readme
# 5b21002                HEAD@{4}: clone: from https://github.com/...
```

Each line shows:

- The commit hash at that moment.
- The reflog selector — `HEAD@{N}` means "where HEAD was N moves ago."
- The action that moved HEAD (commit, reset, checkout, merge, rebase, etc.).
- The commit message or operation summary.

Per-branch reflogs also exist:

```bash
git reflog show main          # only entries that moved 'main'
git reflog show feature       # only entries that moved 'feature'
```

---

### 2. Find the lost commit

Scan the reflog output for the action that destroyed the commit — usually one of:

| Action | What likely happened |
|---|---|
| `reset: moving to ...` | A `git reset` moved a branch backward, leaving newer commits unreferenced. |
| `rebase -i (finish)` | An interactive rebase rewrote commits; the originals are at the entry *before* `rebase -i (start)`. |
| `merge` followed by `reset` | A merge was made and then undone. |
| `checkout: moving from ...` | A `git switch`/`checkout` left a detached-HEAD commit behind. |
| `branch: deleted` | A branch was deleted (only its reflog entries are gone; commits stay in the object DB). |

The commit hash on the line *before* the destructive action is usually the one you want.

If you remember the commit message (even partially), search:

```bash
git reflog | grep -i "rate limiter"
# 9f3a1b2  HEAD@{1}: commit: feat(auth): add rate limiter
```

If even the reflog has been pruned, look for unreachable commits directly:

```bash
git fsck --lost-found
# Checking object directories: 100% (256/256), done.
# dangling commit 9f3a1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a
```

These are commits no ref points at but that still exist in the object database. Inspect them:

```bash
git show 9f3a1b2c
```

---

### 3. Recover the commit

The recovery depends on what you want:

**Restore a branch to a previous tip:**

```bash
git reset --hard HEAD@{2}        # move the current branch back to that point
# Or by commit hash:
git reset --hard 9f3a1b2c
```

**Recover one commit onto your current branch (cherry-pick):**

```bash
git cherry-pick 9f3a1b2c
```

**Create a new branch starting from the lost commit:**

```bash
git switch -c recovered-work 9f3a1b2c
```

**Recover a deleted branch:**

```bash
# The branch's reflog itself is gone, but commits remain.
# Find the last hash the branch pointed at via the HEAD reflog or git fsck:
git switch -c recovered-feature 9f3a1b2c
```

---

### 4. Sanity check after recovery

```bash
git log --oneline -5             # confirm the expected commits are present
git status                       # confirm working tree state
git diff <pre-loss-commit> HEAD  # if you remember the prior tip, confirm content matches
```

---

### 5. (Optional) Extend the recovery window

Default expiry is 90 days for reflog entries and 30 days for unreachable objects. For higher-risk repos, extend before disaster strikes:

```bash
git config --global gc.reflogExpire "200 days"
git config --global gc.reflogExpireUnreachable "200 days"
```

Or disable expiry entirely for a single critical repo (use sparingly — the object database grows):

```bash
git config gc.reflogExpire never
git config gc.reflogExpireUnreachable never
```

---

## Verification

The recovered work should:

- Show in `git log` with the expected commit message and author.
- Produce the expected `git diff` against its parent or against the prior known-good state.
- Compile / pass tests if it did before the loss.

If you reset a branch, also verify remote tracking:

```bash
git status
# On branch main
# Your branch is ahead of 'origin/main' by 3 commits.
```

Then decide whether to push (if your local recovery should overwrite the remote — use `--force-with-lease`) or accept that the remote is correct and your local change should remain local.

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `git reflog` is empty | Reflog disabled, or this is a bare/fresh repo where nothing has moved | Reflog needs to have been enabled when the loss happened — there is no retroactive recovery from an empty reflog. Try `git fsck --lost-found`. |
| `git fsck --lost-found` shows nothing | Garbage collection has already run with pruning | Recovery is no longer possible in this repo. Check teammates' clones — they may still have the commits. |
| Cannot find the commit by message in `grep` | Message has changed (rebased, squashed) | Try searching by author/date or by file content: `git log --all --diff-filter=A -- path/to/file`. |
| Recovered commit produces unexpected diff | Recovered onto the wrong base | Cherry-pick onto the right base, or reset to the parent first. |
| Reset accidentally moved branch in the *wrong* direction | Confused `HEAD~N` with `HEAD@{N}` | They are different! `HEAD~N` = N parents back in history; `HEAD@{N}` = N moves back in the reflog. Use `git reflog` to find the right selector. |
| The lost work was uncommitted (only in working tree / staging area) | Reflog does not record uncommitted state | Generally unrecoverable. `git fsck --lost-found` may surface dangling blobs if `git add` had been run; otherwise no. Lesson: commit small and often. |

---

## References

- [Pro Git — Git Tools: Reset Demystified](https://git-scm.com/book/en/v2/Git-Tools-Reset-Demystified) — explains how `reset` interacts with HEAD, index, and working tree.
- [Pro Git — Maintenance and Data Recovery](https://git-scm.com/book/en/v2/Git-Internals-Maintenance-and-Data-Recovery) — canonical recovery reference.
- [git-scm — git-reflog(1)](https://git-scm.com/docs/git-reflog).
- [git-scm — git-fsck(1)](https://git-scm.com/docs/git-fsck) — finding dangling objects.
- [Atlassian — Resetting, Checking Out & Reverting](https://www.atlassian.com/git/tutorials/resetting-checking-out-and-reverting) — illustrated reference for the three operations that most often need reflog recovery.
