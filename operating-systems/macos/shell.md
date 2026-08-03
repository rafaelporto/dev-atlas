---
type: concept
tags:
  - operating-system
  - macos
  - shell
related:
  - operating-systems/macos/overview
  - operating-systems/macos/commands
  - operating-systems/linux/shell
  - languages/go/cli/terminal-and-shell
language: null
---

# The macOS Shell (zsh)

> Since Catalina, macOS ships with **zsh** as the default login shell — a POSIX-compatible shell with rich completion, globbing, and prompt features layered on top of the familiar Bourne-shell model.

---

## What is it?

A **shell** is the program that reads the commands you type in a terminal and runs them. On modern macOS the default is **zsh** (the Z shell). Older Macs (Mojave and earlier) defaulted to **bash**, and bash is still present — but frozen at version 3.2, because later bash releases use the GPLv3 license that Apple does not ship.

zsh is a superset of the classic Bourne/POSIX shell, so almost any `sh`/`bash` script runs unchanged, while interactive use gains better completion, spelling correction, and theming.

---

## Why does it matter?

The shell is the primary interface for development work: running builds, managing git, chaining tools with pipes. Knowing which shell you're in and how it's configured explains otherwise-confusing behaviour — why a command exists in one terminal but not another, why `PATH` differs, or why a script that works in CI fails locally.

The bash-3.2 freeze matters in practice: scripts relying on bash 4+ features (associative arrays, `${var,,}` case conversion) will fail against the system bash. Install a newer bash via Homebrew, or target zsh/POSIX `sh` instead.

---

## How it works

**Which shell am I running?**

```bash
echo "$SHELL"        # your configured login shell, e.g. /bin/zsh
ps -p $$ -o comm=   # the shell actually running now
```

**Startup files.** zsh reads different files depending on how it was launched. The distinction between *login* and *interactive* shells is the usual source of "my PATH isn't set" confusion:

| File | Read when | Typical use |
|---|---|---|
| `~/.zshenv` | **Always** (every zsh) | Environment variables needed by scripts too |
| `~/.zprofile` | Login shells | `PATH` setup, one-time login config (Homebrew's `shellenv` goes here) |
| `~/.zshrc` | Interactive shells | Aliases, prompt, completion, key bindings |
| `~/.zlogin` / `~/.zlogout` | Login start / end | Rarely needed |

macOS Terminal.app opens a **login + interactive** shell by default, so it reads `.zprofile` **and** `.zshrc`. Many remote/CI shells are only interactive or only login — hence the split.

**System-wide** config lives in `/etc/zshrc`, `/etc/zprofile`, and `/etc/paths` + `/etc/paths.d/` (the latter is macOS-specific: `path_helper` builds the default `PATH` from those files).

**Feature highlights** that distinguish zsh from plain bash:

- **Powerful globbing** — `**/*.go` recurses directories; `*(.)` matches only regular files; `*(om[1])` the most recently modified.
- **Shared, de-duplicated history** across sessions via `setopt SHARE_HISTORY`.
- **Programmable completion** — `compinit` loads a large completion system; tools like git and docker ship zsh completions.
- **Themable prompts** via `PROMPT`/`RPROMPT`; frameworks like **Oh My Zsh** and **Starship** build on this.

---

## Examples

A small, idiomatic `~/.zshrc`:

```zsh
# ~/.zshrc — interactive shell configuration

# History: large, shared, no duplicates
HISTSIZE=50000
SAVEHIST=50000
setopt SHARE_HISTORY HIST_IGNORE_ALL_DUPS

# Completion system
autoload -Uz compinit && compinit

# Case-insensitive, recursive globbing
setopt EXTENDED_GLOB

# Aliases
alias ll='ls -lah'
alias gs='git status -sb'

# A minimal prompt: user, cwd, and git branch on the right
autoload -Uz vcs_info
precmd() { vcs_info }
setopt PROMPT_SUBST
PROMPT='%n %1~ %# '
RPROMPT='${vcs_info_msg_0_}'
```

Homebrew wiring belongs in `~/.zprofile` (login-time, runs once):

```zsh
# ~/.zprofile — Apple Silicon Homebrew
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Switching your default shell:

```bash
# List permitted shells, then change the login shell
cat /etc/shells
chsh -s /bin/zsh        # or a Homebrew bash: /opt/homebrew/bin/bash
```

---

## When to use

- **zsh** for everyday interactive use — it's the default, well-supported, and script-compatible.
- Put environment/`PATH` in `~/.zprofile`; put aliases, prompt, and completion in `~/.zshrc`.
- Use a newer Homebrew **bash** when a script genuinely needs bash 4+ features.

## When NOT to use

- Don't rely on the **system bash** (3.2) for modern bash scripts — it's outdated by design.
- Don't hardcode zsh-only globbing in scripts meant to be portable; target POSIX `sh` for portability.
- Don't scatter `PATH` edits across `.zshrc` — interactive-only sourcing leads to inconsistent environments in non-interactive contexts.

---

## References

- [zsh manual](https://zsh.sourceforge.io/Doc/)
- [Use zsh as the default shell on your Mac (Apple Support)](https://support.apple.com/en-us/102360)
- [Oh My Zsh](https://ohmyz.sh/)
- [Starship prompt](https://starship.rs/)
- [GNU Bash manual](https://www.gnu.org/software/bash/manual/)
