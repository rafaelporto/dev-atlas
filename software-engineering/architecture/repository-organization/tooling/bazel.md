---
type: concept
tags:
  - architecture
  - tool
  - repository-organization
  - build-system
related:
  - software-engineering/architecture/repository-organization/tooling/overview
  - software-engineering/architecture/repository-organization/tooling/task-runners-and-caching
  - software-engineering/architecture/repository-organization/mobile-and-backend-in-one-repo
  - tools/git/submodules
  - languages/java/packages-and-build
language: null
---
# Bazel

> A build tool that executes a graph of explicitly declared steps in a sandbox, so the same inputs always produce the same outputs — with Buck2, Pants, and Please as siblings, and an honest account of why a solo developer almost certainly should not adopt it.

---

## What is it?

Bazel is a build tool that builds and tests software by executing a graph of explicitly declared steps, in a sandbox, so that the same inputs always produce the same outputs.

Three properties follow from that sentence, and together they define rung 3 of the [tooling ladder](overview.md):

- **Language-agnostic.** One graph can span Go, Java, C++, TypeScript, Swift, and Kotlin. The rung-2 tools cannot.
- **Hermetic.** A build action sees only its declared inputs. Not "should only read" — *cannot* read anything else, because the sandbox does not expose it.
- **Correct caching.** Because inputs are enumerated and enforced, a cache hit is sound rather than probably fine. This is the actual difference from [task runners](task-runners-and-caching.md), and it is a correctness difference rather than a speed one.

Bazel is Google's open-sourced Blaze. Buck2 (Meta), Pants, and Please implement the same model.

---

## Why does it matter?

Because it is the only rung where the caching story is sound, and the only one where a mobile app and a backend in [one repository](../mobile-and-backend-in-one-repo.md) can genuinely share a build graph.

At rung 2, an input you forgot to declare produces a wrong cache hit that survives retries. Bazel makes that failure structurally impossible: the action cannot read an undeclared file because the sandbox does not contain it. You find out at build time, loudly, instead of at runtime, silently.

It also matters because it is the thing people ask about. "Should we use Bazel?" is the most common monorepo tooling question, and the honest answer for most readers here is no — but the answer is worth more with the reasoning attached than as a flat verdict.

---

## How it works

### Workspaces, packages, targets, labels

The vocabulary, which is small and used consistently:

- A **workspace** is the root, marked by `MODULE.bazel`.
- A **package** is any directory containing a `BUILD` (or `BUILD.bazel`) file.
- A **target** is something declared in a `BUILD` file — a library, a binary, a test.
- A **label** names a target: `//apps/api:server`. The `//` is the workspace root, the path is the package, the part after `:` is the target. `//...` means every target recursively.

> **A currency warning.** `MODULE.bazel` (the Bzlmod system) replaced the old `WORKSPACE` file, which is being removed. A great deal of Bazel material online — including tutorials still ranking well — predates this and will not work as written. Check the version any example targets before following it.

### BUILD files and Starlark

`BUILD` files are written in Starlark, a Python-like language that is **deliberately not Turing-complete**: no I/O, no unbounded loops, no recursion, deterministic evaluation.

That restriction is not conservatism. It is what makes the graph analyzable. Because evaluating a `BUILD` file cannot read the network, look at the clock, or loop forever, Bazel can load the entire graph, reason about it, and answer questions about it without building anything. Every capability below depends on this.

```python
# apps/api/BUILD.bazel
load("@rules_go//go:def.bzl", "go_binary", "go_library")

go_library(
    name = "api_lib",
    srcs = ["server.go", "handlers.go"],
    importpath = "example.internal/apps/api",
    deps = ["//packages/contracts:contracts"],   # an explicit edge
    visibility = ["//visibility:private"],
)

go_binary(
    name = "server",
    embed = [":api_lib"],
    visibility = ["//visibility:public"],
)
```

Every source file is listed. Every dependency is listed. Nothing is inferred — which is the cost, and the reason `Gazelle` exists to generate these files from your imports.

### Hermeticity and the sandbox

Each action runs in a sandbox containing exactly its declared inputs. The failure mode this eliminates is familiar: a build that works on your machine because a system header, a globally installed tool, or a stray file was in scope, and fails on a colleague's machine or in CI.

