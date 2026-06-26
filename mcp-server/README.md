# dev-atlas MCP server

Local MCP (Model Context Protocol) server that exposes the dev-atlas Markdown knowledge base to AI agents — Claude Code and any other MCP client.

The server runs locally over stdio. No cloud, no network listener. It reads the wiki from the surrounding repository at startup, builds an in-memory index, and serves resources, tools, and prompts.

## Why this exists

When agents make technical decisions, they tend to invent patterns/anti-patterns or fabricate trade-offs. The dev-atlas wiki contains curated knowledge on those topics. This server gives agents a reliable channel into that knowledge, with special support for surfacing "when NOT to use" guidance.

## Setup

```bash
npm install
npm run build
```

`npm install` triggers husky's `prepare`, which configures the pre-commit hook that runs the link auditor in strict mode (see [Link audit](#link-audit) below).

## Register the server with Claude Code

Either via the CLI (recommended — less chance of typos):

```bash
claude mcp add dev-atlas node "$(pwd)/dist/index.js"
```

…or by editing `~/.claude/settings.json` directly (user-level so it's available in every session and project):

```json
{
  "mcpServers": {
    "dev-atlas": {
      "command": "node",
      "args": ["<absolute-path-to-dev-atlas>/mcp-server/dist/index.js"]
    }
  }
}
```

Restart Claude Code. Run `/mcp` to confirm `dev-atlas` is listed as `connected`.

**After editing the server's code**, `npm run build` then reopen Claude Code — MCP processes are tied to the session lifecycle.

**Optional**, append to your `~/.claude/CLAUDE.md`:

> For technical decisions involving design patterns, principles, or architecture, consult the dev-atlas MCP server first.

## Diagnostics

If `/mcp` reports the server failed to start, the MCP client only knows "boot failed". Get the real error by running the server directly:

```bash
cd mcp-server
npm run start
```

Standard error prints exactly which file/tag/related path tripped the Fail Fast validator. Or run the full validate pipeline first:

```bash
npm run validate    # build + tests + audit-links --strict
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Hot-reload run with `tsx`. |
| `npm run build` | Compile to `dist/`. |
| `npm run start` | Run the compiled server. |
| `npm run inspect` | Open `@modelcontextprotocol/inspector` (requires Node ≥ 22.7.5). |
| `npm run test` | Unit + smoke tests. |
| `npm run audit-links` | Full link audit; writes suggestions to `audit-report.md`. |
| `npm run audit-links -- --strict` | Strict mode — fatal errors only, no report file. Used by the pre-commit hook. |
| `npm run backfill` | Idempotently injects scaffold front matter into articles missing it. |
| `npm run validate` | Aggregate: build, tests, strict audit. |

## What the server exposes

### Resources

Every article is browseable as a resource. The URI scheme:

- **Article**: `atlas://article/<repo-path-without-.md>`
- **Section index** (README): `atlas://section/<repo-directory-path>`

Reading an article resource returns the Markdown body only (no YAML front matter — structured metadata comes via `get_article`).

### Tools

- `search_articles` — full-text + filters (tags AND, type, section prefix-match, language unifies field + tag).
- `get_article` — single article with expanded `related` (titles + summaries) and full body.
- `find_related` — explicit `related[]` first (bidirectional), then tag-overlap with threshold ≥ 2 shared tags.
- `find_antipatterns` — tier 1: articles tagged `antipattern`. Fallback: "When NOT to use" sections of relevant articles. Each hit includes a ~200-char snippet.
- `list_sections` — navigation tree with `articleCount` (direct) and `totalArticles` (recursive) per node.
- `list_tags` — the controlled vocabulary from `_templates/tags.md` with usage counts.

### Prompts

> **After adding or changing any prompt, run `npm run build` and restart the MCP server** (via `/mcp` → Restart in Claude Code). `dist/` is gitignored, so the compiled output is not shared — each machine must build locally.

- `pick-pattern-for` — recommends applicable patterns + antipattern callouts for a stated problem.
- `find-antipattern-risks` — audits a code snippet or description, citing dev-atlas articles.
- `principles-pre-flight` — pre-feature checklist grounded in SOLID + Pragmatic Principles + DDD; cites language-specific articles when applicable.
- `compose-design-patterns` — composes a feature design from 1–3 GoF patterns, justifying the combination and flagging one antipattern risk.
- `pre-implementation-briefing` — full greenfield briefing (principles + DDD + patterns + antipatterns + TDD) followed by failing tests; stops and asks before writing production code.
- `refactor-briefing` — plans a behavior-preserving refactor: identifies current antipatterns, picks target principles + patterns, emits a small-step plan; characterization tests are mandatory before structural changes.

## Architecture

Feature-sliced layout, applying the wiki's own principles (SRP per feature, Repository pattern, Strategy latent for ranking, KISS / YAGNI / Fail Fast).

```
src/
├── index.ts            # bootstrap + stdio
├── articles/           # types, parser (gray-matter + regex), repository
├── search/             # indexer, search-service, related-service, antipattern-service
├── mcp/                # server, resources, tools, prompts
└── lib/                # tags vocabulary, config (paths)

scripts/                # one-off utilities reusing the parser
├── audit-links.ts
└── backfill-frontmatter.ts
```

Index lives entirely in memory. ~100ms cold-start for the current corpus. No persistence to disk; restart the server when content changes.

## Front matter

Every article must carry YAML front matter:

```yaml
---
type: concept | how-to
tags: [string, …]        # validated against _templates/tags.md
related: [string, …]     # full repo path of each related article, no .md
language: string | null  # "go", "swift", … or null if agnostic
---
```

`title` and `summary` are derived from the body's first `# Title` and `> blockquote` — kept out of the front matter to avoid drift. The parser fails fast if either is missing.

## Link audit

`scripts/audit-links.ts` cross-checks inline Markdown links with `related[]`:

- **Fatal** (bloqueia commit via husky em modo `--strict`):
  - `related[]` aponta para um arquivo inexistente
  - link inline `[...](...md)` aponta para um arquivo inexistente
- **Sugestão** (no modo full apenas, em `audit-report.md`):
  - link inline para outro artigo não listado em `related[]`
  - entrada em `related[]` sem menção inline correspondente

`audit-report.md` é checklist Markdown — abra no editor, resolva no seu tempo, descarte o que não fizer sentido. Sem auto-correção — curadoria é humana.

## Smoke tests after setup

With the server registered, open Claude Code and confirm both work:

1. **Decision support** — "Use o servidor dev-atlas. Que padrão GoF eu uso para criar objetos sem expor a classe concreta? E quando NÃO usar?"
   - Expected: agent calls `search_articles` or the `pick-pattern-for` prompt; cites Factory Method (or Abstract Factory); includes the "When NOT to use" section.
2. **Antipattern audit** — "O design da nossa API tem um Service que faz tudo. Que antipatterns isso pode estar incorrendo?"
   - Expected: agent calls `find_antipatterns({topic: "god object"})` (or similar); cites relevant articles; quotes "When NOT to use" via the fallback when applicable.

## Limitations

- No paginação: `list_resources` retorna todos os ~215 resources (artigos + section-indexes) de uma vez. Suficiente para a escala atual.
- Sem stemming, sem stop-words, sem IDF — ranking é substring ponderado por campo (title ×4, tags ×3, summary ×2, headings ×2, body ×1, code blocks ×0). Trocar a estratégia não toca consumidores.
- Sem watch: edite conteúdo → `npm run build` → reabra Claude Code.
- `package-lock.json` é gitignored para não vazar o registry npm em repo público. Instalações futuras podem resolver transitives diferentes — aceitável neste contexto pessoal.
