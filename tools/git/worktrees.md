# How to Work in Parallel with git worktree

> Check out multiple branches of the same repository into separate directories — no need to stash, switch, or clone twice.

---

## Prerequisites

- Git 2.5 or later (`git worktree` was added in 2015; current Git is fine).
- An existing Git repository with at least one branch.
- Enough disk space for one working tree per parallel checkout (each worktree is a full working copy, but shares the `.git/objects` database).

---

## Steps

### 1. Understand the model

A **worktree** is an additional working directory linked to the same repository. The primary worktree is the one created by `git init` or `git clone`. Additional worktrees:

- Share the object database (`.git/objects/`), refs, and config with the primary.
- Have their own working files and their own HEAD.
- Cannot all check out the same branch — Git refuses to have the same branch checked out in two places (it would let conflicting commits land on the same branch).

```
primary repo (~/code/project)
├── .git/                          ← shared
├── src/                           ← working tree on branch `main`
│
linked worktree (~/code/project-feature)
├── .git                           ← file pointing back to primary's .git/worktrees/
└── src/                           ← working tree on branch `feature`

linked worktree (~/code/project-hotfix)
├── .git                           ← file pointing back to primary's .git/worktrees/
└── src/                           ← working tree on branch `hotfix`
```

All three share commits, branches, and remotes — fetching in one is visible in the others.

---

### 2. Create a worktree for an existing branch

```bash
# From inside the primary worktree:
git worktree add ../project-feature feature
```

This creates `../project-feature/` with `feature` checked out. The branch must not already be checked out in another worktree.

---

### 3. Create a worktree with a new branch

```bash
git worktree add -b hotfix/login-bug ../project-hotfix main
```

- `-b hotfix/login-bug` creates a new branch.
- `main` is the starting point.
- `../project-hotfix` is where the worktree lives.

Now `../project-hotfix` has `hotfix/login-bug` branched from `main`, ready for work.

---

### 4. List and inspect worktrees

```bash
git worktree list
# /Users/you/code/project           9f3a1b2 [main]
# /Users/you/code/project-feature   a8e1b2c [feature]
# /Users/you/code/project-hotfix    4b2c3d4 [hotfix/login-bug]

git worktree list --porcelain        # machine-readable
```

Each worktree's `.git` file points back at the primary's `.git/worktrees/<name>/` metadata.

---

### 5. Use the worktree like a normal repo

```bash
cd ../project-hotfix
# Edit, commit, push — everything works as in the primary.
$EDITOR src/auth.go
git commit -am "fix(auth): handle expired tokens"
git push -u origin hotfix/login-bug
```

Operations like `git fetch` in one worktree update refs visible to all. Branches created in one are listable from another.

---

### 6. Remove a worktree when done

```bash
# From any worktree:
git worktree remove ../project-hotfix
```

This deletes the linked worktree's directory and removes its metadata. Refuses if the worktree has uncommitted changes — pass `--force` to override (work is lost).

If the directory has been deleted manually (e.g., the disk holding it was unmounted), prune the stale metadata:

```bash
git worktree prune
```

---

### 7. Move a worktree

If you need to relocate a worktree without re-creating it:

```bash
git worktree move ../project-feature ~/other-location/project-feature
```

---

### 8. Use bare repos for a dedicated worktree workflow

Some workflows skip the "primary worktree" entirely: clone bare, then add worktrees for each branch.

```bash
git clone --bare git@github.com:user/repo.git project.git
cd project.git
git worktree add ../project-main main
git worktree add ../project-feature feature
```

The bare repo holds objects and refs; every working checkout is a worktree. This keeps `.git` machinery cleanly separated from any specific branch.

---

## Verification

```bash
# Confirm worktrees exist and point at the right branches:
git worktree list

# Confirm a branch is checked out exactly once:
git branch -vv
# Branches shown with [worktree: path] when checked out elsewhere.

# In a worktree, confirm shared object database:
ls .git
# A regular file, not a directory — contents:
#   gitdir: /Users/you/code/project/.git/worktrees/project-feature
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `fatal: 'feature' is already checked out at ...` | Branch is already in another worktree | Use a different branch, or remove the other worktree first. |
| `fatal: '<path>' already exists` | Target directory is not empty | Choose a fresh path, or remove the existing directory. |
| Worktree directory was deleted manually; `git worktree list` still shows it | Metadata in `.git/worktrees/` is stale | Run `git worktree prune`. |
| Cannot push from a worktree | Worktree is on a branch with no upstream | `git push -u origin <branch>` to set upstream the first time. |
| Stash works across worktrees in unexpected ways | The stash is shared via the primary repo — each `git stash` is global to the repository, not per-worktree | Use distinct stash messages: `git stash push -m "feature: WIP X"`. |
| Submodules don't auto-init in new worktrees | `git worktree add` does not recurse into submodules | After creating the worktree: `cd <new-worktree> && git submodule update --init --recursive`. |

---

## References

- [Pro Git — Git Tools: Git Worktrees](https://git-scm.com/book/en/v2/Git-Tools-Git-Worktrees) — canonical reference.
- [git-scm — git-worktree(1)](https://git-scm.com/docs/git-worktree) — full command reference.
- [Highlights from Git 2.5](https://github.blog/2015-07-29-git-2-5-including-multiple-worktrees-and-triangular-workflows/) — original announcement post.
- [Atlassian — git worktree](https://www.atlassian.com/git/tutorials/git-worktree) — practical walkthrough.
