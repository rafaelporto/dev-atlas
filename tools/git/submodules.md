---
type: concept
tags: []
related: []
language: null
---
# Submodules

> A way to embed one Git repository inside another by reference — the parent records *which commit* of the child to use, not the child's files themselves.

---

## What is it?

A **submodule** is a Git repository nested inside another Git repository as a subdirectory. The parent repo (the **superproject**) does not store the submodule's files; it stores:

1. A **gitlink** entry in its tree — a special entry recording the exact commit hash of the submodule at this point in history.
2. A `.gitmodules` file in the superproject root, mapping each submodule path to its URL.

When someone clones the superproject, the submodule directories exist but are empty. Running `git submodule update --init` clones each submodule at the exact commit the superproject recorded.

```
superproject/
├── .gitmodules         ← maps path → URL for each submodule
├── README.md
└── vendor/
    └── libfoo/         ← a gitlink: "libfoo is at commit a8e1..."
```

Submodules predate most modern dependency managers and remain a sharp tool — useful in specific situations, often misused outside them.

---

## Why does it matter?

Sometimes a project genuinely needs to pin another project at a specific commit, with full history available locally, in a way that survives `git clone`. Cases include:

- Vendored libraries that the project occasionally patches and wants to track upstream of.
- Sharing code between multiple superprojects that each pin different revisions.
- Build systems that prefer source dependencies over package-manager dependencies.
- Reproducible builds: the recorded commit hash is part of the superproject's tree hash, so the superproject's commit hash transitively pins every line of code in every submodule.

When none of those apply, a language-native package manager (npm, cargo, go modules, pip) is almost always a better fit. Submodules add real cognitive cost — they introduce a second repository's state machine that contributors must reason about.

---

## How it works

### Adding a submodule

```bash
git submodule add https://github.com/example/libfoo.git vendor/libfoo
```

This does three things:

1. Clones `libfoo` into `vendor/libfoo`.
2. Writes the gitlink entry into the superproject's index — `vendor/libfoo` is now tracked as a special "submodule at commit a8e1...".
3. Creates or updates `.gitmodules` in the superproject root:

```ini
[submodule "vendor/libfoo"]
    path = vendor/libfoo
    url = https://github.com/example/libfoo.git
```

A `git commit` then records both the gitlink and `.gitmodules`.

### Cloning a project with submodules

A plain `git clone` leaves submodule directories empty. Two equivalent ways to populate them:

```bash
git clone --recurse-submodules https://github.com/example/superproject.git

# Or, after a regular clone:
git clone https://github.com/example/superproject.git
cd superproject
git submodule update --init --recursive
```

`--recursive` matters when submodules themselves contain submodules.

### The two-repo state machine

The hard part of submodules is that *every* command happens at one of two scopes:

- **In the superproject:** commits, branches, status of the gitlink.
- **In the submodule directory:** commits, branches, status of the submodule itself.

`cd vendor/libfoo && git status` shows the submodule's state. `cd .. && git status` shows whether the superproject's recorded gitlink matches what is currently checked out inside the submodule directory.

```
$ git status
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
        modified:   vendor/libfoo (new commits)
```

"new commits" means: the submodule directory is at a different commit than what the superproject's tree records. Either you intended that (and should `git add vendor/libfoo` to update the gitlink) or the submodule has drifted (and you should `git submodule update` to put it back).

### Updating a submodule

To bump a submodule to a newer revision of its upstream:

```bash
cd vendor/libfoo
git fetch
git switch main          # or check out a specific commit / tag
git pull
cd ../..

git add vendor/libfoo    # records the new gitlink
git commit -m "chore(deps): bump libfoo to v2.3.1"
```

The superproject's commit now points at the new submodule commit.

### Detached HEAD inside submodules

By default, `git submodule update` checks out the submodule at the exact commit recorded by the superproject. That commit is usually not the tip of any branch, so the submodule lands in **detached HEAD**. This is expected — superprojects pin specific commits, not moving branches.

If you intend to edit the submodule, switch to a branch first:

```bash
cd vendor/libfoo
git switch main
# now make changes, commit, push to the submodule's upstream
```

Failing to switch to a branch before committing inside a submodule produces commits on no branch, which can be lost — see [reflog-recovery](reflog-recovery.md).

### Removing a submodule

Removal requires several steps because submodules touch multiple files:

```bash
git submodule deinit -f vendor/libfoo
git rm -f vendor/libfoo
rm -rf .git/modules/vendor/libfoo    # remove the submodule's stored .git data
git commit -m "chore: remove libfoo submodule"
```

---

## Examples

### Inspect submodules in a project

```bash
git submodule status
# +a8e1b2c... vendor/libfoo (heads/main)
#  4b2c3d4... vendor/libbar (v1.2.0)
# -...                      vendor/libqux (not initialized)

# Symbols:
#   ' ' = checked out at the superproject's recorded commit
#   '+' = submodule HEAD differs from the recorded commit
#   '-' = submodule not initialized
#   'U' = merge conflict in the submodule
```

### Fetch updates for all submodules at once

```bash
git submodule update --remote --merge
# --remote: fetch the latest tip of the submodule's tracked branch
# --merge:  integrate it (vs --rebase, which rebases)
```

### Run a command in every submodule

```bash
git submodule foreach 'git fetch --all'
git submodule foreach --recursive 'git status'
```

### Pin a submodule to a specific tag

```bash
cd vendor/libfoo
git fetch --tags
git checkout v2.3.1
cd ../..
git add vendor/libfoo
git commit -m "chore(deps): pin libfoo to v2.3.1"
```

---

## When to use

- The dependency is itself a Git repository and a real package distribution does not exist.
- You need to patch the dependency in place and carry those patches in your own history.
- You want full source history of the dependency available locally — no `node_modules`-style opacity.
- Reproducible builds where every byte of every dependency must be pinned via a commit hash, transitively included in the superproject's tree hash.
- Build systems (Bazel, Buck, some CMake projects) where source-level pinning is the model.

## When NOT to use

- The dependency has a real package manager. Use npm / cargo / go modules / pip / maven instead — they handle resolution, conflicts, and version compatibility in ways `git submodule` cannot.
- Contributors are unfamiliar with submodules and the project does not have time to teach them. Submodules generate a steady stream of "why are my changes not showing up?" support requests.
- You want a single conceptual repo for development. Sometimes a **monorepo** (one repo, multiple projects) is the right answer instead.
- You want the submodule to track a moving branch. Submodules pin commit hashes; making them follow a branch (`git submodule update --remote`) requires explicit, repeated bumps.
- Lightweight code sharing where `git subtree` (merges the source into the parent's history without an external link) or simple vendoring is sufficient.

## References

- [Pro Git — Git Tools: Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules) — the canonical, in-depth reference.
- [git-scm — git-submodule(1)](https://git-scm.com/docs/git-submodule).
- [gitmodules(5)](https://git-scm.com/docs/gitmodules) — format of the `.gitmodules` file.
- [Linus Torvalds on submodules](https://lwn.net/Articles/642648/) — original design rationale and trade-offs from Git's creator.
- [Atlassian — Git Submodules](https://www.atlassian.com/git/tutorials/git-submodule) — illustrated tutorial including common pitfalls.
