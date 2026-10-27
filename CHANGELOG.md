# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Stateful and stateless architectures: a subsection under architecture (overview, Actor Model with classic and virtual actors, stateful patterns such as sticky sessions, partitioned ownership, and durable execution), and Go, C#, and Node.js implementation articles.
- Multi-tenancy coverage: a PostgreSQL row-level security subsection under databases (overview, RLS, tenant context, pitfalls, isolation testing), a multi-tenant applications architecture article, and Go, C#, and Node.js implementation articles.
- Domain-Driven Design article and a design patterns overview.
- All 23 GoF design patterns (creational, structural, behavioral).
- Architecture section with 8 articles.
- Mobile architecture section (MVC, MVP, MVVM, MVI, VIPER, Clean, Modular) with a comparison and decision matrix.
- Go section, including installation, project setup, deploy, and IDE guides.
- Tools section with 22 articles across 7 categories.
- Dart and Flutter sections with 28 articles.
- Test-Driven Development article.
- Value Object article, linked from the DDD article.
- Databases section with 13 database type articles.
- React section: core hooks, refs, context, rendering, forms, error handling, advanced patterns, TypeScript, ecosystem, architecture, and toolchain.
- Swift section with 20 articles.
- SOLID subsection with an overview and one article per principle.
- Pragmatic Principles subsection: DRY, KISS, YAGNI, and Fail Fast.
- Git subsection with 9 concept articles and 7 how-to guides.
- Local TypeScript MCP server that exposes the knowledge base to AI agents.
- `measure-payload` script and baseline for MCP response sizes.
- License and contributing guide.
- MCP prompts: three pre-feature engineering prompts and a refactor briefing prompt.
- JavaScript, TypeScript, Node.js, and Next.js sections.
- C#, Java, Clojure, and Lua sections.
- Framework-agnostic frontend architecture section.
- Angular, Vue, and Svelte guides, plus per-language WebAssembly articles.
- C# game development subsection and expanded Blazor coverage.
- `claude/` tooling with the `atlas-review` skill.
- Go web development section for full-stack monoliths.
- CLI & Terminal sections for Go, Node.js, Dart, Swift, Clojure, Java, and C#.
- Operating systems section (macOS, Linux, Windows).
- IDEs & Editors section.
- Messaging section with AMQP, patterns, and brokers.
- Communication protocols section, including remote access and file transfer.
- DevOps section covering culture, practices, and tooling.
- Key-value database engines: Redis, Memcached, DynamoDB, and etcd.
- AI-assisted development section.
- Language-agnostic CLI and TUI architecture section.
- React Native section with 23 articles.
- Repository organization section with 10 articles.
- CSS section and a styling architecture subsection.
- AI engineering section with 15 articles.
- Node.js authentication subsection with 8 articles.
- ORM and data-access articles for Node.js, Next.js, and database concepts.
- `move-paths` script that moves articles and rewrites every link to them.
- Changelog concept article and maintenance how-to.
- `atlas-changelog` skill.
- Root `Justfile` as the single entry point for repository tasks.
- `atlas-write` skill for creating articles and subsections that follow the repository's templates, tags, and index conventions.

### Changed
- MCP responses use about 50% fewer tokens.
- `list_tags` hides unused tags by default.
- Articles now follow the full template structure, and examples no longer contain email addresses.
- CI/CD, code quality, containerization, IaC, local dev, observability, and orchestration articles moved from `tools/` to `devops/`.
- JavaScript, TypeScript, Node.js, and their frameworks moved under `languages/javascript-typescript/`.
- Flutter moved under `languages/dart/frameworks/flutter/`.

### Fixed
- MCP tool input schemas now use JSON Schema draft 2020-12, so clients that require it accept the tools.

[Unreleased]: https://github.com/rafaelporto/dev-atlas/commits/main
