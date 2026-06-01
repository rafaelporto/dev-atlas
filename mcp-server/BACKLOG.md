# Backlog — MCP server

Itens pendentes referentes ao trabalho de redução de tokens e às próximas iterações do servidor.

---

## Validação pendente

### Smoke test manual do `search_articles` (Fase 3)

A Fase 3 mudou o **default** do `search_articles` para um shape slim (`{id, title, summary, score}`). Testes unitários verificam conteúdo, mas não capturam como o agente **raciocina** sobre o shape novo. Vale rodar um smoke real em sessão do Claude Code.

**Pré-requisitos:**

1. Reabrir o Claude Code após `npm run build` — o cliente mantém o processo MCP pela sessão; só reinício carrega o binário novo.
2. Confirmar `/mcp` mostra `dev-atlas` como `connected`.

**Prompt sugerido:**

```
Use o servidor dev-atlas. Que padrões GoF eu uso quando preciso criar
famílias de objetos relacionados sem amarrar o cliente às classes concretas?
Compare 2-3 opções e me diga quando NÃO usar cada uma.
```

**Sinais a observar:**

| Sinal | Significa |
|---|---|
| Chama `search_articles` sem `verbose: true` | ✅ Default slim funciona |
| Cita `id`/`title`/`summary` corretamente | ✅ Slim cobre o suficiente |
| Chama `get_article(include: "when-not")` por candidato | ✅ Item 4 fluindo |
| Chama `get_article` sem `include` (body completo) | ⚠️ Descrição precisa de polish (revisar no item 7) |
| Pede `verbose: true` direto | ⚠️ Slim talvez restritivo demais |
| Não acha artigos que existem | ❌ Bug — investigar |

**Prompt alternativo (stress test):**

```
Use o dev-atlas. Liste todos os padrões de criação disponíveis no wiki
e classifique cada um pelo tipo de problema que resolve.
```

Esse força a decisão entre `verbose: true` (precisa de `section`) vs. `get_article(meta)` por hit.

---

## Itens adiados do plano de tokens

### Item 9 — `list_tags` esconder count 0 por default

Adiado até o backfill de tags nos artigos ser feito. Hoje 100% das tags do vocabulário aparecem como `count: 0` porque os artigos foram populados com `tags: []`. Aplicar o filtro agora retornaria lista vazia.

**Disparador para retomar:** quando uma fração relevante dos 195 artigos tiver pelo menos uma tag preenchida.

---

## Outras ideias surgidas durante o trabalho

### Truncar a descrição de `list_sections` em níveis 0–1 também

A Fase 4 (item 6) mantém `description` nos níveis 0 e 1 do tree. Se a economia ainda não bastar, considerar truncar essas descrições para ~120 chars no nível 1 (top-level fica intacto).

### Suprimir `$schema` do JSON Schema gerado por `zodToJsonSchema`

Investigar opções da lib na Fase 5 (item 7). Se não houver flag, considerar escrever os schemas à mão para as 6 tools — escopo pequeno, controle total, sem overhead.
