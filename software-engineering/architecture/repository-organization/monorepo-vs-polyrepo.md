---
type: concept
tags:
  - architecture
  - concept
  - repository-organization
  - comparison
  - decision-support
  - overview
related:
  - software-engineering/architecture/repository-organization/inside-a-monorepo
  - software-engineering/architecture/repository-organization/solo-and-small-team-repositories
  - software-engineering/architecture/repository-organization/tooling/overview
  - tools/git/submodules
  - software-engineering/architecture/microservices
language: null
---
# Monorepo vs Polyrepo

> One repository or many — what actually differs between the two, which axes the choice really turns on, and why the answer at three projects has nothing to do with the answer at three thousand.

---

## What is it?

A repository layout is the decision about how many version-control repositories your projects live in, and where the line between them falls.

Two names cover the field. A **monorepo** is a single repository holding several independently buildable projects. A **polyrepo** (also "multi-repo") gives each project its own repository. Polyrepo is the null hypothesis: run `git init` once per project and you are already there, which is why it rarely gets argued for — it is what happens when nobody decides anything.

Two confusions have to die before the rest of this section makes sense.

**A monorepo is not a monolith.** The repository is a unit of *source storage*; a monolith is a unit of *deployment*. They are orthogonal. Google runs a monorepo of thousands of independently deployed services. A three-repo project can still ship one binary. Nothing about putting code in one repository says anything about how many processes run in production.

**A polyrepo is not microservices.** [Microservices](../microservices.md) is a decision about runtime boundaries — independently deployable services communicating over a network. Where their source code sits is a separate question with a separate answer, and "one service, one repository" is a convention, not a requirement.

> **A note on the word "workspace."** This section uses *workspace* in exactly one sense: **a set of packages that a single package manager or build tool resolves together from one checkout** — a pnpm workspace, a `go.work` file, a Cargo workspace. The word is heavily overloaded elsewhere in this wiki and in the wider ecosystem: an Angular CLI workspace is a single project root, an Xcode `.xcworkspace` is an IDE container, a Tekton workspace is a shared volume. None of those are meant here. Every other article in this section links back to this definition rather than restating it.

---

## Why does it matter?

The choice is cheap to make and expensive to reverse, and it sets the default cost of the most common operation in a multi-project system: **changing two projects at once.**

In one repository, adding a field to a shared type and updating both consumers is one commit. In many repositories it is a pull request against the shared library, a version bump, a publish, a wait for the registry, then a pull request against each consumer to raise the dependency — and until the last one lands, your system exists in a state no single commit describes.

That asymmetry compounds. Every cross-cutting change you will ever make pays it, and the interest rate is set on day one when you decide how many repositories exist.

At the scale most readers of this section work — one person, or a handful — the cost is not measured in build-farm dollars. It is measured in hours per week spent on ceremony that exists to coordinate people who are not there. See [Solo and Small-Team Repository Layout](solo-and-small-team-repositories.md), which is the article this one exists to set up.

---

## How it works

### The four boundaries that get conflated

Almost every bad argument about monorepos comes from treating these four as one decision. They are independent, and naming them separately dissolves most of the debate:

| Boundary | The question it answers | Set by |
|---|---|---|
| **Repository** | How many checkouts does a contributor need? | How many times you ran `git init` |
| **Build and deploy** | How many artefacts ship, and can they ship separately? | Your build configuration and pipelines |
| **Ownership** | Who reviews and approves a change to this code? | `CODEOWNERS`, review rules, team charter |
| **Release cadence** | How often can this piece change in production? | Distribution channel and consumer upgrade behaviour |

A monorepo collapses only the *first* one. It does not merge your deployables, it does not erase ownership, and it does not synchronise release cadence — though teams keep expecting it to, and then blaming the monorepo when it does not.

The reverse trap is just as common: splitting repositories to *create* ownership or cadence boundaries that were never encoded anywhere. A repository boundary is a weak enforcement mechanism for either. It stops nothing except a single `grep`.

### The single-repository model

```
  my-system/
    apps/
      api/            deployable
      web/            deployable
      mobile/         deployable
    packages/
      contracts/      shared types, consumed by all three
      ui/             shared components
    tools/
      scripts/
    package.json      root manifest declaring the workspace
    <lockfile>        one, for everything
    .github/workflows/ci.yml
```

Properties that follow directly from the layout:

- **One history.** `git log` covers the whole system; a bisect crosses project boundaries.
- **Atomic cross-project commits.** The change to `contracts` and the changes to its three consumers land together or not at all.
- **Source-level internal dependencies.** `apps/api` imports `packages/contracts` from disk. There is no publish step, so there is no version, so there is no skew.
- **One dependency graph.** A single lockfile means every project sees one version of every third-party library — the "one-version rule" — which prevents a class of bug and causes a different one (see [Inside a Monorepo](inside-a-monorepo.md)).

### The many-repository model

```
  contracts/          published at 1.4.2
  api/                depends on contracts ^1.4.0   → resolves 1.4.2
  web/                depends on contracts ^1.3.0   → resolves 1.4.2
  mobile/             depends on contracts 1.2.0    → pinned, two minors behind
```

The registry is the integration point, and the version range is the contract. That buys real things: each repository is independently clonable, independently permissioned, independently open-sourceable, and each consumer upgrades when it is ready.

