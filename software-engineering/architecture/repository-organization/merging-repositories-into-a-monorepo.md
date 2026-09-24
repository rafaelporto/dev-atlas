---
type: how-to
tags:
  - architecture
  - tool
  - repository-organization
  - migration
related:
  - software-engineering/architecture/repository-organization/inside-a-monorepo
  - software-engineering/architecture/repository-organization/monorepo-vs-polyrepo
  - tools/git/submodules
  - tools/git/tags-and-releases
  - tools/git/branching
language: null
---
# How to Merge Repositories into a Monorepo

> Consolidate several standalone repositories into one, keeping every commit, every author, and — the part that is easy to lose without noticing — a working `git log --follow` across the move.

---

## Prerequisites

- Git 2.9 or later (`--allow-unrelated-histories` behaviour).
- [`git-filter-repo`](https://github.com/newren/git-filter-repo) installed. It is the maintained replacement for `git filter-branch`, which Git's own documentation now warns against for being slow and full of footguns.
- **A pushed backup of every source repository.** Non-negotiable — history rewriting is destructive and there is no undo.
- A decided target layout. Write it down before running anything; changing your mind halfway means starting over.
- Clean working trees everywhere: no uncommitted changes, no unpushed commits in the sources.
- A decision on whether you are consolidating at all — see [Monorepo vs Polyrepo](monorepo-vs-polyrepo.md) if that is still open.

---

## Steps

### 1. Decide and write down the target layout

Every later step depends on this, and it is the cheapest thing to get right now.

```
  my-system/
    apps/
      api/          ← from the standalone  api  repository
      web/          ← from the standalone  web  repository
    packages/
      contracts/    ← from the standalone  contracts  repository
```

Decide also what happens to each source's root files. Three `README.md` files cannot all land at the root; they move into their subdirectories, and you write a new root one. Same for `.gitignore` (merge the contents), CI workflows (consolidated in step 7), and licence files.

### 2. Create the destination with an initial commit

Later merges need a base commit to merge onto.

```bash
mkdir my-system && cd my-system
git init -b main
printf '# my-system\n' > README.md
git add README.md
git commit -m "chore: initialise monorepo"
```

### 3. Rewrite each source so its files already sit at their final path

This is the step that makes the whole procedure work, and skipping it is the single most common mistake.

Clone each source with `--no-local` (so the rewrite cannot corrupt shared object storage), then move every file in *every commit of history* into its destination directory:

```bash
cd /tmp
git clone --no-local ~/src/api api-rewrite
cd api-rewrite
git filter-repo --to-subdirectory-filter apps/api
```

Every commit in that history now looks as though the files always lived at `apps/api/`.

**Why this beats merging first and then running `git mv`.** A `git mv` after the merge creates a single rename commit. Git detects renames heuristically, and `git log --follow` stops at that boundary for many files — so history before the move becomes unreachable through the new path. Rewriting first means there is no rename to detect: every historical commit already references the final path, and `--follow` sails straight through.

Repeat for each source:

```bash
cd /tmp && git clone --no-local ~/src/web web-rewrite
cd web-rewrite && git filter-repo --to-subdirectory-filter apps/web

cd /tmp && git clone --no-local ~/src/contracts contracts-rewrite
cd contracts-rewrite && git filter-repo --to-subdirectory-filter packages/contracts
```

### 4. Merge each rewritten history into the destination

```bash
cd ~/src/my-system

for src in api web contracts; do
  git remote add "$src" "/tmp/${src}-rewrite"
  git fetch "$src"
  git merge --allow-unrelated-histories --no-edit \
    -m "chore: merge ${src} into the monorepo" \
    "${src}/main"
  git remote remove "$src"
done
```

`--allow-unrelated-histories` is required because these histories share no common ancestor. Because step 3 already placed the files, no merge conflicts should occur — if one does, it means two sources wrote to the same path and your layout has a collision to resolve.

### 5. Reconcile tags

Three repositories each tagged `v1.0.0` collide, and Git will refuse or silently keep one. Rename tags during the rewrite, and take the opportunity to adopt namespaced tags, which is what a monorepo needs anyway:

```bash
# in each rewrite clone, before step 4
git filter-repo --to-subdirectory-filter apps/api --tag-rename '':'api-'
```

`v1.0.0` becomes `api-v1.0.0`. Going forward, prefer the `package@version` convention (`api@1.0.0`) that the [release tooling](inside-a-monorepo.md) expects. If the old tags carry no value, `--tag-rename` can be replaced by dropping them entirely.

### 6. Introduce the workspace

The repositories are merged; it is not yet a monorepo. Add the workspace layer and convert the internal dependencies from published packages to local ones:

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```diff
  // apps/api/package.json
- "@my-system/contracts": "^1.4.0"
+ "@my-system/contracts": "workspace:*"
```

Then delete the per-project lockfiles and generate one at the root:

```bash
rm apps/*/pnpm-lock.yaml packages/*/pnpm-lock.yaml
pnpm install
git add -A && git commit -m "feat: add workspace and resolve internal deps from disk"
```

### 7. Consolidate CI

Delete the per-project workflow files and write one root job that builds everything. Resist adding path filters now — get it correct first, make it fast when it is slow ([Monorepo CI](monorepo-ci.md)).

```bash
git rm -r apps/*/.github packages/*/.github
# write .github/workflows/ci.yml — one job, builds and tests all members
```

### 8. Archive the sources — do not delete them

Mark each source repository archived (read-only) on your host, and leave a pointer behind so anyone landing on an old link or an old clone knows where the code went:

```bash
cd ~/src/api
printf '# Moved\n\nThis project now lives in `my-system` under `apps/api`.\n' > README.md
git add README.md && git commit -m "docs: point to the monorepo"
```

Archiving rather than deleting preserves issues, pull requests, and every external link that points at them. Deleting breaks all of it permanently.

---

## Verification

Run all of these before archiving anything.

```bash
# 1. History survived: roughly the sum of the sources, plus your merge commits.
git rev-list --count HEAD

# 2. The critical one — history reaches back past the import.
git log --follow --oneline -- apps/api/src/main.ts | tail -5

# 3. Authors are intact, not collapsed into whoever ran the merge.
git log --format='%an' | sort -u

# 4. A clean clone builds from scratch.
cd /tmp && git clone ~/src/my-system verify && cd verify
pnpm install --frozen-lockfile && pnpm -r build && pnpm -r test

# 5. Repository size is sane.
git count-objects -vH
```

Step 2 is the one that actually matters. If `--follow` stops at the merge commit, step 3 was skipped or run incorrectly, and the fix is to redo the migration — not to patch it afterwards.

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `git log --follow` stops at the merge commit | Files were moved with `git mv` after merging instead of rewritten before | Redo from step 3 with `--to-subdirectory-filter` on the source clone |
| `fatal: refusing to merge unrelated histories` | The histories share no ancestor, which is expected here | Add `--allow-unrelated-histories` to the merge |
| Merge conflicts during step 4 | Two sources write to the same destination path | Fix the target layout so paths are disjoint, then redo the rewrites |
| Tags missing, or the wrong project's tag resolves | Identical tag names across sources collided | Re-run the rewrite with `--tag-rename '':'<prefix>-'` |
| Repository far larger than the sum of its parts | Large blobs buried in a source's history | `git filter-repo --strip-blobs-bigger-than 10M` before merging; adopt Git LFS going forward |
| `git-filter-repo` refuses to run | It requires a fresh clone by default, as a safety measure | Clone with `--no-local` as in step 3, or pass `--force` if you are certain |
| Authors show as the person who ran the merge | History was replayed rather than merged (e.g. via `rebase` or a squashed import) | Redo using `git merge`, which preserves commit metadata |
| You need one project back out again | The consolidation was the wrong call for that project | On a fresh clone: `git filter-repo --subdirectory-filter apps/api`, which inverts step 3 and yields a standalone repository with its history intact |

---

## References

- [`git-filter-repo` manual](https://htmlpreview.github.io/?https://github.com/newren/git-filter-repo/blob/docs/html/git-filter-repo.html) — the authoritative reference, including `--to-subdirectory-filter` and `--tag-rename`.
- [git-filter-branch(1)](https://git-scm.com/docs/git-filter-branch) — read the warning at the top, which is why this guide uses `filter-repo`.
- [git-merge(1) — `--allow-unrelated-histories`](https://git-scm.com/docs/git-merge#Documentation/git-merge.txt---allow-unrelated-histories).
- Chacon, Scott, and Ben Straub. [Pro Git — Rewriting History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History). Apress, 2nd edition.
- [GitHub — Archiving repositories](https://docs.github.com/en/repositories/archiving-a-github-repository/archiving-repositories) — the step-8 mechanics.
