---
type: concept
tags:
  - architecture
  - concept
  - repository-organization
  - ci-cd
related:
  - software-engineering/architecture/repository-organization/inside-a-monorepo
  - software-engineering/architecture/repository-organization/tooling/task-runners-and-caching
  - devops/ci-cd/github-actions
  - devops/ci-cd/gitlab-ci
  - devops/concepts/ci-cd
  - devops/concepts/deployment-strategies
language: null
---
# Monorepo CI

> Building only what changed — path filters versus an affected graph, the three kinds of cache, the required-check trap that silently blocks every pull request, and what it means to deploy N artefacts from one commit.

---

## What is it?

Monorepo CI is the set of techniques for keeping a pipeline proportional to the change rather than to the repository.

The naive pipeline builds everything on every push. That is correct, simple, and the right default for a small repository — it is rung 1 of the [tooling ladder](tooling/overview.md) and many systems should stay there. It becomes untenable at a predictable point: when the time from push to feedback starts changing how you work.

Everything here is about the responses to that, ordered by how much machinery they demand.

---

## Why does it matter?

CI is the largest operational difference between one repository and many, and it is the cost most often discovered after the decision is made.

In a polyrepo, scoping is free — a push to the `api` repository builds `api`, because there is nothing else there. Collapse the repositories and that property disappears. You have to rebuild it deliberately, and how you rebuild it determines whether the pipeline is merely fast or actually correct.

The distinction between fast and correct is the substance of this article. The cheap technique is fast and occasionally wrong; the expensive one is correct by construction. Knowing which you have is what prevents the failure where CI is green and `main` is broken.

---

## How it works

### Two ways to know what changed — and they are not equivalent

**Path filters** operate at the version-control level. The CI platform compares changed file paths against a glob and decides whether to run the job at all.

```yaml
on:
  push:
    paths: ["apps/api/**", "packages/contracts/**"]
```

Cheap, needs no tooling, works on every platform. And **blind to the dependency graph**: the filter has no idea that `apps/api` depends on `packages/contracts`. You encoded that by hand, which means every consumer's filter list must name every shared package it transitively depends on — and that list rots the first time someone adds a dependency without remembering to update a YAML file three directories away. The failure is silent. The job does not fail; it does not run.

**Affected-graph detection** operates at the build-tool level. The tool knows the internal dependency graph, computes which projects are reachable from the changed files, and runs tasks for exactly those.

```bash
turbo run test --filter='...[origin/main]'         # everything affected since main
nx affected --target=test --base=origin/main
bazel query 'rdeps(//..., //packages/contracts:contracts)'
```

Correct by construction, because the graph is derived rather than declared. The cost is that you must be running a tool that maintains that graph ([Task Runners and Caching](tooling/task-runners-and-caching.md)).

| | Path filters | Affected graph |
|---|---|---|
| Tooling required | None | A task runner or build system |
| Knows transitive deps | No — you hand-maintain the list | Yes — derived from the graph |
| Failure mode | Silently skips a job that should have run | Over-builds when the graph is wrong |
| Cross-language | Yes, trivially | Only within what the tool understands |
| Good for | Small repos; coarse splits like mobile vs backend | Many interdependent packages in one ecosystem |

**The recommendation:** start with path filters. Move to the graph when you catch your filter lists being wrong — and you will notice, because something will merge broken. Coarse, genuinely independent splits (a macOS mobile job versus a Linux backend job) stay on path filters permanently; that is the case where the two sides share nothing but a contract directory, and a hand-written filter is exactly right.

### The required-status-check trap

This one deserves its own section because it wastes an afternoon of everybody's life exactly once.

Mark a path-filtered workflow as a **required check** for merging, and you have built a deadlock. When the filter does not match, the workflow never starts. A check that never starts never reports a status. The branch protection rule waits for a status that will never arrive, and the pull request is blocked forever — with no error, because nothing failed.

The fix is an always-running gate job that aggregates the conditional ones. Only the gate is marked required:

```yaml
jobs:
  api:
    if: needs.changes.outputs.api == 'true'
    # ...
  web:
    if: needs.changes.outputs.web == 'true'
    # ...

  ci-required:                 # ← the only required check
    if: always()
    needs: [api, web]
    runs-on: ubuntu-latest
    steps:
      - name: Verify no required job failed
        run: |
          # 'skipped' is success here; 'failure' and 'cancelled' are not.
          if echo '${{ join(needs.*.result, ",") }}' | grep -qE 'failure|cancelled'; then
            echo "A required job failed." && exit 1
          fi
```

`if: always()` makes the gate run even when its dependencies were skipped, and the result check treats `skipped` as a pass while still failing on real failures. Without both halves you have either the deadlock back or a gate that passes when things broke.

### Caching, three kinds

They are commonly conflated and they solve different problems:

1. **Dependency cache.** The package manager's download and store directory, keyed on the lockfile hash. Universally worth enabling; every CI platform has a one-line option for it.
2. **Build-artefact (task) cache.** The output of a task, keyed on the hash of that task's declared inputs — its own sources, its dependencies' output hashes, the lockfile, declared environment variables, the tool version. A hit means skipping the work entirely.
3. **Remote cache.** The task cache, shared across machines, so CI reuses what your laptop built and vice versa.

The load-bearing principle sits under (2):

> **If you cannot enumerate a task's inputs, you cannot cache it.**

An input you failed to declare — a file read at build time, an environment variable, a system-installed binary — does not change the hash, so a stale artefact gets served and the build is wrong in a way that survives a retry. This is exactly why [Bazel](tooling/bazel.md) insists on hermeticity: enumerate everything and sandbox the execution, and the cache is sound rather than probably fine.

