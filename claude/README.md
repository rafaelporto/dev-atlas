# claude/ — Agent Tooling

This directory holds **agent tooling** for dev-atlas: Claude skills (and, later, agents and guides) that *consume* the knowledge base. It is the operational counterpart to `mcp-server/` — where the MCP server *exposes* the wiki to agents, the tooling here *applies* it.

> **This is tooling, not content.** Nothing here is a wiki article. It is deliberately **not** linked from any content `README.md` nor from the root `README.md`, exactly like `mcp-server/`.

## Layout

```
claude/
├── README.md                       # this file
└── skills/
    └── atlas-review/
        └── SKILL.md                # the skill definition
```

`agents/` and `guides/` are reserved for future use — they will be created only when there is real content to put in them (no empty placeholder directories).

## Skills

| Skill | Description |
|---|---|
| [`atlas-review`](skills/atlas-review/SKILL.md) | Full code review (smells, antipatterns, naming, conventions, SOLID, Pragmatic Principles, Design Patterns, correctness, security, performance, test coverage), grounded in dev-atlas where applicable. |

## Installing a skill

Committed skills are **not** auto-discovered by Claude Code — it only loads skills from `~/.claude/skills/`. Install a skill from this directory by symlinking it, so you develop it here (versioned) while exposing it globally:

```bash
# Run from anywhere; resolves the dev-atlas repo root automatically.
DEV_ATLAS="$(git -C /path/to/dev-atlas rev-parse --show-toplevel)"
ln -s "$DEV_ATLAS/claude/skills/atlas-review" ~/.claude/skills/atlas-review
```

After the symlink exists, invoke the skill with `/atlas-review` in a Claude Code session.

## Requirements

The skills here read the knowledge base through the **dev-atlas MCP server** (`mcp-server/`). That server must be connected in the session where a skill runs; otherwise the skill reports the missing dependency and stops. See `mcp-server/README.md` for how to build and register it.
