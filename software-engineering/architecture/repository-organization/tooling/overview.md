---
type: concept
tags:
  - architecture
  - tool
  - repository-organization
  - build-system
  - overview
  - decision-support
related:
  - software-engineering/architecture/repository-organization/tooling/package-manager-workspaces
  - software-engineering/architecture/repository-organization/tooling/task-runners-and-caching
  - software-engineering/architecture/repository-organization/tooling/bazel
  - software-engineering/architecture/repository-organization/inside-a-monorepo
  - software-engineering/architecture/frontend/frontend-stacks-and-tooling
language: null
---
# Monorepo Tooling Overview

> A map of the tools that make one repository with many projects workable — arranged as a four-rung ladder, with the signal that tells you to climb and the honest note that most projects belong on the second rung forever.

---

## What is it?

This article is a **directory** of monorepo tooling, not a tutorial for any of it. The deeper articles in this subsection cover the rungs in detail; this one exists to show how they relate and to help you pick the lowest one that works.

The organising idea is that the tools form a ladder rather than a menu. Each rung adds one capability the one below lacks, and each rung's cost is the maintenance of everything below it plus itself.

```
  Rung 3  Hermetic build graph      Bazel · Buck2 · Pants · Please
            ↑ correctness across languages, remote execution
  Rung 2  Cached task runner        Turborepo · Nx · Moon · Lage
            ↑ don't redo work; know what's affected
  Rung 1  Package-manager workspace pnpm/npm/yarn · go.work · Cargo · Gradle · Melos
            ↑ resolve internal deps from disk; one lockfile
  Rung 0  Plain scripts             make · just · shell
            ↑ nothing shared but a directory
```

Cutting across all four rungs are three concerns that are not rungs of their own: release tooling, boundary enforcement, and version-control scaling.

---

## Why does it matter?

The most common and most expensive tooling mistake in a small monorepo is starting too high. Nx and Bazel both look like "the monorepo tool" from the outside, and adopting either before you have the problem it solves buys you a dependency, a configuration surface, and an upgrade treadmill in exchange for nothing measurable.

The ladder makes the alternative concrete: identify the capability you are actually missing, and add the cheapest thing that provides it. Every rung you skip past is a maintenance subscription you pay for as long as the repository exists — and at [solo scale](../solo-and-small-team-repositories.md) you pay it personally, with your weekends.

---

## How it works

### Rung 1 — package-manager workspaces

The workspace feature your package manager already ships. It discovers member projects by glob, resolves internal dependencies from disk instead of a registry, and produces one lockfile.

**Climb to rung 2 when:** a full build or test run has grown long enough that you have started avoiding it, or you have enough packages that rebuilding everything is obviously wasteful. Heuristics, not findings: full CI past **~10 minutes**, a local full test run past **~30 seconds**, or more than **~5 packages**.

| Ecosystem | The mechanism | Read more |
|---|---|---|
| **JavaScript / TypeScript** | `pnpm-workspace.yaml`, npm/yarn `workspaces`, the `workspace:` protocol | [Node.js toolchain](../../../../languages/nodejs/toolchain.md) · [TypeScript toolchain](../../../../languages/typescript/toolchain.md) |
| **Go** | `go.work` with a `use (...)` block | [Go — packages and modules](../../../../languages/go/packages-and-modules.md) |
| **Rust** | `[workspace] members`, one `Cargo.lock`, one shared `target/` | — |
| **JVM** | Gradle multi-project and composite builds; Maven `<modules>` | [Java — packages and build](../../../../languages/java/packages-and-build.md) |
| **Dart / Flutter** | Melos — `melos.yaml`, `melos bootstrap` | — |
| **Swift** | SwiftPM path dependencies; `App.xcworkspace` + `Packages/*` | [Swift Package Manager](../../../../languages/swift/swift-package-manager.md) |
| **Python** | uv workspaces, Poetry path dependencies, Pants for the build side | — |
| **.NET** | Solution files and project references | — |

Full treatment: [Package-Manager Workspaces](package-manager-workspaces.md).

### Rung 2 — cached task runners

A task graph plus content-addressed caching. The tool knows that `api:build` depends on `contracts:build`, hashes each task's declared inputs, and skips any task whose hash it has seen before. The same graph answers "what is affected by this change", which is what [Monorepo CI](../monorepo-ci.md) runs on.

**Climb to rung 3 when:** you genuinely need cross-language build correctness, hermetic reproducible builds, or remote execution — and can name the specific problem, not the aspiration.

| Tool | Positioning |
|---|---|
| **Turborepo** | A cache in front of the npm scripts you already have. Minimal config, minimal lock-in — remove it and the scripts still run. |
| **Nx** | A workspace framework: generators, plugins, an inferred graph, opinions. More power, more surface, more to remove later. |
| **Moon** | Rust-based, multi-language, more explicit task definitions than either. Smaller ecosystem. |
| **Lage / Rush** | Microsoft's entries; Rush is the heavyweight, aimed at large JS monorepos with strict policies. |
| **`make` / `just`** | No graph, no cache — and zero maintenance. Genuinely the right answer at rung 0 and sometimes at rung 1. |

