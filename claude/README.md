# claude/ — Agent Tooling

This directory holds **agent tooling** for dev-atlas: Claude skills (and, later, agents and guides) that *consume* the knowledge base. It is the operational counterpart to `mcp-server/` — where the MCP server *exposes* the wiki to agents, the tooling here *applies* it.

> **This is tooling, not content.** Nothing here is a wiki article. It is deliberately **not** linked from any content `README.md` nor from the root `README.md`, exactly like `mcp-server/`.

## Layout

```
claude/
├── README.md                       # this file
└── skills/
    ├── atlas-review/
    │   └── SKILL.md                # the skill definition
    ├── atlas-changelog/
    │   └── SKILL.md
    └── atlas-write/
        └── SKILL.md
```

`agents/` and `guides/` are reserved for future use — they will be created only when there is real content to put in them (no empty placeholder directories).

## Skills

| Skill | Description |
|---|---|
| [`atlas-review`](skills/atlas-review/SKILL.md) | Full code review (smells, antipatterns, naming, conventions, SOLID, Pragmatic Principles, Design Patterns, correctness, security, performance, test coverage), grounded in dev-atlas where applicable. |
| [`atlas-changelog`](skills/atlas-changelog/SKILL.md) | Create, update, release and validate a `CHANGELOG.md` following Keep a Changelog + SemVer, as recommended by dev-atlas (`tools/git/changelog`). |
| [`atlas-write`](skills/atlas-write/SKILL.md) | Create a new article or subsection following the repository's templates, front matter, tag vocabulary and README indexes, then validate and propose the commit. |

## Installing a skill

Committed skills are **not** auto-discovered by Claude Code — it only loads skills from `~/.claude/skills/`. Install a skill from this directory by symlinking it, so you develop it here (versioned) while exposing it globally:

```bash
# Run from anywhere; resolves the dev-atlas repo root automatically.
DEV_ATLAS="$(git -C /path/to/dev-atlas rev-parse --show-toplevel)"
ln -s "$DEV_ATLAS/claude/skills/atlas-review" ~/.claude/skills/atlas-review
```

After the symlink exists, invoke the skill with `/atlas-review` in a Claude Code session.

## Requirements

`atlas-review` reads the knowledge base through the **dev-atlas MCP server** (`mcp-server/`). That server must be connected in the session where the skill runs; otherwise the skill reports the missing dependency and stops. See `mcp-server/README.md` for how to build and register it.

`atlas-changelog` is self-contained: its format rules are embedded in the SKILL.md, so it works without the MCP. When the MCP is connected, it checks those rules against `tools/git/changelog`. The embedded rules mirror `tools/git/changelog.md` — when changing either, update both in the same commit.

`atlas-write` runs only inside dev-atlas. It reads `CLAUDE.md` and `_templates/` at runtime as the source of truth, requires [`just`](https://just.systems) (`just new`, `just check`), and uses the dev-atlas MCP server only if it is connected. It delegates the CHANGELOG entry to `atlas-changelog` — the installed skill, or its `SKILL.md` in this repository when it is not installed.
