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
- `typescript`
- `java`
- `kotlin`

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
- `mobile`
- `frontend`
- `backend`

---

## Adding a new tag

When introducing a tag that does not yet exist:

1. Open a PR that includes:
   - The tag name in the right category section of this file.
   - A short rationale in the PR description: when to apply this tag and when not to.
   - The articles that should carry the new tag, updated in the same PR.
2. Re-run the MCP server (`npm run validate` inside `mcp-server/`) to confirm the indexer accepts the new tag and the articles parse cleanly.

Avoid one-off tags. If a tag would apply to a single article, it is probably too narrow to be useful for search and discovery.
