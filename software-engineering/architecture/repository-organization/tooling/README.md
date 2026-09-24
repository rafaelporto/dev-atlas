# Monorepo Tooling

The tools that make one repository holding many projects workable, arranged as a four-rung ladder: plain scripts, a package-manager workspace, a cached task runner, and a hermetic build graph. Each rung adds one capability the one below lacks, and each costs the maintenance of everything below it plus itself.

Start with the [Overview](overview.md) for the ladder and the signal that tells you to climb. The recommendation running through all four articles is to stop at the lowest rung that works — most small systems belong on the second one permanently.

---

## Articles

| Article | Description |
|---|---|
| [Monorepo Tooling Overview](overview.md) | The four-rung ladder with one-line positioning per tool, an ecosystem-by-ecosystem table, and the cross-cutting concerns that are not rungs |
| [Package-Manager Workspaces](package-manager-workspaces.md) | The workspace feature your package manager already ships: pnpm/npm/yarn, `go.work`, Cargo, Gradle, Maven, Melos, SwiftPM, uv |
| [Task Runners and Caching](task-runners-and-caching.md) | Turborepo, Nx, and the idea they share — a task graph keyed by the hash of each task's declared inputs — plus local and remote caching |
| [Bazel](bazel.md) | Google's language-agnostic, hermetic build graph — `MODULE.bazel`, Starlark, `visibility`, remote execution — with Buck2, Pants, and Please as siblings |

---

> Rung 3 differs from rung 2 on correctness, not speed. A task runner that serves a cache hit for an input you forgot to declare is wrong in a way a retry will not fix; a hermetic build graph makes that failure structurally impossible. Whether that guarantee is worth its price is the question these four articles exist to answer, and for a solo developer the answer is usually no.
