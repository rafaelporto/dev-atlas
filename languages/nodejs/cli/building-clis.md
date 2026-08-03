---
type: how-to
tags:
  - language
  - nodejs
  - cli
related:
  - languages/nodejs/cli/overview
  - languages/nodejs/cli/tui
  - languages/nodejs/project-setup
  - languages/nodejs/configuration-and-environment
  - languages/nodejs/error-handling
language: "nodejs"
---

# How to Build a CLI in Node.js

> A hands-on guide: start with the built-in `parseArgs`, grow into a Commander multi-command tool with layered config and shell completion, wire up correct exit codes and streams, and keep it testable.

---

## Prerequisites

- Node 18+ and an initialized project — see [Project Setup](../project-setup.md). Use `"type": "module"` for ESM (assumed below).
- Familiarity with `async`/`await` and [error handling](../error-handling.md).
- A `bin` field in `package.json` mapping a command name to your entry file (see [Overview](overview.md#how-it-works)).

This guide bakes in the CLI conventions that matter — **exit codes**, **stdout vs. stderr**, and **honoring pipes/`NO_COLOR`** — as it goes, rather than in a separate article.

## Steps

### 1. Start with the standard library (`parseArgs`)

For a single-purpose tool with no subcommands, `node:util`'s `parseArgs` (Node 18+) is all you need — zero dependencies.

```ts
#!/usr/bin/env node
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  options: {
    verbose: { type: "boolean", short: "v", default: false },
    count: { type: "string", default: "1" }, // parseArgs values are strings
  },
  allowPositionals: true,
});

if (positionals.length === 0) {
  process.stderr.write("usage: repeat [--count N] [--verbose] TEXT\n");
  process.exit(2); // 2 = usage error, by convention
}

const count = Number(values.count);
if (values.verbose) {
  process.stderr.write(`repeating ${positionals[0]} ${count} times\n`);
}
for (let i = 0; i < count; i++) process.stdout.write(positionals[0] + "\n");
```

```console
$ node repeat.js --count 3 hi
hi
hi
hi
```

`parseArgs` handles `--flag`, `--flag=value`, and short flags, but does **not** coerce types, generate help, or support subcommands. When you need those, move up a layer.

### 2. Scale up with Commander

[Commander](https://github.com/tj/commander.js) is the most widely used framework for git-style CLIs. Install it:

```bash
npm install commander
```

A Commander app is a tree of commands. The root is the program; children are subcommands. Options are typed and can have defaults; `--help` is generated for you.

```ts
#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();
program
  .name("todo")
  .description("A tiny task manager")
  .version("1.0.0"); // enables --version

program
  .command("add <task>")
  .description("Add a new task")
  .option("-p, --priority <n>", "task priority", "1")
  .option("-v, --verbose", "verbose output", false)
  .action((task: string, opts: { priority: string; verbose: boolean }) => {
    if (opts.verbose) {
      process.stderr.write(`adding with priority ${opts.priority}\n`);
    }
    process.stdout.write(`added: ${task}\n`);
  });

program.parseAsync(); // async-aware; use for actions that await
```

```console
$ node todo.js add "buy milk" -p 2 -v
adding with priority 2
added: buy milk
```

Key wins over raw `parseArgs`: nested subcommands, generated `--help`/`--version`, typed options with defaults, argument validation, and an async-aware `parseAsync`. Commander throws/exits on unknown options for you.

### 3. Use exit codes and streams correctly

These conventions make your tool composable in scripts and pipelines:

- **Results to `stdout`, everything else to `stderr`.** Progress, warnings, and prompts go to `process.stderr` so that `tool > out.json` captures only real output.
- **Exit non-zero on failure.** `0` = success, `1` = general error, `2` = usage error (by convention). Set `process.exitCode = 1` (preferred — lets buffered output flush) rather than calling `process.exit(1)` eagerly.
- **Respect `NO_COLOR` and non-TTY output.** Only colorize when `process.stdout.isTTY` and `!process.env.NO_COLOR`.

```ts
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const ok = (s: string) => (useColor ? `\x1b[32m${s}\x1b[0m` : s);

try {
  await run();
} catch (err) {
  process.stderr.write(`error: ${(err as Error).message}\n`);
  process.exitCode = 1; // flush pending stdout, then exit non-zero
}
```

### 4. Layer configuration

Real tools read config from more than flags: defaults, a config file, environment variables, then flags — with **flags winning**. [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) finds a config file (`.todorc`, `todo.config.js`, a `"todo"` key in `package.json`) using standard conventions. See [Configuration and Environment](../configuration-and-environment.md) for the twelve-factor rationale.

```ts
import { cosmiconfig } from "cosmiconfig";

const found = await cosmiconfig("todo").search(); // walks up from cwd
const fileCfg = found?.config ?? {};

// Precedence: flag > env > file > default
const priority =
  opts.priority ?? process.env.TODO_PRIORITY ?? fileCfg.priority ?? 1;
```

### 5. Generate shell completion

Commander does not ship completion; add [`@pnpm/tabtab`](https://github.com/pnpm/tabtab) (or yargs, which has built-in completion) when your tool has many subcommands/flags worth completing. Expose an `install-completion` command that registers the script with the user's shell. For most tools, completion is optional polish — add it once the command surface is large enough to benefit.

### 6. Make it testable

Keep the `bin` entry thin: parse args, call a function that takes its output stream and returns/throws, and translate the result into an exit code. Never call `process.exit` deep in your logic — it makes code untestable and skips cleanup. See [Testing](../testing.md).

```ts
// core.ts — pure logic, testable
export async function run(
  args: string[],
  out: NodeJS.WritableStream,
): Promise<number> {
  out.write("done\n");
  return 0; // exit code
}

// cli.ts — thin entry
import { run } from "./core.js";
run(process.argv.slice(2), process.stdout)
  .then((code) => { process.exitCode = code; })
  .catch((err) => {
    process.stderr.write(`error: ${err.message}\n`);
    process.exitCode = 1;
  });
```

```ts
// core.test.ts (node:test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { run } from "./core.js";

test("prints done and exits 0", async () => {
  const out = new PassThrough();
  let buf = "";
  out.on("data", (c) => (buf += c));
  const code = await run([], out);
  assert.equal(code, 0);
  assert.match(buf, /done/);
});
```

## Verification

Link the package and exercise each path:

```bash
npm link                       # or: npm install -g .
todo add "buy milk" --priority 2   # expect: added: buy milk
todo --help                        # expect: usage with subcommands listed
todo > out.txt; cat out.txt        # expect: only results, no diagnostics
echo $?                            # expect: 0 on success, non-zero on error
```

Confirm the shebang and `bin` wiring resolve — `which todo` should point at the linked launcher.

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `command not found` after install | Missing shebang or `bin` entry in `package.json` | Add `#!/usr/bin/env node` and a `"bin"` mapping; re-run `npm link` |
| Diagnostics captured by `> file` | Writing progress/logs to `stdout` | Write everything that isn't the result to `process.stderr` |
| Exit code always `0` on error | Throwing without setting an exit code, or `process.exit(0)` in a `finally` | Set `process.exitCode = 1` in the catch; avoid eager `process.exit` |
| Numeric option is a string | `parseArgs`/Commander values are strings | Coerce with `Number(...)`, or use Commander's `.argParser` |
| `require`/`import` error at startup | ESM/CJS mismatch | Match `"type"` in `package.json`; see [Modules: CommonJS and ES Modules](../modules-cjs-esm.md) |
| Colors leak into piped output | Colorizing unconditionally | Gate color on `process.stdout.isTTY && !process.env.NO_COLOR` |

## References

- [Commander.js documentation](https://github.com/tj/commander.js#readme)
- [Node.js `util.parseArgs`](https://nodejs.org/api/util.html#utilparseargsconfig)
- [yargs](https://yargs.js.org/) and [cac](https://github.com/cacjs/cac)
- [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
