# Backlog — MCP server

Itens pendentes referentes ao trabalho de redução de tokens e às próximas iterações do servidor.

---

## Outras ideias surgidas durante o trabalho

### Truncar a descrição de `list_sections` em níveis 0–1 também

A Fase 4 (item 6) mantém `description` nos níveis 0 e 1 do tree. Se a economia ainda não bastar, considerar truncar essas descrições para ~120 chars no nível 1 (top-level fica intacto).

---

## Concluído

- **Suprimir `$schema` do JSON Schema gerado por `zodToJsonSchema`** — implementado em `c3c8f86` (função `toInputSchema` em `src/mcp/tools.ts` remove o campo após a conversão).
- **Smoke test manual do `search_articles` (Fase 3)** — validado em sessão real do Claude Code com o prompt sugerido sobre famílias GoF.
  - ✅ Default slim funciona: 3 chamadas a `search_articles`, todas sem `verbose: true`; agente citou `id`/`title`/`summary` corretamente.
  - ✅ `get_article(include: "when-not")` usado nos candidatos comparativos (Factory Method, Builder).
  - ⚠️ Body completo foi puxado **uma vez** no candidato primário (Abstract Factory), por necessidade real — tabela comparativa e "Why does it matter?" não estão em `when-not`. Padrão observado foi "body no primário, when-not nos comparativos", que é uso saudável, não exagero. Antes de polir a descrição do `get_article`, confirmar se o sintoma-alvo é "body em *todos* os candidatos" — esta sessão não reproduziu o problema.
- **Backfill de tags nos 195 artigos** — 100% dos artigos passaram de `tags: []` para listas populadas.
  - **Phase A (mecânica, path-derived):** Domain (`concept`, `principle`, `design-pattern`, `architecture`, `database`, `language`, `tool`) + Pattern category (`creational`/`structural`/`behavioral`) + Architectural style (`mvc`/`mvp`/`mvvm`/`mvi`/`viper`/`modular`/`clean-architecture`/`hexagonal`/`onion`) + Language (`go`/`swift`/`dart`/`flutter`/`react`/`typescript`) + Topic correspondente a `tools/<cat>` (`ci-cd`, `containerization`, `iac`, `observability`, `orchestration`). Field `language:` preenchido onde estava `null` em dirs de linguagem.
  - **Phase B (filename + path overrides):** Topic (`async`, `concurrency`, `error-handling`, `testing`, `state-management`, `dependency-injection`, `null-safety`, `immutability`, `frontend`, `backend`) e Cross-cutting (`overview`, `comparison`, `decision-support`, `best-practice`).
  - **Cobertura final:** 45/49 tags do vocabulário com ≥1 artigo. Validação completa: `npm run validate` (40 testes + audit-links strict) passa.
  - **Tags que sobraram em zero:** `antipattern`, `migration`, `java`, `kotlin` — todas dependem de conteúdo novo, não de retro-tagging.
- **Item 9 — `list_tags` esconder `count: 0` por default** — `ListTagsInput` ganhou `include_unused: z.boolean().optional().default(false)` e o handler filtra tags com `count: 0` quando esse flag é `false`. Descrição da tool atualizada para refletir o novo default. Resposta padrão agora tem 45 entradas (antes: 49); `include_unused: true` mantém a vocabulary completa para introspecção. `TOOLS` exportado de `src/mcp/tools.ts` para permitir smoke test direto do handler (3 testes novos em `test/smoke.test.ts`: default sem zero, include_unused retorna full, category filter combina com o filtro de count).
