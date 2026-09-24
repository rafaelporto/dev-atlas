---
type: concept
tags:
  - architecture
  - concept
  - repository-organization
  - mobile
  - backend
  - decision-support
related:
  - software-engineering/architecture/repository-organization/inside-a-monorepo
  - software-engineering/architecture/repository-organization/monorepo-ci
  - software-engineering/architecture/mobile/modular-architecture
  - software-engineering/architecture/frontend/data-fetching-and-bff
  - languages/react-native/project-setup
  - languages/swift/swift-package-manager
language: null
---
# Mobile and Backend in One Repository

> Whether the mobile app belongs next to the API it calls — the shared contract as the real prize, the toolchain and CI bill nobody quotes up front, and the one thing a single repository does not fix.

---

## What is it?

The question is narrow and common: you are building a product with a mobile client and a backend that exists mostly to serve it. Do they go in one repository or two?

It gets its own article because the generic [monorepo advice](monorepo-vs-polyrepo.md) answers it badly. That advice implicitly assumes the projects in the repository are *similar* — same language family, same build tool, same kind of artefact, same deploy target. A mobile client and a server differ on every one of those axes simultaneously, and the differences do not cancel out.

---

## Why does it matter?

Because the two sides are coupled in exactly one place and independent everywhere else, and the repository decision either exploits that or fights it.

The coupling is the API contract. Every field the server adds, renames, or removes is a change the client must match, and getting it wrong produces a runtime failure on a user's phone rather than a compile error on your machine. That is the strongest argument for one repository that exists in this section.

The independence is everything else: different languages, different build systems, different CI runners, different artefact types, different distribution channels, and — the one that bites hardest — different release cadences that you do not control.

---

## How it works

### The prize: one contract, one commit

Here is the entire case, in one scenario. The server adds a `nickname` field to the user response and the client should display it.

**Two repositories.** Change the server, deploy it. Change the client, discover you spelled the field `nickName`, ship it, wait for App Store review, wait for users to update, then find out from a crash report.

**One repository.** One commit touches the response schema, the handler, and the client model. CI fails immediately if the client no longer compiles against the contract. The mistake is caught in the seconds after you make it, by a machine, for free.

There is a precision point that decides how big this win actually is. **Source-level sharing only works when both sides speak the same language.** A React Native or Expo client and a TypeScript backend can literally import the same `interface`. A Swift or Kotlin client and a Go backend cannot — for them, the monorepo buys *co-located code generation*: an OpenAPI or Protobuf schema in `packages/contracts/`, generated into each language, with the generated output checked in and a CI step that fails if regeneration produces a diff.

That is still valuable — the schema and every consumer move in one commit, and drift becomes a build failure — but it is a smaller win than shared source, and it requires you to actually run and maintain the generator. Be honest about which of the two you are buying.

### The bill

| Friction | Why it hurts | Mitigation |
|---|---|---|
| **Different toolchains** | Xcode, Gradle, a JDK, SwiftPM or CocoaPods on one side; Node or Go on the other. There is no single `make setup` that converges — new-machine bootstrap is two unrelated procedures under one root. | Document both explicitly; do not pretend one command exists. Keep them in separate scripts named for what they set up. |
| **CI matrix cost** | The mobile job needs a macOS runner — roughly an order of magnitude more per minute than Linux on hosted runners — and takes 15–40 minutes. If every backend push triggers it, you burn the budget on nothing. | **This is the one place a solo developer needs path filters on day one.** See [Monorepo CI](monorepo-ci.md). |
| **Binary assets** | `.xcassets`, splash screens, fonts, design exports. They inflate the clone for backend work forever, and Git stores every revision of every one. | Git LFS, or keep heavyweight design sources out of the repository entirely and commit only exported runtime assets. |
| **Release cadence mismatch** | The backend deploys several times a day. The app ships when App Store review permits, then rolls out in stages, then waits for users who never update. | Accept it. Do not try to synchronise them — see the next section. |
| **The versioning trap** | What does a repository tag mean when it holds an app at `3.4.1` and a service deployed by commit SHA? | Version independently, or do not version the backend at all. Namespace tags (`app@3.4.1`). |
| **Tooling does not span the divide** | Turborepo and Nx do not understand Xcode or Gradle. Bazel does, at real cost. Melos covers Flutter packages only. | Expect two toolchains under one root, glued by CI path filters rather than by a unified build graph. That is the realistic shape. |

That last row deserves emphasis because it is where expectations break. People adopt a mobile-plus-backend monorepo imagining one build graph spanning both. Unless you are running [Bazel](tooling/bazel.md) — and you very likely should not be — you are not getting one. You are getting two independent build systems that share a checkout, a commit history, and a contract directory. That is still worth having. It is just not what the word "monorepo" suggests.

### What the monorepo does NOT fix

> **Backward compatibility.** Old versions of your app live on phones for months. Some users never update. The server must therefore remain compatible with contracts it shipped a year ago, and no repository layout changes that.

This is the most important paragraph in the article, because the failure mode is silent and expensive. An atomic commit makes the *repository* consistent. It does nothing for the *fleet*.

Concretely: deleting a field from the response and updating the client in the same commit produces a green CI run and a crash for every user on the previous build. The compiler checked the client in your repository, not the one on someone's phone.

