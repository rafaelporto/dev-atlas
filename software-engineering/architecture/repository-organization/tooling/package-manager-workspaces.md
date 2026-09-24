---
type: concept
tags:
  - architecture
  - tool
  - repository-organization
  - build-system
related:
  - software-engineering/architecture/repository-organization/tooling/overview
  - languages/go/packages-and-modules
  - languages/typescript/toolchain
  - languages/nodejs/toolchain
  - languages/java/packages-and-build
  - languages/swift/swift-package-manager
language: null
---
# Package-Manager Workspaces

> The monorepo feature your package manager already ships — glob-discovered members, internal dependencies resolved from disk, and one lockfile — surveyed across JavaScript, Go, Rust, the JVM, Dart, Swift, Python, and .NET.

---

## What is it?

A workspace is **a set of packages that one package manager or build tool resolves together from a single checkout**. That is the definition this whole section uses, and it is worth restating here because the word is badly overloaded — an Angular CLI workspace is a single project root, an Xcode `.xcworkspace` is an IDE container, a Tekton workspace is a shared volume. None of those are this.

This is rung 1 of the [tooling ladder](overview.md), and the only rung most small monorepos ever need. The title says *package-manager* workspaces specifically to keep the distinction sharp.

A workspace does exactly three things:

1. **Discovers members**, usually by glob over directories.
2. **Resolves internal dependencies by path** rather than from a registry — so editing a shared package is immediately visible to its consumers, with no publish, no version, and no skew.
3. **Produces one lockfile**, so every member resolves third-party dependencies from the same tree.

Point 2 is the one that matters. Everything a monorepo promises about atomic cross-project changes depends on it.

---

## Why does it matter?

Without a workspace layer, several projects sharing a `.git` directory is just a shared directory. They either duplicate code or reach into each other's source trees by relative path — coupling with none of the benefits and no tool that understands it.

The workspace is also, for most projects, the *entire* tooling investment. It ships with something you already installed, it is a handful of lines of configuration, and it has no upgrade treadmill of its own. Knowing your ecosystem's version of it is what lets you skip rungs 2 and 3 with a clear conscience.

---

## How it works

### JavaScript and TypeScript

The most developed workspace story, and the one the other ecosystems are usually compared against.

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// apps/web/package.json
{ "dependencies": { "@my-system/ui": "workspace:*" } }
```

The `workspace:` protocol is the important part: it says "this must come from this repository", and it fails loudly rather than silently installing a registry package that happens to share the name. npm and yarn both support workspaces too (via a `workspaces` array in the root `package.json`), but only pnpm and yarn implement the protocol.

Two pnpm properties worth the switch. Its store is content-addressed and hard-linked, so disk usage stays flat as packages multiply. And its `node_modules` layout is **strict** — a package can only import what it declares. That catches *phantom dependencies*, where code works by accident because a transitive dependency happened to be hoisted into scope, and then breaks when the dependency tree shifts. That is a correctness benefit, not a speed one, and it is the strongest argument for pnpm in a monorepo.

Running across members:

```bash
pnpm -r build                        # every package
pnpm --filter @my-system/web build   # one package and, with ..., its deps
```

On top of this, TypeScript adds **project references** — `composite: true` plus a `references` array — which give the compiler its own incremental build graph via `tsc -b`. See [TypeScript toolchain](../../../../languages/typescript/toolchain.md).

### Go

```
  go.work
  ├── use ./apps/api
  ├── use ./apps/worker
  └── use ./packages/contracts
```

```bash
go work init ./apps/api ./apps/worker ./packages/contracts
```

Within a workspace, a module's dependency on a sibling resolves to the local directory, so changes are visible immediately without publishing or `replace` directives.

**A refinement worth stating explicitly.** The standard advice — reflected in [Go — packages and modules](../../../../languages/go/packages-and-modules.md) — is to keep `go.work` out of version control, because it describes one developer's local layout. **In a monorepo that advice inverts.** The set of modules is not a local accident; it is a property of the repository, identical for everyone who clones it. Commit `go.work` there. The original advice targets the case where `go.work` points at directories that exist only on your machine, which is precisely what does not happen inside a single repository.

Go's `internal/` directory convention is also the cheapest boundary enforcement in any ecosystem: a package under `internal/` is importable only by code rooted at its parent, enforced by the compiler.

### Rust

```toml
# Cargo.toml at the root
[workspace]
members = ["apps/*", "packages/*"]
resolver = "2"

