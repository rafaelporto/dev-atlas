---
type: how-to
tags:
  - tool
related: []
language: null
---
# How to Use Git Hooks

> Run scripts automatically at well-defined points in the Git lifecycle — to enforce commit message format, run linters, prevent bad pushes, or trigger anything else.

---

## Prerequisites

- A Git repository with `.git/hooks/` (created by `git init` / `git clone`).
- A scripting language available on every contributor's machine — typically `bash`, but any language works if its interpreter is installed (the hook is just an executable file).
- For team-wide hooks: a way to distribute them (committed to the repo, plus a one-time `git config core.hooksPath`, or a manager like `pre-commit` or `husky`).

---

## Steps

### 1. Know which hooks fire when

Hooks live in `.git/hooks/`. Each one is just an executable file named after a hook event. The most useful events:

| Hook | When it fires | Common uses |
|---|---|---|
| `pre-commit` | Before `git commit` records the commit. | Linters, formatters, fast tests. Exit non-zero to abort. |
| `prepare-commit-msg` | Before the commit message editor opens. | Pre-fill the message (issue ID from branch name, template). |
| `commit-msg` | After the message is written, before it is finalized. | Validate format (Conventional Commits, regex). Exit non-zero to abort. |
| `post-commit` | After a commit is recorded. | Notifications, local logging. Cannot abort the commit. |
| `pre-push` | Before `git push` sends data. | Run the test suite, scan for secrets, block pushes to protected branches. |
| `pre-rebase` | Before a rebase starts. | Block rebases on protected branches. |
| `post-merge` | After a successful merge or pull. | `npm install` if package.json changed; warm caches. |
| `pre-receive` / `update` / `post-receive` | **Server-side** hooks on the receiving end of a push. | Enforce policy on the central repo: block force pushes, validate signatures, trigger CI. |

A hook is invoked only if the file exists, is executable, and is named exactly as the event. Git ships `*.sample` files in `.git/hooks/` for reference; remove the `.sample` to activate.

---

### 2. Write a hook

Create the file, make it executable. Example: a `commit-msg` hook that enforces Conventional Commits.

```bash
cat > .git/hooks/commit-msg <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

commit_msg_file="$1"
first_line=$(head -n1 "$commit_msg_file")

# Conventional Commits regex: type(scope)!: description
pattern='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9-]+\))?!?: .+$'

if [[ ! "$first_line" =~ $pattern ]]; then
    echo "Commit message does not follow Conventional Commits:" >&2
    echo "  $first_line" >&2
    echo "Expected: <type>(<scope>)[!]: <description>" >&2
    exit 1
fi
EOF
chmod +x .git/hooks/commit-msg
```

Every hook receives event-specific arguments via positional parameters or stdin — `commit-msg` gets the path to the message file, `pre-push` gets remote name and URL plus refs on stdin, etc. The full list is in [`githooks(5)`](https://git-scm.com/docs/githooks).

Exit code convention: **0 = proceed, non-zero = abort** (for hooks that can abort).

---

### 3. Share hooks across the team

`.git/hooks/` is not committed to the repository, so per-clone hooks do not propagate. Two solid approaches:

**Approach A: commit hooks to a directory, point Git at it.**

```bash
mkdir -p .githooks
mv .git/hooks/commit-msg .githooks/

git config core.hooksPath .githooks
```

Commit `.githooks/`. Each contributor runs `git config core.hooksPath .githooks` once after cloning. To automate this, add a `make setup` or `scripts/bootstrap.sh` step.

**Approach B: use a hook manager.**

- [pre-commit](https://pre-commit.com/) — language-agnostic, popular in polyglot repos and CI. Hooks are defined in `.pre-commit-config.yaml` and installed via `pre-commit install`.
- [husky](https://typicode.github.io/husky/) — JavaScript-ecosystem-focused; integrates with `package.json` scripts.
- [lefthook](https://github.com/evilmartian/lefthook) — fast, language-agnostic, parallel hook runner.

Hook managers handle distribution, language-specific runners, and concurrent execution — worth adopting once you have more than two or three hooks.

---

### 4. Skip a hook intentionally

Sometimes a hook must be bypassed (an emergency commit, a known false positive). Most hooks honor `--no-verify`:

```bash
git commit --no-verify -m "wip"
git push --no-verify
```

Use sparingly. If the hook is firing wrongly, fix the hook — repeated `--no-verify` is a smell.

For server-side hooks: there is **no** bypass. They run on the receiving repo and are the team's enforcement boundary.

---

### 5. Combine multiple checks in one hook

A `pre-commit` hook often runs several things:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Block commits that include the marker "DO NOT COMMIT"
if git diff --cached | grep -E "(DO NOT COMMIT|XXX-HARDCODED-)"; then
    echo "Refusing to commit: forbidden marker found in staged changes." >&2
    exit 1
fi

# Run formatter on staged files only
staged_go=$(git diff --cached --name-only --diff-filter=ACM | grep '\.go$' || true)
if [[ -n "$staged_go" ]]; then
    gofmt -l $staged_go | grep -q . && {
        echo "Staged Go files are not gofmt'd:" >&2
        gofmt -l $staged_go >&2
        exit 1
    } || true
fi
```

Keep the hook **fast** — anything over a few seconds is friction users will route around with `--no-verify`. Push slow checks (full test suite, integration tests) to CI; keep `pre-commit` to formatters, linters, and obvious blockers.

---

## Verification

After installing a hook, confirm it runs:

```bash
# Confirm hooks path
git config --get core.hooksPath
# .githooks  (or empty if using default .git/hooks)

# Confirm file is executable
ls -l .githooks/commit-msg
# -rwxr-xr-x ... commit-msg

# Trigger the hook with an intentionally bad input
git commit --allow-empty -m "broken message"
# Should be rejected.

git commit --allow-empty -m "test: confirm hook fires"
# Should succeed.
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Hook does not fire | File is not executable, has the wrong name, or `core.hooksPath` points elsewhere | `chmod +x` the file; check the name (no `.sh`, no `.sample`); verify `git config core.hooksPath`. |
| Hook works locally but not on a teammate's machine | They cloned but never set `core.hooksPath` | Add a bootstrap script or use a hook manager. |
| `pre-commit` runs against the working tree, not staged content | Hook is checking files directly instead of staged content | Iterate `git diff --cached --name-only` and check those files, not arbitrary paths. |
| Long-running hooks slow every commit | Hook is doing too much | Move slow checks to CI; keep hooks to fast lint/format. |
| `--no-verify` was missed by a hook | Some hooks (e.g., `pre-commit-msg`) ignore `--no-verify`; the `commit-msg` hook *does* honor it | If a check must run unconditionally, enforce it server-side instead. |
| Hook works in terminal but not in IDE | IDE invokes Git with a stripped environment (no `PATH` to tools like `golangci-lint`) | Use absolute paths to binaries, or source a `~/.profile`-equivalent at the top of the hook. |

---

## References

- [Pro Git — Customizing Git: Git Hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) — canonical reference.
- [git-scm — githooks(5)](https://git-scm.com/docs/githooks) — full list of hooks, when they fire, and what arguments they receive.
- [pre-commit framework](https://pre-commit.com/) — popular cross-language hook manager.
- [husky](https://typicode.github.io/husky/) — JavaScript-ecosystem hook manager.
- [Atlassian — Git Hooks](https://www.atlassian.com/git/tutorials/git-hooks) — illustrated introduction.
