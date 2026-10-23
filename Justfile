# Task runner for dev-atlas — run `just` to list every recipe.
# MCP recipes delegate to the npm scripts in mcp-server/package.json,
# which stay the single source of truth for what each task does.

set shell := ["bash", "-euo", "pipefail", "-c"]

# List all available recipes
default:
    @just --list

# --- mcp ----------------------------------------------------------------------

# Install MCP server dependencies (configures the husky pre-commit hook) and build
[group('mcp')]
[working-directory('mcp-server')]
setup:
    npm install
    npm run build

# Compile the MCP server to dist/
[group('mcp')]
[working-directory('mcp-server')]
build:
    npm run build

# Run the MCP server with hot reload
[group('mcp')]
[working-directory('mcp-server')]
dev:
    npm run dev

# Run the compiled MCP server (prints the real error when /mcp reports a failed boot)
[group('mcp')]
[working-directory('mcp-server')]
start:
    npm run start

# Open the MCP inspector against the server
[group('mcp')]
[working-directory('mcp-server')]
inspect:
    npm run inspect

# Run the MCP server test suite (unit + smoke)
[group('mcp')]
[working-directory('mcp-server')]
test:
    npm run test

# Run the MCP server tests in watch mode
[group('mcp')]
[working-directory('mcp-server')]
test-watch:
    npm run test:watch

# Strict link audit: fatal errors only (same as the pre-commit hook)
[group('mcp')]
[working-directory('mcp-server')]
audit:
    npm run audit-links -- --strict

# Full link audit: writes suggestions to mcp-server/audit-report.md
[group('mcp')]
[working-directory('mcp-server')]
audit-report:
    npm run audit-links

# Build, test and run the strict link audit
[group('mcp')]
[working-directory('mcp-server')]
validate:
    npm run validate

# Inject scaffold front matter into articles missing it (idempotent)
[group('mcp')]
[working-directory('mcp-server')]
backfill:
    npm run backfill

# Measure MCP tool payload sizes against the baseline
[group('mcp')]
[working-directory('mcp-server')]
measure:
    npm run measure

# Preview moving paths and rewriting references (dry-run), e.g. `just move a/b=c/d`
[group('mcp')]
[positional-arguments]
[working-directory('mcp-server')]
move +maps:
    args=(); for map in "$@"; do args+=(--map "$map"); done; npm run move-paths -- "${args[@]}"

# Move paths and rewrite references (requires a clean working tree)
[group('mcp')]
[positional-arguments]
[working-directory('mcp-server')]
move-apply +maps:
    args=(); for map in "$@"; do args+=(--map "$map"); done; npm run move-paths -- "${args[@]}" --apply

# --- content ------------------------------------------------------------------

# Create an article from a template (type: concept | how-to), e.g. `just new concept tools/git/rebase`
[group('content')]
[positional-arguments]
new type path:
    #!/usr/bin/env bash
    set -euo pipefail
    type="$1"
    path="${2%.md}.md"
    case "$type" in
      concept|how-to) ;;
      *) echo "error: type must be 'concept' or 'how-to', got '$type'" >&2; exit 1 ;;
    esac
    if [[ -e "$path" ]]; then
      echo "error: $path already exists" >&2; exit 1
    fi
    if [[ ! -d "$(dirname "$path")" ]]; then
      echo "error: $(dirname "$path")/ does not exist; create the subsection and its README.md first" >&2; exit 1
    fi
    cp "_templates/$type.md" "$path"
    echo "created $path from _templates/$type.md"
    echo "next: fill in the front matter and add the article to $(dirname "$path")/README.md"

# Print the tag vocabulary from _templates/tags.md, grouped by category
[group('content')]
tags:
    #!/usr/bin/env bash
    set -euo pipefail
    awk '
      /^## Categories/ { on = 1; next }
      on && /^## /     { exit }
      on && /^### /    { sub(/^### /, ""); printf "\n%s\n", $0; next }
      on && /^- `/     { match($0, /`[^`]+`/); printf "  %s\n", substr($0, RSTART + 1, RLENGTH - 2) }
    ' _templates/tags.md

# Fail if any tracked file contains an email address (mirrors the DLP commit hook)
[group('content')]
check-emails:
    #!/usr/bin/env bash
    set -euo pipefail
    # CLAUDE.md is excluded: it quotes address-shaped strings to document the rule itself.
    if git grep -nIE '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' -- . ':!CLAUDE.md'; then
      echo "error: email address found; use a placeholder such as \"<email>\" instead" >&2
      exit 1
    fi
    echo "no email addresses found"

# Run validate and check-emails (run before pushing)
[group('content')]
check: validate check-emails

# --- claude -------------------------------------------------------------------

# Symlink every skill in claude/skills/ into ~/.claude/skills/
[group('claude')]
skills-install:
    #!/usr/bin/env bash
    set -euo pipefail
    target="$HOME/.claude/skills"
    mkdir -p "$target"
    failed=0
    for dir in "{{ justfile_directory() }}"/claude/skills/*/; do
      source="${dir%/}"
      name="$(basename "$source")"
      destination="$target/$name"
      if [[ -L "$destination" && "$(readlink "$destination")" == "$source" ]]; then
        echo "skip   $name (already linked)"
      elif [[ -e "$destination" || -L "$destination" ]]; then
        echo "error  $name: $destination exists and is not a link to $source" >&2
        failed=1
      else
        ln -s "$source" "$destination"
        echo "linked $name -> $source"
      fi
    done
    exit "$failed"

# Register the dev-atlas MCP server with Claude Code (user scope)
[group('claude')]
mcp-register:
    #!/usr/bin/env bash
    set -euo pipefail
    if claude mcp get dev-atlas >/dev/null 2>&1; then
      echo "dev-atlas is already registered"
      exit 0
    fi
    server="{{ justfile_directory() }}/mcp-server/dist/index.js"
    if [[ ! -f "$server" ]]; then
      echo "error: $server not found; run 'just build' first" >&2
      exit 1
    fi
    claude mcp add --scope user dev-atlas node "$server"

# --- maintenance --------------------------------------------------------------

# Remove the MCP server build output and the audit report
[group('maintenance')]
clean:
    rm -rf mcp-server/dist mcp-server/audit-report.md

# Run clean and also remove mcp-server/node_modules
[group('maintenance')]
clean-all: clean
    rm -rf mcp-server/node_modules