[workspace.dependencies]
serde = "1"           # one version, inherited by members
```

One `Cargo.lock` and one shared `target/` directory for the whole workspace, so a dependency compiled for one member is reused by all of them. `[workspace.dependencies]` gives the one-version rule first-class syntax — members write `serde.workspace = true` instead of restating a version.

### The JVM

Gradle has two distinct mechanisms, and confusing them is the usual mistake.

```kotlin
// settings.gradle.kts — multi-project: one build, many subprojects
include(":apps:api", ":packages:contracts")
```

```kotlin
// settings.gradle.kts — composite: include another *independent* build
includeBuild("../shared-library")
```

**Multi-project** is one build with subprojects that share configuration and a task graph — this is the monorepo case. **Composite builds** wire together builds that remain independently buildable, substituting a binary dependency for a local source one; that is closer to a workspace spanning repository boundaries. Maven's `<modules>` is the multi-project equivalent, simpler and less configurable.

Gradle's own build cache and configuration cache mean a JVM monorepo gets rung-2 capabilities without a separate task runner — an important asymmetry against the JavaScript ecosystem. The mobile module graph in [Modular Architecture (Mobile)](../../mobile/modular-architecture.md) is this machinery applied one altitude down, inside a single app.

### Dart and Flutter — Melos

Pub has no workspace concept comparable to the others, so the community answer is effectively native:

```yaml
# melos.yaml
name: my_system
packages:
  - apps/**
  - packages/**
```

`melos bootstrap` walks the packages and injects path overrides into each `pubspec.yaml`, so intra-repository dependencies resolve locally. `melos exec` runs a command across members. This is the one ecosystem where a third-party tool is the standard answer rather than an optional layer.

### Swift

SwiftPM has path dependencies, which is the whole mechanism:

```swift
// apps/App/Package.swift
dependencies: [ .package(path: "../../packages/Core") ]
```

The common layout is an `App.xcworkspace` containing the app project plus a `Packages/` directory of local SwiftPM packages — the arrangement [Swift Package Manager](../../../../languages/swift/swift-package-manager.md) calls multi-package. Note the terminology collision head-on: the `.xcworkspace` is an Xcode container, not a package-manager workspace. The actual workspace behaviour comes from the path dependencies, and would work without Xcode.

### Python and .NET

**Python:** `uv` provides real workspaces (`[tool.uv.workspace] members`) with one lockfile — currently the cleanest option. Poetry offers path dependencies with `develop = true`. For anything build-heavy, Pants is the common step up, because it infers dependencies from imports rather than making you declare them.

**.NET:** a solution file plus `<ProjectReference>` has covered this since the beginning; `Directory.Build.props` and `Directory.Packages.props` give centrally managed versions — the one-version rule with first-class support.

### The limits of this rung

What a workspace does *not* give you, and therefore what the climb signal looks like:

- **No caching.** Every build is from scratch.
- **No affected detection.** `pnpm -r build` builds everything, every time.
- **No task graph across ecosystems.** Two workspaces in one repository are two islands.
- **No enforced boundaries.** Members can import each other's internals freely; nothing here stops that (Go's `internal/` and .NET's `internal` are the partial exceptions).

When rebuilding everything becomes the thing you wait on, that is rung 2: [Task Runners and Caching](task-runners-and-caching.md).

---

## Examples

The complete rung-1 setup for a TypeScript monorepo — every file involved:

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// package.json (root) — scripts that fan out, nothing else
{
  "name": "my-system",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test"
  }
}
```

```json
// packages/contracts/package.json — the shared package
{ "name": "@my-system/contracts", "main": "./src/index.ts" }
```

```json
// apps/api/package.json — consumes it from disk
{
  "name": "@my-system/api",
  "dependencies": { "@my-system/contracts": "workspace:*" }
}
```

```typescript
// apps/api/src/server.ts — no build step needed between the two
import type { User } from "@my-system/contracts";

export function serialiseUser(user: User): string {
  return JSON.stringify(user);
}
```

Four small files and one import. That is the entire mechanism the rest of the monorepo argument rests on.

---

## When to use

- Any repository with two or more projects that share code — this is the minimum viable monorepo, and often the maximum needed.
- As the deliberate stopping point for a small system: a workspace with no task runner is a complete, defensible setup.
- When you want the one-version rule for third-party dependencies without adopting a build system.
- As the foundation layer under a task runner — rung 2 tools sit on top of a workspace, they do not replace it.

## When NOT to use

- **A workspace for a single package** — the layer costs configuration and buys nothing until there are two members.
- **Assuming the workspace enforces boundaries** — members can import each other's internals freely; add a lint rule, or use an ecosystem that enforces it (`internal/` in Go).
- **Gitignoring `go.work` in a monorepo** — the general advice targets machine-specific layouts; inside one repository the module set is a repository property and belongs in version control.
- **Confusing Gradle composite builds with multi-project builds** — `includeBuild` wires independent builds together, `include` declares subprojects of one build; reaching for the former inside a single repository adds indirection for nothing.
- **Expecting a workspace to span ecosystems** — a `go.work` and a pnpm workspace in the same repository are two islands that meet only in CI.
- **Installing a registry package that shadows an internal one** — without the `workspace:` protocol a typo silently pulls a stranger's package of the same name; use the protocol where your package manager supports it.

---

## References

- [pnpm — Workspaces](https://pnpm.io/workspaces) and [the `workspace:` protocol](https://pnpm.io/workspaces#workspace-protocol-workspace).
- [The Go Blog — Get familiar with workspaces](https://go.dev/blog/get-familiar-with-workspaces) and [`go work` reference](https://go.dev/ref/mod#workspaces).
- [The Cargo Book — Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html).
- [Gradle — Structuring projects with Gradle](https://docs.gradle.org/current/userguide/multi_project_builds.html) and [Composite builds](https://docs.gradle.org/current/userguide/composite_builds.html).
- [Melos documentation](https://melos.invertase.dev/) — the Dart and Flutter answer.
- [Swift Package Manager — Package dependencies](https://docs.swift.org/package-manager/PackageDescription/PackageDescription.html#package-dependency).
- [uv — Workspaces](https://docs.astral.sh/uv/concepts/projects/workspaces/) — the current Python option.