Under Bazel that build fails immediately and locally, with a message naming the missing input. Toolchains are declared and downloaded rather than assumed, so the compiler itself is part of the hermetic boundary.

### `visibility` — the boundary the monorepo removed

This is Bazel's most underrated feature in a monorepo context, and the one this section cares about most.

[Adopting a monorepo](../inside-a-monorepo.md) deletes the publish step that used to make internal modules unreachable. `visibility` restores that boundary at the build-graph level, enforced by the build rather than by review:

```python
# packages/contracts/BUILD.bazel
go_library(
    name = "contracts",
    srcs = glob(["*.go"]),
    visibility = ["//apps:__subpackages__"],    # apps may depend on this
)

go_library(
    name = "internal_storage",
    srcs = ["storage.go"],
    visibility = ["//visibility:private"],      # nothing outside this package
)
```

An import that violates this does not lint-warn. It fails the build. For a [solo developer](../solo-and-small-team-repositories.md) with no code review, a boundary the build enforces is worth considerably more than one a human is supposed to notice — and this is the one genuinely strong argument for Bazel at small scale, even though the rest of the bill usually outweighs it.

### Query and affected targets

Because the graph is fully analyzable, you can interrogate it without building:

```bash
bazel query 'deps(//apps/api:server)'                       # what does this need?
bazel query 'rdeps(//..., //packages/contracts:contracts)'  # what breaks if I change this?
bazel query 'kind(go_test, //apps/...)'                     # all Go tests under apps/
```

`rdeps` is affected-target detection, and it is exact rather than approximate. In CI the usual pattern is a target-determinator step that diffs against the merge base and emits the affected target list.

### Remote cache versus remote execution

Two different things, often conflated:

- **Remote cache** — a shared store of action outputs. Everyone reuses everyone's results. Cheap to run, immediately useful with more than one machine.
- **Remote execution** — actions themselves run on a build farm, hundreds in parallel. This is what turns a forty-minute build into a two-minute one, and it needs real infrastructure.

Hosted options include BuildBuddy and EngFlow; BuildBarn and Buildfarm are self-hosted. Remote execution only makes sense when hermeticity is genuinely airtight, which is the point: the sandbox is what makes running an action on a stranger's machine safe.

### Rules and the maturity gradient

Bazel does not know how to build anything by itself. Rules do, and their quality varies enormously — this is the practical determinant of whether Bazel will work for you:

| Ecosystem | State |
|---|---|
| **Go, Java, C++, Python** | Excellent. `rules_go` with Gazelle generating `BUILD` files is close to frictionless. |
| **JavaScript / TypeScript** | `aspect_rules_js` is workable and is a real project to set up. Fighting npm's model inside a hermetic system is inherent, not incidental. |
| **Swift / iOS, Kotlin / Android** | `rules_apple` and `rules_kotlin` are used at scale by Uber, Lyft, and Reddit — and getting there is a major, sustained investment. |

**That last row is the direct answer to "can one tool span a mobile-plus-backend monorepo?"** Yes — Bazel is the only realistic option, and the cost is measured in engineer-months, not afternoons. For the repository shape described in [Mobile and Backend in One Repository](../mobile-and-backend-in-one-repo.md), two independent toolchains glued by CI path filters is the right answer at small scale, and Bazel becomes reasonable only when a dedicated build team exists.

### Siblings: Buck2, Pants, Please

| Tool | Pick this instead when |
|---|---|
| **Buck2** | You want Bazel's model with notably better performance and can accept a thinner rule ecosystem. Meta's Rust rewrite. |
| **Pants** | Your codebase is Python-heavy and you do not want to hand-write dependency lists — Pants infers them from imports, which removes Bazel's single biggest ergonomic cost. |
| **Please** | You want a lighter, Go-native take on the same ideas with a much smaller surface. |

The concepts transfer completely. Learn one and you can read all four.

### The cost, stated plainly

- Every dependency is declared by hand, or generated by Gazelle — which you then maintain.
- Third-party dependencies must be re-expressed in Bazel's model rather than consumed from their native package manager.
- IDE integration is extra work in every ecosystem, and worse in some.
- The rule set for your language may become a part-time job.
- The learning curve is real, and it is steepest exactly when you are trying to get the first build working.

