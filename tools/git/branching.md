# Branching

> A Git branch is a movable pointer to a single commit — that one fact explains creating, switching, merging, and recovering branches.

---

## What is it?

A **branch** in Git is a lightweight, named pointer to a commit. The file `.git/refs/heads/main` contains a single line: the SHA hash of the commit at the tip of `main`. Creating a branch is creating another such file. Switching branches is updating which one `HEAD` points at and refreshing the working tree to match.

Other version control systems often implement branches as full copies of the codebase. In Git, every branch is essentially free: it costs the size of a file containing a 40-character hash. This is why Git encourages many short-lived branches where older tools encourage few long-lived ones.

---

## Why does it matter?

Cheap branching changes how teams build software. When making a branch costs nothing, the natural unit of work becomes "one branch per change in flight" — a feature, a fix, an experiment, a refactor. The cost is in *integrating* branches, not creating them, which pushes teams toward smaller, more frequent integrations.

Branches also make experimental work safe. Trying an aggressive refactor on a separate branch is reversible by simply deleting the branch; the commits remain in the object database, recoverable via [reflog](reflog-recovery.md), until garbage collection eventually reclaims them.

---

## How it works

### What a branch actually is

```
.git/refs/heads/
├── main      → 9f3a... (a commit hash)
├── feature   → a8e1...
└── hotfix    → 4b2c...
```

Each file contains one commit hash. `git branch feature` creates a new file pointing at the same commit `HEAD` currently points at. `git commit` advances the branch the working tree is on by writing a new commit (whose parent is the current commit) and updating the branch file to contain the new hash.

### HEAD: the "you are here" pointer

`HEAD` is a symbolic reference, almost always pointing at a branch:

```
.git/HEAD  → ref: refs/heads/main
```

When you commit, Git follows `HEAD` to find the branch to advance. When you check out a different branch, Git updates `HEAD` to point at it and refreshes the working tree.

If `HEAD` points directly at a commit hash instead of a branch, you are in **detached HEAD** state. Commits made in this state are not on any branch; if you switch away without naming them, they become unreferenced and eventually disappear. The remedy is to create a branch before switching: `git switch -c rescue-branch`.

### The commit graph

Every commit has zero or more parent commits. The full history is a **directed acyclic graph** (DAG) of commits. Branches and tags are entry points into this graph.

```
                                 (D) ← feature
                                /
        (A) ─ (B) ─ (C) ── (E)        ← main
                            \
                            (F) ← hotfix
```

- `A`, `B`, `C` are on `main`'s history.
- `D` is a commit made on the `feature` branch, parented to `C`.
- `F` is a commit made on `hotfix`, also parented to `C`.
- After merging or rebasing, the graph topology changes; see [merging-vs-rebasing](merging-vs-rebasing.md).

### Switch vs checkout

Historically, `git checkout` did two unrelated jobs: switching branches and restoring files. Git 2.23 (2019) split these into `git switch` and `git restore`:

```bash
git switch feature             # change branches (replaces: git checkout feature)
git switch -c new-feature      # create and switch (replaces: git checkout -b)
git restore src/main.go        # discard working-tree changes (replaces: git checkout src/main.go)
git restore --staged file.go   # unstage (replaces: git reset HEAD file.go)
```

`git checkout` still works but is no longer recommended for new work. Use `switch` and `restore`.

### Tracking branches

A **tracking branch** is a local branch configured to follow a remote branch. The relationship enables `git pull` (fetch + merge or rebase) and short forms of `git push`. See [remotes](remotes.md) for the full model.

```bash
git switch -c feature --track origin/feature
# Or equivalently, when the remote branch already exists with the same name:
git switch feature             # auto-tracks origin/feature
```

---

## Examples

### Basic flow

```bash
# Create a branch off main and switch to it
git switch -c feature/login-rate-limit

# Work, commit, work, commit
echo "..." >> src/auth.go
git commit -am "feat(auth): add rate limiter"

# See where each branch points
git log --oneline --all --graph --decorate
# *  a8e1...  (HEAD -> feature/login-rate-limit) feat(auth): add rate limiter
# *  9f3a...  (main, origin/main) docs: update readme
```

### Deleting branches

```bash
git branch -d feature/login-rate-limit
# Refuses if the branch is not merged into HEAD.

git branch -D feature/login-rate-limit
# Force-delete, even if unmerged. The commits become unreferenced.
```

Unreferenced commits remain in the object database and can be recovered via [reflog](reflog-recovery.md) for typically 30–90 days (configurable via `gc.reflogExpire`).

### Renaming the current branch

```bash
git branch -m new-name
git push -u origin new-name
git push origin --delete old-name    # remove old name on the remote
```

### Listing and inspecting

```bash
git branch                              # local branches
git branch -a                           # local + remote
git branch --merged main                # branches whose tip is reachable from main
git branch --no-merged main             # branches with work not yet merged into main
git branch --contains <commit>          # branches containing a given commit
```

### Recovering from detached HEAD

```bash
git switch v1.0.0                  # warning: detached HEAD at v1.0.0
echo "..." >> src/main.go
git commit -am "experiment"        # this commit is on no branch

# To keep it, name it before moving away:
git switch -c experiment-from-v1.0.0
```

---

## When to use

- Per change in flight — every feature, fix, or experiment gets its own short-lived branch.
- For experiments where you may want to throw the work away — branches make discard free.
- To isolate risky refactors from the main line until they are ready.
- To enable parallel work on different concerns without anyone stepping on anyone else's commits.

## When NOT to use

- Long-lived feature branches that live for weeks before merging — they accumulate divergence and turn integration into a major event. Prefer small, integrated branches; the next concept article on [merging-vs-rebasing](merging-vs-rebasing.md) covers why.
- "Personal" branches that are never integrated. If a branch will not merge back, it should not exist; the commits will be lost when it is eventually deleted.
- As a substitute for a real release process. Branches are a development primitive; release engineering also needs tags and, often, dedicated release branches (see [tags-and-releases](tags-and-releases.md)).

## References

- [Pro Git — Git Branching: Branches in a Nutshell](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell).
- [Pro Git — Git Branching: Basic Branching and Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging).
- [git-scm — git-switch(1)](https://git-scm.com/docs/git-switch).
- [git-scm — git-branch(1)](https://git-scm.com/docs/git-branch).
- [Highlights from Git 2.23](https://github.blog/2019-08-16-highlights-from-git-2-23/) — introduction of `git switch` and `git restore`.
