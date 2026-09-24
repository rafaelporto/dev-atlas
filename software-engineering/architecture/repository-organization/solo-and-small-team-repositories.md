---
type: concept
tags:
  - architecture
  - concept
  - repository-organization
  - decision-support
related:
  - software-engineering/architecture/repository-organization/monorepo-vs-polyrepo
  - software-engineering/architecture/repository-organization/inside-a-monorepo
  - software-engineering/architecture/repository-organization/tooling/overview
  - software-engineering/ai-assisted-development/agent-instruction-files
  - software-engineering/concepts/pragmatic-principles/yagni
language: null
---
# Solo and Small-Team Repository Layout

> The same decision at one to three people, where every variable the literature optimises for is zero — and the thesis that falls out of that: almost every monorepo benefit is scale-independent, and almost every monorepo cost is not.

---

## What is it?

This is [monorepo vs polyrepo](monorepo-vs-polyrepo.md) evaluated at N = 1 to 3, where the factors that dominate the published material — review routing, code ownership, build-farm economics, organisational boundaries, onboarding hundreds of engineers — are all zero.

That is not a footnote to the general advice. Zeroing those variables changes the answer, because most of them appear on the *cost* side of the monorepo ledger.

---

## Why does it matter?

Nearly everything written about monorepos is written at Google, Meta, Uber, or Airbnb scale, by people solving problems that begin at a thousand engineers. Read at three people, that material is not merely unhelpful — it is actively misleading, because it presents a tooling investment as the price of entry.

The thesis this article defends:

> **Almost every benefit of a monorepo is scale-independent. Almost every cost of a monorepo is scale-dependent.**

If that holds, the conclusion is uncomfortable for the conventional wisdom: the monorepo is *more* clearly correct for a solo developer than it is for a large organisation, and the reason small projects avoid it is that they have read advice written for someone else.

The rest of this article tests the thesis honestly, including the places where it fails.

---

## How it works

### What survives at N=1

Every one of these is worth exactly as much to one person as to a thousand:

- **Atomic cross-project commits.** Worth *more* solo, not less. In a large organisation, cross-team coordination has dedicated machinery — release trains, integration environments, people whose job it is. Alone, you *are* the coordination mechanism, and every multi-repository change occupies your working memory until the last pull request lands. One commit that either works or does not is the single largest quality-of-life difference in this article.
- **Shared types with no publish step.** You change the contract and both consumers type-check against it immediately. The polyrepo alternative — version, publish, wait, bump twice — is the same number of steps at any headcount, and at one person there is nobody to hand the intermediate steps to.
- **One clone, one editor window, one search.** "Where is this used?" is one operation instead of a loop over repositories.
- **One CI configuration, one secret store, one dependency-update surface.** Three repositories means three copies of the same workflow file that drift, three sets of secrets to rotate, three Dependabot streams.
- **Agent and LLM context.** One root [instruction file](../../ai-assisted-development/agent-instruction-files.md) governs the whole system, and an agent can read the caller and the callee in one search. Across repositories it sees one side of every boundary and must be told the rest, if you remember to tell it. This argument barely exists in the older literature because the older literature predates the tool, and for anyone working heavily with coding agents it is now one of the strongest entries on the list.
- **One place to look in six months.** The dominant failure mode of personal projects is not architectural — it is that you forget where things are.

### What disappears at N=1

The classic monorepo costs, and why they evaporate:

- **CI minutes.** The famous problem is "a one-line change rebuilds the world". If the world is three projects and a full build takes ninety seconds, there is no problem to solve. Affected-graph detection is an optimisation with a negative return until the build is slow enough to notice.
- **Remote caching.** A remote cache shares work between machines. With one machine there is nothing to share. The one real exception is laptop ↔ CI, which is a genuine but modest win and not a reason to adopt a tool.
- **`CODEOWNERS`, review routing, merge queues.** These route work between people. There are no people.
- **Checkout size.** Your repository is megabytes. Sparse-checkout solves a problem you will not have.
- **Bazel's amortisation.** Bazel's cost is paid up front and recovered over thousands of builds across hundreds of engineers. The recovery never arrives at this scale ([Bazel](tooling/bazel.md) says so at more length).

### What is genuinely harder at small scale

The asymmetry is not total, and an article that claimed it was would not be worth trusting. Three real costs that do *not* shrink:

**You own every tool you add, and there is no platform team.** In a large organisation, the monorepo tooling is somebody's full-time job. Alone, a breaking major release of your task runner is your Saturday. This is the strongest argument for staying on the lowest rung of the [tooling ladder](tooling/overview.md) that works — every tool you add is a maintenance subscription you pay personally, forever.

**Nothing enforces boundaries.** This is the one that actually bites. With one author and no code review, `apps/web` importing `apps/api/src/internal/db.ts` takes twenty seconds and lives forever. In a polyrepo that import was *impossible* — you would have had to publish the internal module to reach it. The publish step was an accidental architecture test, and moving to a monorepo deletes it.

The mitigation is cheap if you do it on day one and expensive if you do it in year two: one lint rule restricting cross-project imports to package entry points. An afternoon now, a month later.

