---
type: how-to
tags:
  - tool
related: []
language: null
---
# How to Rewrite Commits with Interactive Rebase

> Reorder, squash, edit, drop, or amend a series of commits before they leave your machine.

---

## Prerequisites

- Familiarity with the basics of [branching](branching.md) and [merging-vs-rebasing](merging-vs-rebasing.md).
- A range of commits that have **not yet been pushed to a shared branch** — rewriting shared history breaks teammates' clones.
- A clean working tree (`git status` shows nothing) before starting. Stash or commit any in-progress changes first.

---

## Steps

### 1. Identify the range of commits to rewrite

Decide how far back to rewrite. Common targets:

```bash
git log --oneline -10        # see the last 10 commits and pick a starting point

git rebase -i HEAD~3         # rewrite the last 3 commits
git rebase -i main           # rewrite every commit on the current branch since it diverged from main
git rebase -i abc1234        # rewrite every commit after abc1234 (exclusive)
```

The commit specified is the **base** — it is *not* itself included; everything *after* it is open for rewriting.

---

### 2. Read and edit the todo list

Git opens an editor with one line per commit in the range, oldest at the top:

```
pick a8e1b2c feat(auth): add login endpoint
pick 4b2c3d4 fix typo
pick 9f3a1b2 docs: add login docs
pick 7e3f001 wip
pick 5b21002 feat(auth): add rate limiter
```

Replace `pick` with the action you want for each commit:

| Action | Effect |
|---|---|
| `pick` (`p`) | Keep the commit as-is. |
| `reword` (`r`) | Keep the commit's content; open the editor to change the message. |
| `edit` (`e`) | Stop after applying this commit so you can amend it (change files, then continue). |
| `squash` (`s`) | Combine this commit into the previous one; opens an editor to merge messages. |
| `fixup` (`f`) | Like `squash`, but discard this commit's message — useful for "wip" / "fix typo" commits. |
| `drop` (`d`) | Remove the commit entirely. |
| `reorder` | Just move the line up or down — Git applies commits in the order you list them. |

A typical cleanup pass:

```
pick   a8e1b2c feat(auth): add login endpoint
fixup  4b2c3d4 fix typo
pick   9f3a1b2 docs: add login docs
fixup  7e3f001 wip
pick   5b21002 feat(auth): add rate limiter
```

Save and close the editor. Git applies the plan one entry at a time.

---

### 3. Resolve conflicts as Git replays commits

Rebase replays each commit individually. If a commit conflicts with the new context, Git pauses:

```
Auto-merging src/auth.go
CONFLICT (content): Merge conflict in src/auth.go
error: could not apply 5b21002... feat(auth): add rate limiter
```

Resolve the conflict, stage the result, and continue:

```bash
$EDITOR src/auth.go               # remove <<<<<<< ======= >>>>>>> markers
git add src/auth.go
git rebase --continue
```

To stop and undo the entire rebase:

```bash
git rebase --abort
```

To skip the current problematic commit (uncommon — usually you want to fix, not skip):

```bash
git rebase --skip
```

---

### 4. Handle `edit` pauses

If you marked a commit `edit`, Git stops after applying it, leaving the commit checked out as `HEAD`. Make changes, then amend:

```bash
# Modify files
$EDITOR src/auth.go
git add src/auth.go
git commit --amend            # rewrites the paused commit with the new changes

git rebase --continue
```

---

### 5. Force-push if the branch is already on a remote

A rewritten branch has different commit hashes; the remote will reject a normal push. Use `--force-with-lease`:

```bash
git push --force-with-lease origin feature/login-rate-limit
```

`--force-with-lease` refuses if the remote has commits you have not yet fetched, protecting against overwriting a teammate's work. **Never** force-push to shared branches (`main`, `master`, release branches).

---

### 6. Use `--autosquash` for a smoother workflow

When making a fixup commit during development, mark it as a fixup of an earlier commit:

```bash
git commit --fixup=a8e1b2c
# produces a commit titled: "fixup! feat(auth): add login endpoint"
```

Later, run rebase with `--autosquash` and Git reorders and pre-marks every `fixup!` line:

```bash
git rebase -i --autosquash main
# Or make it default:
git config --global rebase.autosquash true
```

This is the cleanest pattern for accumulating small fixes and folding them in at the end.

---

## Verification

Compare the rewritten history to what you intended:

```bash
git log --oneline -10                                # check the new log
git log --pretty=format:"%h %s%n%b" -5               # include commit bodies
git diff <pre-rebase-commit> HEAD                    # confirm the file contents are unchanged
```

Find `<pre-rebase-commit>` via the reflog:

```bash
git reflog
# HEAD@{0} rebase -i (finish): returning to refs/heads/feature
# HEAD@{4} rebase -i (start): checkout HEAD~5
# HEAD@{5} commit: ... (the pre-rebase tip)
```

If something went wrong, the pre-rebase commit is still reachable — see [reflog-recovery](reflog-recovery.md).

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `fatal: It seems that there is already a rebase-merge directory` | Previous rebase was not finished or aborted | `git rebase --abort` to clear it, or `--continue` if you meant to resume. |
| Conflicts on every commit during a long rebase | Many commits touch the same lines | Consider squashing into one commit first, or merge instead of rebase. |
| Force-push rejected with "stale info" | Someone else pushed to the branch since your last fetch | `git fetch`, inspect, then decide if you can still rebase or need to coordinate. |
| Lost commits after a botched rebase | The pre-rebase tip is no longer reachable from any branch | Recover via [reflog](reflog-recovery.md): `git reset --hard HEAD@{N}`. |
| Empty commit after dropping changes | The commit's content matched its parent after rebase | Pass `--keep-empty` to preserve, or accept that Git removes it. |
| Editor opens with `noop` and a single line | You picked a range with no commits to rewrite (e.g., `HEAD~0`) | Close without saving. |

---

## References

- [Pro Git — Git Tools: Rewriting History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History) — the canonical guide; covers interactive rebase, `--autosquash`, and `filter-branch` / `filter-repo` for larger surgeries.
- [git-scm — git-rebase(1)](https://git-scm.com/docs/git-rebase) — full reference.
- [Atlassian — Rewriting History](https://www.atlassian.com/git/tutorials/rewriting-history) — illustrated walkthrough.
- [Thoughtbot — Autosquashing Git Commits](https://thoughtbot.com/blog/autosquashing-git-commits) — practical introduction to `--fixup` and `--autosquash`.
