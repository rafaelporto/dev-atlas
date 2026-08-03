---
type: concept
tags:
  - operating-system
  - linux
  - shell
related:
  - operating-systems/linux/overview
  - operating-systems/linux/commands
  - operating-systems/macos/shell
  - languages/go/cli/terminal-and-shell
language: null
---

# The Linux Shell

> On most Linux systems the interactive shell is **bash**, layered on the POSIX shell (`sh`) model — the program that parses your commands, expands variables and globs, and wires programs together with pipes and redirection.

---

## What is it?

A **shell** is a command interpreter: it reads a line of text, expands it, and executes the resulting programs. On Linux the most common interactive default is **bash** (the GNU Bourne-Again Shell). The lowest common denominator for scripting is **POSIX `sh`** — on many systems `/bin/sh` is a smaller, faster shell (`dash` on Debian/Ubuntu, or BusyBox `ash` on Alpine) that implements just the POSIX standard.

Other popular choices exist — **zsh**, **fish** — but bash and POSIX `sh` are what you can assume are present almost everywhere, which is why this article centres on them (staying distribution-agnostic).

---

## Why does it matter?

The shell is how you drive a server: deploy, inspect logs, manage processes, glue tools together. Two facts save a lot of pain:

1. **`sh` is not `bash`.** A script with a `#!/bin/sh` shebang runs under the POSIX shell, where bash extras (arrays, `[[ ... ]]`, `local`, process substitution) may not exist. Scripts that "work on my machine" and break in a minimal container are usually assuming bash while `/bin/sh` points at dash.
2. **The shell does the expansion, not the program.** Understanding the order of expansions (variables, globs, word-splitting) explains most quoting bugs — e.g. why an unquoted `$file` with spaces breaks.

---

## How it works

**Which shell / which mode.**

```bash
echo "$0"        # name of the current shell
ps -p $$ -o comm=   # the shell process actually running
echo "$SHELL"    # your login shell from /etc/passwd
```

Change your login shell with `chsh -s /usr/bin/zsh` (must be listed in `/etc/shells`).

**Startup files (bash).** Like other shells, bash reads different files for login vs. interactive shells — the usual source of "my PATH is missing in cron/SSH" issues:

| File | Read when |
|---|---|
| `/etc/profile`, `/etc/profile.d/*` | Login shells, system-wide |
| `~/.bash_profile` or `~/.profile` | Login shells, per user (PATH, env) |
| `~/.bashrc` | Interactive non-login shells (aliases, prompt) |
| `/etc/bash.bashrc` | Interactive shells, system-wide |

A common convention: `~/.bash_profile` sources `~/.bashrc` so both login and interactive shells share the same setup.

**Core shell mechanics** (POSIX, so portable):

- **Pipes** — `a | b` connects a's stdout to b's stdin.
- **Redirection** — `>` `>>` (stdout to file, truncate/append), `<` (stdin from file), `2>` (stderr), `2>&1` (stderr to wherever stdout goes), `&>` (both, bash).
- **Expansions** — variables `$VAR`/`${VAR}`, command substitution `$(cmd)`, globs `*` `?` `[...]`, brace expansion `{a,b}` (bash), tilde `~`.
- **Exit status** — every command sets `$?` (0 = success). `&&` and `||` chain on success/failure.
- **Job control** — `cmd &` (background), `jobs`, `fg`, `bg`, `Ctrl-Z` (suspend), `nohup`/`disown` (survive logout).
- **Quoting** — `'single'` is literal; `"double"` allows `$` expansion; always quote variables that may contain spaces.

---

## Examples

Pipes, redirection, and job control together:

```bash
# Count unique IPs in a log, top 5 — a classic pipeline
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -5

# Redirect stdout and stderr to a log, run in background, survive logout
nohup ./server > server.log 2>&1 &

# Conditional chaining on exit status
make build && ./deploy.sh || echo "build failed, skipping deploy"
```

Portability: prefer POSIX in scripts meant to run under `/bin/sh`:

```sh
#!/bin/sh
# POSIX-safe: works under dash, ash, bash
if [ -f "$1" ]; then
  printf 'found %s\n' "$1"
fi
```

```bash
#!/bin/bash
# bash-only features: arrays and [[ ]]
files=(*.log)
if [[ ${#files[@]} -gt 0 && -r ${files[0]} ]]; then
  echo "first log: ${files[0]}"
fi
```

---

## When to use

- **bash** for interactive work and scripts that can assume bash is installed.
- **POSIX `sh`** (`#!/bin/sh`) for scripts that must run in minimal or container environments.
- Put env/PATH in `~/.bash_profile`/`~/.profile`; aliases and prompt in `~/.bashrc`.

## When NOT to use

- Don't give a script a `#!/bin/sh` shebang while using bash-only syntax — it breaks where `/bin/sh` is dash/ash.
- Don't leave variables unquoted (`rm $file`) — word-splitting and globbing cause data loss with spaces or `*`.
- Don't rely on interactive-only config (`~/.bashrc`) for values that cron jobs or SSH commands need.

---

## References

- [GNU Bash Reference Manual](https://www.gnu.org/software/bash/manual/)
- [POSIX Shell Command Language (Open Group)](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html)
- [Bash Guide (Greg's Wiki / BashFAQ)](https://mywiki.wooledge.org/BashGuide)
- [ShellCheck — shell script static analysis](https://www.shellcheck.net/)