**Extracting something later is real work.** Open-sourcing one component, or handing it to a client, means rewriting history to preserve its commits — see [Merging Repositories into a Monorepo](merging-repositories-into-a-monorepo.md), whose final section runs the operation in reverse. Not a reason to avoid the monorepo, but a reason to keep genuinely public code out of it from the start.

### The default

A ladder, not a matrix. Climb only when the rung you are on hurts.

```
  Rung 0   one project                       git init. Stop here.
                                             Do not build a workspace for one package.

  Rung 1   2–5 projects sharing code         one repo, package-manager workspace,
           ── the default for most           one CI job that builds everything.
              personal systems               No task runner. No cache. No filters.

  Rung 2   full CI over ~10 min, or          + cached task runner (Turborepo),
           local full test over ~30 s,          + path filters in CI
           or more than ~5 packages

  Rung 3   polyglot, or hermetic builds      + Bazel — and only if you can name
           genuinely required                   the specific problem it solves
  ─────────────────────────────────────────────────────────────────────────────
  exit     a component with its own          give that one component its own
           cadence, its own audience,        repository. Keep everything else
           or no shared code at all          together.
```

The numbers on rung 2 are a **heuristic, not a finding** — a starting point to calibrate against your own patience, not a threshold anyone measured. The signal they stand in for is real, though: you climb when waiting on the build has started changing how you work.

Most personal systems belong on rung 1 permanently. That is the actual recommendation of this article, and it is [YAGNI](../../concepts/pragmatic-principles/yagni.md) applied to repository tooling.

### When many repositories is still right at small scale

Reach for a separate repository when the *audience* differs, not when the code differs:

- A published open-source library — it needs its own history, issues, and releases.
- A throwaway experiment you may delete, and do not want in the main history.
- Client work with different ownership, or a different licence.
- A component whose CI secrets must not sit beside the others.

Notice that none of these are technical properties of the code. They are all about who else touches it.

### A concrete default layout

```
  my-system/
    apps/
      api/
      web/
    packages/
      contracts/          shared types — the reason the repo exists
    .github/workflows/
      ci.yml              one job, builds and tests everything
    package.json          workspace root
    <lockfile>
    CLAUDE.md             one instruction file for the whole system
    README.md
```

No `tools/`, no `scripts/`, no `docs/` until something needs them. Add directories when they have contents, not in anticipation.

---

## Examples

The entire tooling investment for rung 1, in two files.

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```yaml
# .github/workflows/ci.yml — deliberately unsophisticated.
# No path filters, no affected graph, no cache beyond dependencies.
# At three projects, building everything is faster than deciding what to build.
name: ci
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r build
      - run: pnpm -r test
```

The point of this example is that it is dumb, and that dumb is correct here. `pnpm -r` runs the script in every package. There is no graph, no cache, and nothing to maintain. When this job crosses ten minutes, rung 2 is waiting.

And the one non-obvious investment worth making on day one — the boundary the monorepo removed:

```typescript
// packages/contracts/src/user.ts — shared, importable
export interface User { id: string; displayName: string }

// apps/web/src/profile.tsx
import type { User } from "@my-system/contracts";      // ✓ package entry point
import { pool } from "../../api/src/internal/db";      // ✗ caught by lint, not by review
```

There is no reviewer to catch the second line. The lint rule is the reviewer.

---

## When to use

- One to three people building a system of two or more projects that share code.
- Any personal project where the shared piece is a contract between a client and a server you both own.
- Codebases worked on heavily with LLM coding agents, where one root and one search surface measurably improve results.
- Systems where you expect to be away from the code for weeks at a time and want one place to come back to.

## When NOT to use

- **Building a workspace for a single project** — one package needs no workspace layer; `git init` and stop.
- **Adopting Nx, Turborepo, or Bazel before the build is slow** — each is a maintenance subscription billed to you personally, and at rung 1 there is no return on it.
- **Putting a public library in a private monorepo** — the audience differs, so the repository should too; extraction later costs real work.
- **Skipping the import-boundary lint rule because you are the only author** — being the only author is exactly why nothing else will catch it, and the cost of retrofitting rises every week.
- **Splitting into repositories to feel organised** — directories organise code; repositories organise *people*, and there are none to organise.
- **Copying a large organisation's monorepo setup** — their tooling exists to solve coordination problems you do not have, and you will inherit the maintenance without the benefit.

---

## References

- Hunt, Andrew, and David Thomas. *The Pragmatic Programmer*. Addison-Wesley, 1999 — the source of the YAGNI discipline this article applies to tooling choices.
- [monorepo.tools — Why a monorepo?](https://monorepo.tools/#why-a-monorepo) — a concise statement of the benefits, worth reading against this article's claim that most of them are scale-independent.
- [Turborepo — Caching](https://turborepo.com/docs/crafting-your-repository/caching) — useful specifically for judging when caching starts to pay, which is the rung-2 signal.
- Klein, Matt. [Monorepos: Please don't!](https://medium.com/@mattklein123/monorepos-please-dont-e9a279be011b) 2019 — the opposing case; note that nearly every objection in it is about organisational scale.
