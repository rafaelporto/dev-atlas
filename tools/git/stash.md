---
type: how-to
tags:
  - tool
related: []
language: null
---
# How to Set Changes Aside with git stash

> Save uncommitted work, return your tree to a clean state, then restore the work later — without making a commit.

---

## Prerequisites

- A Git repository with **modified** or **staged** files you want to set aside temporarily.
- Note: untracked files are *not* stashed by default — pass `-u` (include) or `-a` (include + ignored) explicitly.

---

## Steps

### 1. Stash the current changes

```bash
git stash push -m "WIP: refactoring auth handler"
```

This snapshots staged + unstaged changes to tracked files, then resets the working tree to match `HEAD`. The snapshot is saved to a stack of stashes (`refs/stash` plus reflog entries).

Quick form without a message (less informative):

```bash
git stash
```

Include untracked files:

```bash
git stash push -u -m "WIP: includes new files"
```

Include untracked **and** gitignored files (rare):

```bash
git stash push -a -m "WIP: includes everything"
```

Stash only specific paths:

```bash
git stash push -m "WIP: only auth" -- src/auth/
```

Stash interactively (choose hunks):

```bash
git stash push -p
```

---

### 2. List existing stashes

```bash
git stash list
# stash@{0}: On main: WIP: refactoring auth handler
# stash@{1}: On feature: WIP: experiment with rate limiting
# stash@{2}: WIP on main: 9f3a1b2 feat(auth): add login
```

Inspect a stash's contents without applying:

```bash
git stash show stash@{0}              # summary diff
git stash show -p stash@{0}           # full patch
```

---

### 3. Restore a stash

Two ways:

```bash
git stash pop                  # apply the most recent stash AND remove it from the stack
git stash apply                # apply the most recent stash, KEEP it on the stack
git stash apply stash@{2}      # apply a specific stash
```

`pop` is the common case. `apply` is useful when you want to apply the same stash to multiple branches or want a chance to verify before discarding it.

If applying causes conflicts, resolve them and stage normally. The stash is **not** automatically removed on conflict during `pop` — once the conflict is resolved, drop it manually:

```bash
git stash drop stash@{0}
```

---

### 4. Move a stash to a branch

If a stash represents enough work to warrant its own branch:

```bash
git stash branch feature/extracted-from-stash stash@{0}
```

This creates the branch from the commit the stash was made on, applies the stash, and removes it from the stack.

---

### 5. Drop or clear stashes

```bash
git stash drop stash@{1}       # remove one stash
git stash clear                # remove ALL stashes (irreversible, except via reflog)
```

Dropped stashes are unreferenced but recoverable via `git fsck --lost-found` or the stash reflog (`git reflog show stash`) within the standard expiry window — see [reflog-recovery](reflog-recovery.md).

---

### 6. Understand what a stash actually is

A stash is two or three commits stitched together off in their own little graph:

```
                W (working-tree state)
                ↑
       stash → I (index state)
                ↑
                C (commit the stash was made on, == HEAD at time of stash)
```

When `-u` is used, a third commit holds untracked files. The stash ref (`refs/stash`) points at the index-state commit. Because stashes are real commits, all the usual recovery and inspection tools work on them.

---

## Verification

```bash
# Confirm the working tree is clean after stashing:
git status
# nothing to commit, working tree clean

# Confirm the stash exists:
git stash list

# After popping, verify your changes are back:
git diff
git status
```

If you applied to the wrong branch or wrong commit, undo with the reflog: `git reset --hard HEAD@{1}` (or wherever you were).

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `git stash pop` fails with "merge conflict" | Stashed changes overlap with current working tree content | Resolve conflicts as in a merge; then `git stash drop` to remove the stash (pop does not remove it on conflict). |
| Untracked files were not stashed | Default behavior excludes untracked files | Use `git stash push -u`. |
| Forgot what's in a stash | No message was given, or you have many | `git stash show -p stash@{N}` to inspect the full patch. |
| Cleared all stashes by mistake | `git stash clear` is destructive | Recovery via `git reflog show stash` (if reflog still has entries) or `git fsck --lost-found`. |
| Stash applied cleanly but tests fail | The commit you stashed onto has moved (you switched branches) — stash applies content, not context | `git stash branch` to apply onto the commit the stash was made on, then merge that branch. |
| Want a stash that is *also* shared with teammates | Stashes are local-only refs and do not push | Make a real commit on a `wip/` branch instead. Stashes are for personal, transient work. |

---

## References

- [Pro Git — Git Tools: Stashing and Cleaning](https://git-scm.com/book/en/v2/Git-Tools-Stashing-and-Cleaning) — canonical reference.
- [git-scm — git-stash(1)](https://git-scm.com/docs/git-stash) — full command reference.
- [Atlassian — git stash](https://www.atlassian.com/git/tutorials/saving-changes/git-stash) — illustrated walkthrough.