> **For a solo developer, Bazel is almost never the right answer.** The investment is amortised over thousands of builds by hundreds of engineers, and that recovery never arrives at small scale. The honest reason it appears in this section is that it is the thing people ask about — and knowing precisely why you are not adopting it is more useful than not knowing it exists.

---

## Examples

A minimal two-package workspace, complete:

```python
# MODULE.bazel — the workspace root, Bzlmod style
module(name = "my_system", version = "0.1.0")

bazel_dep(name = "rules_go", version = "0.50.1")
bazel_dep(name = "gazelle", version = "0.39.1")
```

```python
# packages/contracts/BUILD.bazel
load("@rules_go//go:def.bzl", "go_library")

go_library(
    name = "contracts",
    srcs = ["user.go"],
    importpath = "example.internal/packages/contracts",
    visibility = ["//apps:__subpackages__"],   # only apps/ may depend on this
)
```

```python
# apps/api/BUILD.bazel
load("@rules_go//go:def.bzl", "go_binary", "go_library", "go_test")

go_library(
    name = "api_lib",
    srcs = ["main.go"],
    importpath = "example.internal/apps/api",
    deps = ["//packages/contracts:contracts"],
)

go_binary(name = "server", embed = [":api_lib"])

go_test(
    name = "api_test",
    srcs = ["main_test.go"],
    embed = [":api_lib"],
)
```

Building and interrogating it:

```bash
bazel build //...                                            # everything
bazel test //apps/api:api_test                               # one target
bazel run //:gazelle                                         # regenerate BUILD files
bazel query 'rdeps(//..., //packages/contracts:contracts)'   # affected by a contracts change
```

And the boundary being enforced — the payoff for all the declaration:

```bash
$ bazel build //tools/scripts:cleanup
ERROR: //tools/scripts:cleanup depends on //packages/contracts:contracts
which is not visible from target //tools/scripts:cleanup.
Check the visibility declaration of the former target.
```

A build failure, not a code-review comment. That is the difference.

---

## When to use

- A genuinely polyglot repository where one build graph across languages would remove real duplication — and where nothing at rung 2 can express it.
- Builds that must be reproducible byte-for-byte, for compliance, supply-chain attestation, or release verification.
- Build times long enough that remote execution changes how the team works — typically tens of minutes across a large codebase.
- Mobile plus backend in one repository, at an organisation with people to own the build system.
- Large codebases where `visibility` enforcing architectural boundaries at build time is worth the declaration overhead on its own.

## When NOT to use

- **A solo developer or a team of two or three** — the investment amortises over a scale you do not have, and the same afternoon spent on a lint rule buys most of the boundary benefit.
- **A single-language JavaScript repository** — `aspect_rules_js` fights npm's model, and Turborepo gives you most of the practical benefit for a fraction of the cost.
- **Adopting it for build speed alone** — without remote execution the speedup is modest, and remote execution needs infrastructure you must run and pay for.
- **Following a `WORKSPACE`-based tutorial** — that system is being removed; anything not using `MODULE.bazel` is teaching you a migration you will have to undo.
- **Expecting rules for your ecosystem to be a solved problem** — check the maturity of the specific rule set before committing; "Bazel supports it" and "Bazel supports it pleasantly" are different claims.
- **Using it to compensate for an undeclared-input problem you could just fix** — if three tasks have sloppy inputs, fix the three tasks rather than adopting a build system to make sloppiness impossible.

---

## References

- [Bazel documentation](https://bazel.build/) — start with [Concepts and terminology](https://bazel.build/concepts/build-ref).
- [Bazel — Bzlmod migration guide](https://bazel.build/external/migration) — the `WORKSPACE` to `MODULE.bazel` transition, and why older material misleads.
- [The Starlark language specification](https://github.com/bazelbuild/starlark/blob/master/spec.md) — including the deliberate restrictions that make the graph analyzable.
- [Bazel — Visibility](https://bazel.build/concepts/visibility) — the boundary enforcement mechanism.
- Mokhov, Andrey, Neil Mitchell, and Simon Peyton Jones. [Build Systems à la Carte](https://www.microsoft.com/en-us/research/uploads/prod/2018/03/build-systems.pdf). ICFP 2018 — the authoritative theory paper; Bazel is its "cloud build system with deep constructive traces".
- [Buck2](https://buck2.build/), [Pants](https://www.pantsbuild.org/), and [Please](https://please.build/) — the siblings.
