# Remotes

> A remote is another Git repository — usually on a server — that your local repo can fetch from and push to; everything else about distributed Git follows from that.

---

## What is it?

A **remote** is a named reference to another Git repository. Most repositories have at least one remote called `origin`, pointing at the URL the repo was cloned from. A repo can have many remotes (`upstream`, `fork`, a teammate's repo, etc.).

Remotes are entries in `.git/config`:

```
[remote "origin"]
    url = git@github.com:your-username/your-repo.git
    fetch = +refs/heads/*:refs/remotes/origin/*
```

The `fetch` line is a **refspec** — a rule that maps refs on the remote (`refs/heads/*`) to refs in the local repo (`refs/remotes/origin/*`). When you fetch, Git copies the remote's branches into your local `refs/remotes/origin/` namespace, leaving your own local branches untouched.

---

## Why does it matter?

Git is distributed: every clone is a full repository, not a thin client of a server. Remotes are how independent repositories talk to each other. The same model works whether the remote is GitHub, GitLab, a self-hosted server, a USB drive containing a bare repo, or another developer's laptop reachable over SSH.

Understanding remotes also unlocks the difference between **your branches** and **your view of someone else's branches**, which is the root of many "why is my push rejected?" surprises.

---

## How it works

### Three namespaces of refs

```
.git/refs/heads/        — local branches you can commit on
        ├── main
        └── feature

.git/refs/remotes/      — your last-known snapshot of the remote's branches
        └── origin/
            ├── main
            └── feature

.git/refs/tags/         — tags (shared with the remote when explicitly pushed)
```

`refs/remotes/origin/main` is **not** the remote's `main` — it is *what your last fetch said was on the remote*. Between fetches it can be stale. `git fetch` is what updates it.

### Fetch, pull, push

| Command | What it does |
|---|---|
| `git fetch <remote>` | Download new objects and update `refs/remotes/<remote>/*`. **Does not touch your branches or working tree.** Always safe. |
| `git pull <remote> <branch>` | `git fetch` followed by `git merge` (or `git rebase`, if configured) of the remote branch into the current branch. Modifies working tree. |
| `git push <remote> <branch>` | Upload your commits and update the remote's branch to your tip — **only if doing so is a fast-forward** (i.e., your commits are a strict superset of theirs). |

Push is rejected when your branch and the remote's branch have diverged. The fix is to fetch, integrate the remote's changes locally (merge or rebase), and push again.

```
Local:                       Remote:
  A ─ B ─ C                    A ─ B ─ X       (someone else pushed X)
        ↑                            ↑
      main                         main

git push origin main  →  REJECTED (non-fast-forward)

Fix: git pull --rebase   or   git pull (which merges)
Then: git push
```

### Tracking branches

A **tracking branch** (or "upstream branch") is a local branch configured to know which remote branch it follows. The relationship enables short-form commands:

```bash
# When tracking is set up:
git fetch              # fetches from the tracked remote
git pull               # pulls the tracked branch
git push               # pushes to the tracked branch
git status             # shows "ahead/behind by N commits"
```

Set up tracking:

```bash
git switch -c feature --track origin/feature

# Or, on first push of a new branch:
git push -u origin feature       # -u sets upstream

# Or after the fact:
git branch --set-upstream-to=origin/feature feature
```

### Pull: merge vs rebase

By default, `git pull` does a merge. Many teams prefer a rebase-based pull for cleaner history:

```bash
git config --global pull.rebase true       # use rebase for all pulls
# Or per-repo: omit --global
```

Or pass `--rebase` once: `git pull --rebase`.

### Force pushing safely

When a branch is local-only or under your sole control, force pushing is sometimes necessary — for instance after an interactive rebase that rewrote commits already pushed:

```bash
git push --force-with-lease origin feature
```

`--force-with-lease` refuses the push if the remote has commits you have not yet fetched, protecting against overwriting a teammate's work. **Never** use plain `--force` on shared branches; never force-push to `main` / `master` / release branches.

### Pruning stale remote branches

When a branch is deleted on the remote, your local `refs/remotes/origin/*` does not automatically update. Run with `--prune`:

```bash
git fetch --prune
# Or set permanently:
git config --global fetch.prune true
```

### Bare repositories

A **bare repository** has no working tree — only the `.git/` contents, laid out at the top level. Servers host bare repos because there is no one to "check out" code on the server. `git clone --bare <url>` produces one.

---

## Examples

### Common setup operations

```bash
# Clone — creates origin automatically
git clone git@github.com:user/repo.git

# Add a second remote (e.g., your fork's upstream)
git remote add upstream https://github.com/upstream-org/repo.git
git remote -v
# origin    git@github.com:user/repo.git (fetch)
# origin    git@github.com:user/repo.git (push)
# upstream  https://github.com/upstream-org/repo.git (fetch)
# upstream  https://github.com/upstream-org/repo.git (push)

# Rename a remote
git remote rename origin github

# Change a remote's URL
git remote set-url origin git@new-host:user/repo.git

# Remove a remote
git remote remove upstream
```

### Fetch-then-decide workflow

```bash
# Fetch updates without touching your branches
git fetch origin

# See what's new on origin/main that isn't local
git log main..origin/main --oneline

# Now decide: merge or rebase
git merge origin/main          # or: git rebase origin/main
```

### First push of a new branch

```bash
git switch -c feature/payments
# ... commit ...
git push -u origin feature/payments
# -u sets origin/feature/payments as the upstream;
#   future `git push` and `git pull` need no arguments.
```

### Sync a fork with its upstream

```bash
git fetch upstream
git switch main
git merge upstream/main          # or: git rebase upstream/main
git push origin main             # update your fork
```

### Inspect a remote without cloning

```bash
git ls-remote https://github.com/user/repo.git
# Lists refs and their hashes on the remote — handy for scripting.
```

---

## When to use

- Any time work needs to leave one machine — backup, collaboration, deployment, code review, CI.
- For forked workflows: add the original repo as an `upstream` remote to pull in changes from the source project.
- To mirror or back up: a second remote pointing at a different host makes the repo resilient to a host outage.

## When NOT to use

- Storing large binary files via the standard protocol — every clone downloads the full history of every binary. Use [Git LFS](https://git-lfs.com/) instead.
- Pushing to a non-bare repository on a server — Git refuses by default (it would change a checked-out branch on the server). Use a bare repo as the remote.
- Force pushing to a shared branch under any circumstances. If a teammate has pulled your old commits, force push silently breaks their working copy.

## References

- [Pro Git — Git Basics: Working with Remotes](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes).
- [Pro Git — Git on the Server](https://git-scm.com/book/en/v2/Git-on-the-Server-The-Protocols).
- [git-scm — git-remote(1)](https://git-scm.com/docs/git-remote).
- [git-scm — git-push(1)](https://git-scm.com/docs/git-push).
- [git-scm — gitglossary(7), refspec entry](https://git-scm.com/docs/gitglossary#Documentation/gitglossary.txt-aiddefrefspecarefspec).
