---
type: concept
tags:
  - tool
  - comparison
  - decision-support
related: []
language: null
---
# Merging vs Rebasing

> Two ways to combine branches: merge preserves the true topology of who-did-what-when; rebase rewrites history to look like a clean, linear sequence.

---

## What is it?

When work happens on a branch in parallel with `main`, the two histories eventually need to come together. Git offers two fundamentally different ways to do that:

- **Merge** — create a new commit (a *merge commit*) whose parents are the tips of both branches. The original commits are preserved; the graph branches and then rejoins.
- **Rebase** — take the commits made on the branch, remove them, and replay them on top of the latest `main`. The result is a linear history that *looks* as if the work had always been done after the latest `main`, even though it wasn't.

Both produce a working tree with the same content (assuming no manual mistakes during conflict resolution). They differ entirely in **what the commit graph looks like afterward** — and therefore in how blame, bisect, and history reading work.

---

## Why does it matter?

The choice between merge and rebase shapes how a team reads its own history. A merge-heavy history records *what actually happened* — every branch and merge point is visible. A rebase-heavy history records *the cleaned-up story* — a linear sequence of changes as if one engineer had made them in order.

Neither is objectively better. They optimize for different things:

- Merge preserves accuracy and never rewrites commits that have been shared. Safer in collaborative settings.
- Rebase produces a cleaner log, makes `git bisect` simpler, and avoids "merge bubbles" cluttering the graph. Riskier when commits have already been pushed.

Most healthy workflows mix the two: rebase locally to clean up before review, merge (or fast-forward) to integrate into the shared branch.

---

## How it works

Starting situation — `feature` diverged from `main` two commits ago:

```
                   (D) ─ (E)            ← feature
                  /
        (A) ─ (B) ─ (C) ─ (F) ─ (G)     ← main
```

### Option 1 — Merge (creates a merge commit)

```bash
git switch main
git merge feature
```

Git creates `M`, a new commit with two parents (`G` and `E`):

```
                   (D) ─ (E) ─────────┐
                  /                    ↘
        (A) ─ (B) ─ (C) ─ (F) ─ (G) ─ (M)   ← main
```

The history is preserved exactly. The "shape" of how the work was developed is visible forever.

### Option 1b — Fast-forward (degenerate merge)

If `main` has not moved since the branch was created, there is no need for a merge commit. Git simply moves the `main` pointer forward to the tip of `feature`:

```
Before:  (A) ─ (B) ─ (C)              ← main
                       \
                       (D) ─ (E)      ← feature

After:   (A) ─ (B) ─ (C) ─ (D) ─ (E)  ← main, feature
```

This is what `git merge feature` does by default when possible. Pass `--no-ff` to force a merge commit even when fast-forward is possible — useful for preserving the fact that work happened on a separate branch.

### Option 2 — Rebase (rewrites commits)

```bash
git switch feature
git rebase main
```

Git takes the commits `D` and `E`, removes them, and replays them one at a time on top of `G`:

```
        (A) ─ (B) ─ (C) ─ (F) ─ (G) ─ (D') ─ (E')   ← feature
                                       │      │
                              new commits, new hashes,
                              same content as D and E
```

`D'` and `E'` are not the same commits as `D` and `E`. They have different parents, different committer timestamps, and therefore different hashes. The original `D` and `E` become unreferenced and will eventually be garbage collected.

After rebasing `feature` onto `main`, you can fast-forward `main`:

```bash
git switch main
git merge feature              # fast-forward, since main is an ancestor of feature
```

Final history is fully linear:

```
        (A) ─ (B) ─ (C) ─ (F) ─ (G) ─ (D') ─ (E')   ← main, feature
```

### Three-way merge mechanics

When neither branch is an ancestor of the other, Git performs a **three-way merge**:

1. Find the **merge base** — the most recent common ancestor of the two branch tips (`C` in the example above).
2. For each file, compute the diff from the merge base to each side.
3. If the diffs do not touch the same lines, apply both automatically.
4. If they overlap, mark the file as conflicted and let the user resolve it.

A merge conflict is therefore *not* an error — it is Git correctly refusing to guess between two equally valid edits. See [staging-area](staging-area.md) for how conflicts are represented in the index.

