# Tag Vocabulary

Controlled vocabulary for the `tags` field in article front matter.

The dev-atlas MCP server loads this file at startup, extracts the official list of tags, and validates every article's front matter against it. Any unknown tag fails the server boot with a clear error (Fail Fast). This file is the single source of truth — keep it in sync with reality.

This file is **not** content of the wiki. Do not link to it from section `README.md` navigation tables.

---

## Rules

- All tags **kebab-case lowercase**, no accents.
- Every article must have **at least one Domain tag**. Additional tags as appropriate to make the article findable.
- **Design patterns** must carry **both** `design-pattern` (Domain) **and** one of `creational` / `structural` / `behavioral` (Pattern category) — these are orthogonal axes and both are needed for queries like "all design patterns" and "all behavioral patterns".
- `antipattern`: use **only** when the article's primary subject is an antipattern. Having a "When NOT to use" section in the standard template does not qualify.
- `best-practice`: use **only** for specific guidelines (e.g., "prefer composition over inheritance"). Do **not** apply to named patterns/principles/concepts — those already carry `design-pattern`, `principle`, or `concept`.
- `overview`: exclusive to section-summary articles (e.g., `pragmatic-principles/overview.md`, `solid/solid.md`).
- `dotnet`: use as a secondary tag for C# articles about the .NET ecosystem/runtime (NuGet, deployment, runtime); it complements — never replaces — the `csharp` language tag. Do not apply it to plain-language articles that are not .NET-specific.
- **Paradigm** tags: apply when the paradigm is a real subject of the article (typically `paradigms.md`, patterns, or concurrency/immutability articles), not to every article written in a language that happens to support that paradigm.
- **Operating system** articles (under `operating-systems/<os>/`) must carry `operating-system` (Domain) **and** exactly one OS tag (`macos` / `linux` / `windows`) — these are orthogonal axes, like `design-pattern` + a pattern category. Add topic tags as appropriate (`overview` for the section overview, `shell` for shell articles, `cli` for command references).
- `shell`: use for articles whose subject is a command-line shell or its behaviour (interactive shells, config files, expansion, redirection). It complements `cli`, which is about command-line *programs*; an article may carry both.
- `ide`: use for articles whose subject is a code editor or integrated development environment. Combine with `tool` (Domain) and the relevant language tag(s). Do not apply it to language or framework articles.
- `messaging`: use for articles about asynchronous messaging — protocols (AMQP, MQTT, STOMP), patterns (queues, pub/sub, delivery guarantees), and message brokers (Kafka, RabbitMQ, SQS, Service Bus, Pub/Sub, NATS). Combine with `concept` for protocol/pattern articles and with `tool` for a specific broker product.
- `networking`: use for articles about communication/network protocols — transport (TCP, UDP, QUIC), the HTTP family (HTTP, WebSocket, SSE, streaming), and API styles (REST, gRPC, GraphQL). Combine with `concept`. For asynchronous messaging protocols and brokers use `messaging` instead.

---

## Categories

### Domain — what kind of article is this?

- `concept`
- `principle`
- `design-pattern`
- `architecture`
- `database`
- `language`
- `tool`
- `operating-system`

### Pattern category — subcategory of design patterns (GoF)

- `creational`
- `structural`
- `behavioral`

### Architectural style

- `clean-architecture`
- `hexagonal`
- `onion`
- `mvc`
- `mvp`
- `mvvm`
- `mvi`
- `viper`
- `modular`
- `micro-frontends`

### Cross-cutting

- `antipattern`
- `best-practice`
- `decision-support`
- `comparison`
- `migration`
- `overview`

### Language

- `go`
- `swift`
- `dart`
- `flutter`
- `react`
- `angular`
- `vue`
- `svelte`
- `typescript`
- `javascript`
- `nodejs`
- `nextjs`
- `java`
- `kotlin`
- `csharp`
- `dotnet`
- `clojure`
- `lua`

### Operating system — which OS an article covers

- `macos`
- `linux`
- `windows`

### Paradigm — the programming model an article deals with

- `functional`
- `object-oriented`
- `imperative`
- `procedural`
- `declarative`
- `reactive`
- `prototype-based`
- `data-oriented`

### Topic

- `concurrency`
- `async`
- `error-handling`
- `testing`
- `state-management`
- `dependency-injection`
- `immutability`
- `null-safety`
- `observability`
- `containerization`
- `orchestration`
- `iac`
- `ci-cd`
- `messaging`
- `networking`
- `mobile`
- `frontend`
- `backend`
- `full-stack`
- `rendering`
- `component-driven`
- `webassembly`
- `cli`
- `tui`
- `shell`
- `ide`

---

## Adding a new tag

When introducing a tag that does not yet exist:

1. Open a PR that includes:
   - The tag name in the right category section of this file.
   - A short rationale in the PR description: when to apply this tag and when not to.
   - The articles that should carry the new tag, updated in the same PR.
2. Re-run the MCP server (`npm run validate` inside `mcp-server/`) to confirm the indexer accepts the new tag and the articles parse cleanly.

Avoid one-off tags. If a tag would apply to a single article, it is probably too narrow to be useful for search and discovery.