For a solo developer the remote cache is close to worthless — one machine has nothing to share with — with the modest exception of laptop ↔ CI.

### Pipeline shapes

```
  (a) one job                (b) matrix per package      (c) affected graph
  ───────────                ────────────────────        ──────────────────
  ┌─────────────┐            ┌──────────┐                ┌──────────────────┐
  │ build all   │            │ detect   │                │ detect + build   │
  │ test all    │            │ changes  │                │ (one tool call)  │
  └─────────────┘            └────┬─────┘                └──────────────────┘
                              ┌───┴───┬───────┐
   correct, simple            ▼       ▼       ▼           correct, fast,
   right up to ~10 min      api     web    mobile         needs a task runner
                            (fan-out via fromJSON)
   ── rung 1 ──             ── rung 2, path filters ──    ── rung 2, graph ──
```

Shape (b) is the one people write by hand: a first job diffs against the base and emits a JSON list of changed projects; later jobs consume it as a matrix. It is flexible and it is exactly where the hand-maintained-dependency-list problem lives.

### Deploying from a monorepo

One commit now produces N artefacts, and "which applications changed" drives which deployments fire. Two things follow.

**A repository tag is meaningless.** `v1.4.0` says nothing when the repository holds three deployables on separate cadences. Namespace them (`api@1.4.0`) or deploy by commit SHA and skip versions entirely.

**You have a deploy order, and the monorepo did not give you a transaction.** If `api` and `web` both changed and the new `web` requires the new API, then `api` must land first — and between the two deployments the system is running mixed versions. The atomic commit created the *illusion* of simultaneity in source; production remains a distributed system with all its usual obligations. The tools are the ordinary ones: backward-compatible API changes, expand-then-contract migrations, feature flags — see [deployment strategies](../../../devops/concepts/deployment-strategies.md).

### Merge queues and trunk-based development

A monorepo pushes toward trunk-based development, because a long-lived branch now conflicts across a larger surface and integrates less often. That is mostly a good pressure.

It also makes the *semantic* conflict more likely: two branches that merge cleanly and break each other, because one changed a shared package's behaviour and the other added a caller. A merge queue — testing each pull request against the state that will exist after the ones ahead of it land — is the mechanism that catches this, and it is the first piece of large-team CI machinery that starts to earn its keep at around four or five active contributors.

---

## Examples

Path filters with a proper required gate, on GitHub Actions:

```yaml
name: ci
on: [push, pull_request]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      web: ${{ steps.filter.outputs.web }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api:
              - 'apps/api/**'
              - 'packages/contracts/**'      # hand-maintained: the rot lives here
            web:
              - 'apps/web/**'
              - 'packages/contracts/**'
              - 'packages/ui/**'

  api:
    needs: changes
    if: needs.changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm --filter @my-system/api test

  ci-required:
    if: always()
    needs: [api, web]
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo '${{ join(needs.*.result, ",") }}' | grep -qE 'failure|cancelled' && exit 1 || exit 0
```

The same intent with an affected graph — no filter lists, because the tool derives them:

```yaml
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }         # affected detection needs history
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run build test --filter='...[origin/main]'
```

`fetch-depth: 0` is the step everyone forgets: a shallow clone has no merge base, so the comparison silently degrades to "everything changed".

And the GitLab equivalent of the filter:

```yaml
api:test:
  rules:
    - changes: ["apps/api/**/*", "packages/contracts/**/*"]
  script: pnpm --filter @my-system/api test
```

---

## When to use

- A repository where full CI has grown past the point where you notice waiting for it — the heuristic is around ten minutes, but the real signal is behavioural.
- Any repository mixing runner types, where one side is materially more expensive — a macOS mobile job beside a Linux backend is the canonical case.
- Repositories with enough interdependent packages that hand-maintained filter lists have started being wrong.
- Any pipeline where path-filtered jobs are required for merge — the gate job is not optional there, it is the fix for a deadlock you will otherwise hit.

## When NOT to use

- **Adding affected-graph detection to a repository whose full CI takes four minutes** — you have added a tool, a dependency, and a class of graph bug to save nothing; build everything until building everything hurts.
- **Marking a path-filtered job as a required check directly** — a skipped job never reports, and the pull request blocks forever with nothing to show for it; require an always-running gate instead.
- **Trusting a build cache for tasks with undeclared inputs** — a task that reads a file or environment variable it never declared will serve a stale artefact on a cache hit, and the failure survives a retry.
- **Running affected detection on a shallow clone** — with no merge base the diff degrades to "everything", and you have paid for the tool while still building the world.
- **Treating one commit as one deployment** — N artefacts deploy in some order, and the window between them runs mixed versions; the repository was atomic, production is not.
- **Adopting a merge queue at two contributors** — it exists to serialise integration between people, and it adds latency to every merge in exchange for nothing when there is no contention.

---

## References

- [GitHub Actions — Workflow syntax: `on.push.paths`](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#onpushpull_requestpaths).
- [GitHub Docs — About protected branches: required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging) — the behaviour the gate job works around.
- [GitLab CI/CD — `rules:changes`](https://docs.gitlab.com/ci/yaml/#ruleschanges).
- [Turborepo — Filtering workspaces](https://turborepo.com/docs/reference/run#--filter-string) — the `...[origin/main]` syntax for affected detection.
- [Bazel — Query how-to](https://bazel.build/query/quickstart) — `rdeps` and reverse-dependency queries for affected targets.
- Mokhov, Andrey, Neil Mitchell, and Simon Peyton Jones. [Build Systems à la Carte](https://www.microsoft.com/en-us/research/uploads/prod/2018/03/build-systems.pdf). ICFP 2018 — the theory underneath input hashing and why undeclared inputs break correctness.
