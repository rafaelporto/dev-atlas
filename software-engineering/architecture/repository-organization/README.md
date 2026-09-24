# Repository Organization

How source code is distributed across version-control repositories — one repository holding many projects, or many repositories holding one each — and what actually follows from that choice. This section is deliberately calibrated for small scale: most published material on monorepos is written at Google or Meta scale, where the dominant costs are organisational, and read at one to three people it recommends tooling for problems that do not exist yet.

Start with [Monorepo vs Polyrepo](monorepo-vs-polyrepo.md) for the vocabulary and the four boundaries the debate usually conflates. [Solo and Small-Team Repository Layout](solo-and-small-team-repositories.md) is the core article — it argues that almost every benefit of a monorepo is scale-independent while almost every cost is not, and says plainly where that claim breaks.

---

## Articles

| Article | Description |
|---|---|
| [Monorepo vs Polyrepo](monorepo-vs-polyrepo.md) | The two models side by side — the four boundaries people conflate, what actually changes, and the hybrid most projects end up running |
| [Solo and Small-Team Repository Layout](solo-and-small-team-repositories.md) | The same decision at one to three people — why nearly every monorepo benefit is scale-independent and nearly every cost is not |
| [Inside a Monorepo](inside-a-monorepo.md) | The machinery of one repository holding many projects: the workspace layer, the internal dependency graph, the one-version rule, and the four costs |
| [Mobile and Backend in One Repository](mobile-and-backend-in-one-repo.md) | Whether the mobile app belongs beside the API — the shared contract as the real prize, and the toolchain, CI, and release-cadence bill |
| [Monorepo CI](monorepo-ci.md) | Path filters versus an affected graph, the three kinds of cache, the required-check trap, and deploying N artefacts from one commit |
| [How to Merge Repositories into a Monorepo](merging-repositories-into-a-monorepo.md) | Consolidate several standalone repositories into one with `git filter-repo`, keeping every commit, author, and `git log --follow` intact |

---

## Tooling

| Subsection | Description |
|---|---|
| [Monorepo Tooling](tooling/README.md) | The four-rung ladder — plain scripts, package-manager workspaces, cached task runners, hermetic build graphs — covering pnpm and `go.work` through Turborepo, Nx, and Bazel |

---

## Related reading

| Topic | Where |
|---|---|
| Submodules, subtree, and vendoring — sharing code *between* repositories | [Git — Submodules](../../../tools/git/submodules.md) |
| Module boundaries *inside* a single project | [Project Organization for Terminal Programs](../cli/project-organization.md) |
| Independently deployable services, the classic driver of many repositories | [Microservices](../microservices.md) |
| CI/CD platforms the monorepo pipelines here are built on | [DevOps — CI/CD](../../../devops/ci-cd/README.md) |

---

> The repository boundary is not the same as the deployment boundary, the ownership boundary, or the release-cadence boundary — and almost every bad argument about monorepos comes from treating those four as one decision. A monorepo collapses only the first. See [Monorepo vs Polyrepo](monorepo-vs-polyrepo.md) for why that distinction does most of the work in this section.