Full treatment: [Task Runners and Caching](task-runners-and-caching.md).

### Rung 3 — hermetic build graphs

Every input declared, execution sandboxed, outputs reproducible. This is the only rung that gives correct caching across languages, and the only one where a mobile app and a backend can share one build graph.

| Tool | Pick this when |
|---|---|
| **Bazel** | You need the mature, general answer and can afford the investment. The largest rule ecosystem. |
| **Buck2** | You want Bazel's model with better performance and a thinner ecosystem. Meta's rewrite, in Rust. |
| **Pants** | Python-heavy, and you do not want to hand-write dependency lists — it infers them from imports. |
| **Please** | A lightweight, Go-native take on the same model. |

Full treatment: [Bazel](bazel.md), which covers the siblings too.

### Cross-cutting: release, boundaries, scale

Not rungs — concerns you address at whatever rung you are on.

| Concern | Options | Notes |
|---|---|---|
| **Release and versioning** | Changesets · Lerna · semantic-release · release-please | Only needed if you publish. Private products should deploy by commit SHA. |
| **Boundary enforcement** | eslint import rules · dependency-cruiser · Nx tags · Bazel `visibility` | The replacement for the publish step the monorepo deleted. Cheap on day one, expensive later. |
| **VCS scale** | sparse-checkout · partial clone · Git LFS · Scalar · Sapling | Irrelevant until the working tree is genuinely large; LFS is the exception, adopt it before the first big binary. |

### What this landscape is not

Tool positioning moves. As of this writing, Bazel has migrated from `WORKSPACE` to `MODULE.bazel` (Bzlmod) and Lerna is maintained by the Nx team — both recent enough that older material online contradicts them. Treat the rows above as orientation and confirm current state in each tool's own documentation before committing.

---

## Examples

Two assembled stacks, showing what a coherent choice looks like at each end.

**A solo TypeScript product — three projects, one contract package.**

```
  Rung 1 only.
  pnpm workspaces      ── resolve @my-system/contracts from disk
  one CI job           ── pnpm -r build && pnpm -r test
  one eslint rule      ── no cross-project deep imports
  no task runner, no cache, no release tooling (nothing is published)
```

That is the whole stack, and it is not a compromise — it is the correct answer until the build gets slow.

**A polyglot platform — Go services and a TypeScript web app, four engineers.**

```
  Rung 1   go.work  +  pnpm workspaces      ── two workspaces, one repo
  Rung 2   Turborepo over the TS side       ── cache + affected detection
           go build's own cache on the Go side
  CI       path filters at the language boundary,
           affected-graph filtering inside the TS workspace
  Release  deploy by commit SHA; no versions, no publishing
```

Note that the two ecosystems keep their own tooling and meet at the CI layer. Reaching for Bazel to unify them is rung 3, and at four engineers the unification is almost certainly not worth what it costs.

---

## When to use

- Deciding what to adopt for a new monorepo, or auditing whether an existing setup is carrying tools it does not need.
- Feeling build or CI pain and wanting to identify the specific missing capability rather than adopting the most-discussed tool.
- Choosing between Turborepo and Nx, or deciding whether Bazel is warranted — start here, then read the deep article.
- Orienting in an unfamiliar ecosystem's workspace story before diving into its documentation.

## When NOT to use

- **As a substitute for the deep articles** — every row here is one line of positioning, and picking a build system off a one-line summary is how repositories end up on rung 3 by accident.
- **As a live ranking** — the tooling moves faster than this page; verify current behaviour in each tool's own docs, especially anything about Bazel's module system or Lerna's maintenance.
- **As a checklist to adopt** — the ladder is meant to be climbed reluctantly; a repository using only rung 1 is not incomplete.
- **For intra-project structure** — none of this governs how modules are arranged inside a single project; that is [project organization](../../cli/project-organization.md), a different altitude.

---

## References

- [monorepo.tools](https://monorepo.tools/) — a maintained feature comparison across the rung-2 and rung-3 tools.
- Mokhov, Andrey, Neil Mitchell, and Simon Peyton Jones. [Build Systems à la Carte](https://www.microsoft.com/en-us/research/uploads/prod/2018/03/build-systems.pdf). ICFP 2018 — the theory that explains what separates rung 2 from rung 3.
- [Turborepo documentation](https://turborepo.com/docs) and [Nx documentation](https://nx.dev/getting-started/intro) — the two rung-2 tools you will actually choose between.
- [Bazel — Bzlmod migration guide](https://bazel.build/external/migration) — the current module system, and why older Bazel material is out of date.