### The cardinal rule of rebasing

> Never rebase commits that have been pushed to a shared branch.

Rebasing rewrites commit hashes. Everyone whose history contains the old commits will be confused; their next `git pull` will produce strange merge commits trying to reconcile your rewritten history with their copy of the original. The safe rule:

- **Local commits or commits in your own branch:** rebase freely.
- **Commits on a feature branch under review:** rebase if your team agrees (require force-with-lease for safety).
- **Commits on `main`, `master`, or any branch others build on:** never rebase.

---

## Examples

### Clean up a feature branch before review

```bash
git switch feature
git fetch origin
git rebase origin/main              # bring feature up to date with main, linearly
git push --force-with-lease         # safe force-push to your feature branch
```

`--force-with-lease` refuses to push if someone else has pushed to the remote branch since you last fetched — protecting against overwriting their work.

### Merge a feature with an explicit merge commit (no fast-forward)

```bash
git switch main
git pull
git merge --no-ff feature -m "Merge feature/login-rate-limit"
```

The `--no-ff` ensures the merge is visible in the history even if a fast-forward would have been possible.

### Resolve a merge conflict

```bash
git merge feature
# CONFLICT (content): Merge conflict in src/auth.go
# Automatic merge failed; fix conflicts and then commit the result.

$EDITOR src/auth.go              # edit the file, removing <<<<<<< ======= >>>>>>> markers
git add src/auth.go              # mark resolved
git merge --continue             # complete the merge (or use git commit)

# To bail out instead:
git merge --abort
```

The same applies to rebase, with `git rebase --continue` and `git rebase --abort`.

### Compare the two end states

```bash
# After merging:
git log --oneline --graph main
# *  9c3a...  Merge feature
# |\
# | *  a8e1...  feat: rate limiter (continued)
# | *  4b2c...  feat: rate limiter (initial)
# * |  7e3f...  docs: update changelog
# |/
# *  5b21...  fix: ...

# After rebasing:
git log --oneline --graph main
# *  d1f4...  feat: rate limiter (continued)
# *  c2a9...  feat: rate limiter (initial)
# *  7e3f...  docs: update changelog
# *  5b21...  fix: ...
```

---

## When to use

**Use merge when:**

- The work is collaborative and the branch has been pushed and pulled by others. Rewriting shared history hurts everyone.
- Preserving the historical fact that a branch existed is valuable — e.g., release branches, long-lived integration branches.
- Conflict resolution would otherwise need to be redone for every commit (rebase replays one commit at a time; a long branch with deep conflicts can become a slog).

**Use rebase when:**

- The work is local or limited to your own branch.
- You want a clean, linear `main` so that `git log` and `git bisect` are straightforward.
- You are preparing a branch for review and want each commit to apply cleanly on top of the latest target branch.

**A common combined pattern:**

1. Branch from `main`.
2. Develop, commit freely, rebase frequently to stay close to `main`.
3. Before requesting review, rebase once more and clean up commits (interactive rebase — see [interactive-rebase](interactive-rebase.md)).
4. Merge into `main` with `--no-ff` so the merge point is visible.

## When NOT to use

- **Do not rebase shared commits.** Repeatedly: do not rebase commits that have left your machine and entered someone else's history. The damage compounds.
- Do not fast-forward release branches without an explicit merge commit if your team relies on merge commits to identify release boundaries.
- Do not rebase out conflicts you don't understand. Resolving a conflict you do not understand replays a guess for every commit; it is better to merge once and fix it once.

## References

- [Pro Git — Git Branching: Rebasing](https://git-scm.com/book/en/v2/Git-Branching-Rebasing).
- [Pro Git — Git Branching: Basic Branching and Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging).
- [git-scm — git-merge(1)](https://git-scm.com/docs/git-merge).
- [git-scm — git-rebase(1)](https://git-scm.com/docs/git-rebase).
- [Atlassian — Merging vs. Rebasing](https://www.atlassian.com/git/tutorials/merging-vs-rebasing) — a well-illustrated comparison.
- [Junio Hamano on Rebase](https://gitster.livejournal.com/42247.html) — guidance from Git's maintainer.