So the discipline you would need in two repositories — additive changes, deprecation windows, version negotiation, feature flags for anything the old client cannot handle — is exactly the discipline you need in one. Anyone adopting this layout expecting to stop versioning their API will break production. The monorepo removes the *coordination* cost of contract changes; it does not remove the *compatibility* obligation.

### A layout that works

```
  my-product/
    apps/
      api/                backend — deploys on merge, many times a day
      mobile/             the app — ships on App Store / Play cadence
        ios/
        android/
    packages/
      contracts/          OpenAPI or Protobuf schema + generated clients
    .github/workflows/
      api.yml             paths: apps/api/**, packages/contracts/**
      mobile.yml          paths: apps/mobile/**, packages/contracts/**   ← macOS runner
      contracts.yml       paths: packages/contracts/**  (regenerate, fail on diff)
```

The load-bearing detail is in the filters: a change under `packages/contracts/**` triggers **both** application jobs. That is the whole point — the contract is the coupling, so the contract is what fans out. Get this wrong and you have all the costs of one repository and none of the safety.

Inside the app itself, module structure is a separate question at a lower altitude — see [Modular Architecture (Mobile)](../mobile/modular-architecture.md).

### The decision

- **Yes** — one product, one author or a handful, an API that is private to the app. This is the common personal-project shape, and the monorepo is the right call.
- **Yes, strongly** — the client is React Native, Expo, or Flutter, where the shared contract can be real source rather than generated output. The win roughly doubles.
- **Lean no** — the backend serves many clients (a web app, partners, a public API), the mobile side carries a large native asset tree, a separate team or contractor owns the app, or the backend must be open-sourced.
- **The middle path, when unsure** — leave the app in its own repository and put only the *contract* in a published package. You get the typed, versioned interface and the single source of schema truth; you skip the toolchain and CI bill entirely. This is underrated and is the right answer more often than people expect.

---

## Examples

Shared source, the React Native case — the strongest version of the win:

```typescript
// packages/contracts/src/user.ts — one definition, two consumers
export interface User {
  id: string;
  displayName: string;
  nickname?: string;       // optional: old clients ignore it, old servers omit it
}
```

```typescript
// apps/api/src/routes/user.ts
import type { User } from "@my-product/contracts";

export async function getUser(id: string): Promise<User> {
  const row = await db.users.findById(id);
  return { id: row.id, displayName: row.display_name, nickname: row.nickname ?? undefined };
}
```

```typescript
// apps/mobile/src/screens/Profile.tsx — same type, same commit, checked by CI
import type { User } from "@my-product/contracts";

export function Profile({ user }: { user: User }) {
  return <Text>{user.nickname ?? user.displayName}</Text>;
}
```

Note the optional field. That is the backward-compatibility discipline the monorepo does not give you, applied by hand.

The CI filter that keeps the macOS runner asleep:

```yaml
# .github/workflows/mobile.yml
name: mobile
on:
  push:
    paths:
      - "apps/mobile/**"
      - "packages/contracts/**"     # the contract fans out to both apps
      - ".github/workflows/mobile.yml"

jobs:
  build:
    runs-on: macos-14               # ~10x the per-minute cost of ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: xcodebuild -workspace ios/App.xcworkspace -scheme App build
```

And the generated-client case, for a native client against a non-TypeScript backend:

```bash
# packages/contracts/generate.sh — output is committed; CI fails on a diff
openapi-generator-cli generate -i openapi.yaml -g swift5  -o generated/swift
openapi-generator-cli generate -i openapi.yaml -g kotlin  -o generated/kotlin
```

---

## When to use

- One product with a mobile client and a backend that exists primarily to serve it, owned by the same one to three people.
- React Native, Expo, or Flutter clients against a backend in the same language, where the contract can be shared source.
- Any pairing where contract drift has already bitten you and you want a compiler to catch it.
- Early-stage products where the API shape is still changing weekly and the coordination cost of two repositories is the dominant tax.

## When NOT to use

- **A backend with several independent clients** — the mobile app is then one consumer among many, and co-locating one of them privileges it arbitrarily; publish a versioned contract instead.
- **Expecting the monorepo to end API versioning** — old app builds live on phones for months, so compatibility obligations survive the merge; an atomic commit fixes the repository, not the fleet.
- **A separate team or contractor owning the app** — you would be trading a free ownership boundary for a `CODEOWNERS` file and coarse access control, on the one axis where the boundary was real.
- **Running the mobile job on every backend commit** — without path filters, a macOS runner fires on changes it cannot possibly be affected by, and the CI bill is the first thing that makes people abandon the layout.
- **Committing design sources to share them** — Sketch and Figma exports inflate every clone forever; commit exported runtime assets and keep the sources in the design tool.
- **A backend you intend to open-source** — extraction later means rewriting history, and the app's commits are entangled with it.

---

## References

- Apple. [App Review](https://developer.apple.com/app-store/review/) — review timelines and the staged-release mechanics that set the app-side cadence.
- GitHub. [About billing for GitHub Actions](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions) — the per-minute multipliers for macOS versus Linux hosted runners.
- [OpenAPI Generator](https://openapi-generator.tech/) — the generated-contract path for native clients.
- [Protocol Buffers — Overview](https://protobuf.dev/overview/) — the alternative schema-first approach, with stronger compatibility rules built in.
- [GitHub Actions — Workflow syntax: `on.push.paths`](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#onpushpull_requestpaths) — the path filter this layout depends on.
