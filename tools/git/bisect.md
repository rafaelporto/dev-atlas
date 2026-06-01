---
type: how-to
tags:
  - tool
related: []
language: null
---
# How to Find a Regression with git bisect

> Binary-search through commit history to pinpoint the exact commit that introduced a bug.

---

## Prerequisites

- A known **bad** state (a commit where the bug is present — usually `HEAD` or a recent tag).
- A known **good** state (an older commit where the bug is absent — a previous release, a tag, or any older commit you can verify).
- A reliable way to test whether the bug is present at a given commit. Manual is fine; an automated script is better.
- A working tree clean enough to switch commits without losing changes (`git status` clean, or stash first).

---

## Steps

### 1. Start a bisect session

```bash
git bisect start
git bisect bad                  # mark current HEAD as bad
git bisect good v1.4.2          # mark the last known good commit (or any older ref)
```

Git checks out a commit roughly halfway between the two and prints something like:

```
Bisecting: 23 revisions left to test after this (roughly 5 steps)
[7e3f001abcd...] feat(auth): refactor session storage
```

You are now at that midpoint commit, in detached HEAD state.

---

### 2. Test the current commit

Run whatever check identifies the bug — a unit test, an integration test, manually exercising a feature in the app:

```bash
# Example: run the failing test
go test ./auth/... -run TestSessionExpiry

# Or run the application and check manually
./scripts/repro-bug.sh
```

---

### 3. Mark the commit as good or bad

```bash
git bisect good       # bug NOT present here
# or
git bisect bad        # bug IS present here
# or
git bisect skip       # cannot determine — Git picks a nearby commit instead
```

`skip` is the right answer for commits that don't compile, are missing data, or otherwise cannot be tested. Git skips around them; the final answer may be presented as a range if too many commits are unverifiable.

Git then checks out the next midpoint. Repeat steps 2–3 until Git announces the first bad commit:

```
abc1234... is the first bad commit
commit abc1234abcd...
Author: ...
Date:   ...

    refactor(auth): inline token cleanup helper

 src/auth/session.go | 12 ++++++------
 1 file changed, 6 insertions(+), 6 deletions(-)
```

The output includes the commit message and diff, which usually tells you immediately why the bug appeared.

---

### 4. End the session and return to where you started

```bash
git bisect reset
```

This restores `HEAD` to whatever branch you were on before starting the bisect.

---

### 5. Automate with `git bisect run`

If you can express "the bug is present" as a script that exits non-zero when bad and zero when good, Git can drive the entire bisect automatically:

```bash
git bisect start HEAD v1.4.2
git bisect run ./scripts/check-bug.sh
```

The script convention:

```bash
#!/usr/bin/env bash
set -e
# Build the project (skip this commit if build is broken)
if ! go build ./...; then
    exit 125            # 125 = "skip this commit"
fi
# Run the specific test that exposes the bug
if go test -run TestSessionExpiry ./auth/...; then
    exit 0              # 0 = "good"
else
    exit 1              # 1 = "bad"
fi
```

Exit codes:

| Code | Meaning |
|---|---|
| `0` | Commit is good |
| `1`–`124`, `126`–`127` | Commit is bad |
| `125` | Skip — Git tries a different commit |
| `128`+ | Abort the bisect entirely |

For a long-history bug hunt, a one-time investment in a check script pays off — `git bisect run` walks dozens of commits in minutes with no human in the loop.

---

## Verification

After Git prints the first bad commit, confirm by hand:

```bash
git switch --detach <bad-commit>
# Reproduce the bug — should be present.

git switch --detach <bad-commit>^
# Switch to the parent — bug should be absent.
```

If both checks confirm the boundary, you have the right commit.

For the final report, capture the commit with context:

```bash
git show <bad-commit> --stat       # diff and files changed
git log --oneline <bad-commit>^..<bad-commit>     # one-line summary
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `git bisect` immediately ends with "is the first bad commit" but the answer is wrong | Initial good/bad commits were misidentified | `git bisect reset`, recheck endpoints, restart. |
| Many commits cannot be tested (build failures, missing data) | Repository history has unstable intermediate states | Use `git bisect skip` liberally; Git produces a range instead of a single commit. |
| `bisect run` returns the wrong commit | Test script is flaky (intermittent failures) | Run the test multiple times in the script; require N consecutive passes/fails before reporting. |
| Bisect crosses a merge and gets confused | Bug was introduced via a merge from a feature branch | Inspect the suspicious merge commit by hand; sometimes the answer is the merge itself. |
| Need to bisect with file or path scope | The bug only manifests under specific paths | `git bisect start -- src/auth/` restricts the search to commits touching `src/auth/`. |
| Want to find when a bug was *fixed* (not introduced) | Standard bisect finds bad→good direction by default | Swap labels: mark the buggy old commit as "old" and the fixed commit as "new" with `git bisect start --term-old=old --term-new=new`. |

---

## References

- [Pro Git — Git Tools: Debugging with Git, Binary Search](https://git-scm.com/book/en/v2/Git-Tools-Debugging-with-Git#_binary_search) — canonical reference.
- [git-scm — git-bisect(1)](https://git-scm.com/docs/git-bisect) — full reference including custom term names and `run`.
- [Linus Torvalds on git bisect](https://www.youtube.com/watch?v=4XpnKHJAok8) — original talk where bisect is described as one of Git's killer features.
- [Atlassian — git bisect](https://www.atlassian.com/git/tutorials/undoing-changes/git-bisect) — illustrated walkthrough.