It also buys **version skew** as a permanent resident. In the tree above, `mobile` is running against a contract the other two abandoned. Nothing is broken and nothing is wrong — that is simply the state of the system, and no single commit anywhere describes it. Finding out whether a given field is safe to remove means checking three repositories and their deploy histories.

### What actually changes

| | Monorepo | Polyrepo |
|---|---|---|
| Cross-project change | One commit, one review | N pull requests, a publish, a version bump each |
| Version skew | Impossible by construction | Permanent; managed, never eliminated |
| CI cost | Grows with the repo unless you filter | Naturally scoped to one project |
| Tooling required | Real, and it grows with you | Almost none |
| Checkout size | Everything, always (until you sparse-checkout) | Only what you need |
| Access control | Coarse; per-path is possible but awkward | Native — a repository is the permission unit |
| Open-sourcing one piece | Extraction work | It already is its own repository |
| Independent release cadence | Possible, needs discipline | The default |
| Code discovery | One `grep` finds every caller | You must know where to look |
| Refactor blast radius | Visible — CI tells you immediately | Hidden until a consumer upgrades |
| Review routing | Needs `CODEOWNERS` to be sane | Free — the repository *is* the route |
| Agent and LLM context | One root, caller and callee in one search | The agent sees one side of every boundary |

That last row is recent and underrated. A coding agent working in one repository can read the caller and the callee in the same operation, and one root instruction file governs the whole system. Across repositories it sees one side of every boundary and has to be told the rest.

### The hybrid almost everyone actually runs

The pure forms are rare. What real systems converge on is one repository per bounded context, with a monorepo inside each — the product's apps and their shared packages together, the infrastructure code separately, the open-source library separately because it is public.

When those islands need to share code, the bridges are: publish to a registry (cleanest, slowest), a Git [submodule](../../../tools/git/submodules.md) (pins a commit, coordinates nothing), `git subtree`, or plain vendoring. Each trades coupling against ceremony, and none is as cheap as being in the same repository.

The practical framing is not "which model" but **where to draw the first line**, given that the answer is almost never one repository for everything and almost never one repository per package.

---

## Examples

The same three-project system, both ways, making the same change: add a `nickname` field to the user contract.

```typescript
// packages/contracts/src/user.ts — the shared type
export interface User {
  id: string;
  displayName: string;
  nickname?: string; // ← the change
}
```

**Monorepo.** One commit touches the type and both consumers. CI builds all three projects against the new definition, and if the web client no longer type-checks you find out before merging.

```typescript
// apps/api/src/routes/user.ts
import type { User } from "@my-system/contracts";   // resolved from disk

// apps/web/src/profile.tsx
import type { User } from "@my-system/contracts";   // same source, same commit
```

**Polyrepo.** The same change is six steps: open a pull request on `contracts`; merge and release `1.5.0`; wait for the registry; open a pull request on `api` bumping the dependency; open a pull request on `web` bumping the dependency; merge both. Between step two and the last merge, the three repositories disagree about what a `User` is, and that window is normal rather than exceptional.

Neither sequence is wrong. The monorepo pays for that convenience with tooling and CI discipline; the polyrepo pays for its isolation with coordination. The rest of this section is about which bill is cheaper for you.

---

## When to use

- Projects that change together — a client and the API it is the only consumer of, or a set of packages released as one product.
- Shared code that is genuinely internal and has no life as a published artefact.
- **Solo developers and teams of two or three**, where coordination cost is pure overhead and there is nobody to coordinate with — see [Solo and Small-Team Repository Layout](solo-and-small-team-repositories.md) for the full argument.
- Systems where you want refactors to be provably complete, because CI compiles every caller.
- Codebases worked on heavily with LLM agents, where one root and one search surface are worth real money.

## When NOT to use

- **Adopting a monorepo to fix a discipline problem** — bad module boundaries follow you into one repository and get easier to violate, not harder; fix the boundaries first, then decide where they live.
- **Merging repositories that genuinely have different owners** — a repository is a weak ownership boundary, but it is the one your host enforces for free; giving it up means replacing it with `CODEOWNERS` and actually maintaining that file.
- **Putting an open-source library in a private monorepo** — every release then needs an extraction step, and the public history is either fabricated or lost; keep public code in a public repository from the start.
- **Splitting repositories to make CI faster** — you have moved the cost rather than removed it, and bought version skew with the proceeds; scope the pipeline instead ([Monorepo CI](monorepo-ci.md)).
- **Reaching for a monorepo build tool before you have a monorepo problem** — the tooling ladder has four rungs and most small systems belong on the second one forever ([Tooling Overview](tooling/overview.md)).

---

## References

- Potvin, Rachel, and Josh Levenberg. [Why Google Stores Billions of Lines of Code in a Single Repository](https://cacm.acm.org/magazines/2016/7/204032-why-google-stores-billions-of-lines-of-code-in-a-single-repository/fulltext). *Communications of the ACM*, 59(7), 2016 — the canonical account of the model at maximum scale.
- Brousse, Nicolas. [The Issue of Monorepo and Polyrepo in Large Enterprises](https://dl.acm.org/doi/10.1145/3361149.3361160). Programming'19, 2019.
- Klein, Matt. [Monorepos: Please don't!](https://medium.com/@mattklein123/monorepos-please-dont-e9a279be011b) 2019 — the strongest statement of the opposing case, and worth reading precisely because it argues the other way.
- [monorepo.tools](https://monorepo.tools/) — a maintained comparison of the tooling landscape.
