---
type: how-to
tags:
  - language
  - java
  - cli
related:
  - languages/java/cli/overview
  - languages/java/cli/tui
  - languages/java/packages-and-build
  - languages/java/error-handling
language: "java"
---

# How to Build a CLI in Java

> A hands-on guide: define a picocli `@Command`, add options and subcommands, return exit codes, generate completion, compile to a GraalVM native binary, and keep it testable.

---

## Prerequisites

- A JDK and a Maven or Gradle project — see [Packages and Build](../packages-and-build.md).
- The `info.picocli:picocli` dependency added.
- Familiarity with Java basics and [error handling](../error-handling.md).

This guide bakes in the CLI conventions that matter — **exit codes**, **stdout vs. stderr**, and **honoring `NO_COLOR`** — as it goes.

## Steps

### 1. Define a single command

Annotate a class with `@Command` and implement `Callable<Integer>`; the returned `int` is the process exit code. Fields carry `@Option` and `@Parameters`.

```java
import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;
import java.util.concurrent.Callable;

@Command(name = "todo", mixinStandardHelpOptions = true, version = "1.0",
         description = "A tiny task manager")
public class Todo implements Callable<Integer> {

    @Parameters(index = "0", description = "the task to add")
    String task;

    @Option(names = {"-p", "--priority"}, description = "task priority")
    int priority = 1;

    @Option(names = {"-v", "--verbose"})
    boolean verbose;

    @Override
    public Integer call() {
        if (verbose) System.err.println("adding with priority " + priority);
        System.out.println("added: " + task);
        return 0;
    }

    public static void main(String[] args) {
        int code = new CommandLine(new Todo()).execute(args);
        System.exit(code);
    }
}
```

```console
$ java -jar todo.jar "buy milk" -p 2 -v
adding with priority 2
added: buy milk
```

`execute(args)` parses, runs `call()`, prints errors to stderr on bad input, and returns an exit code. `mixinStandardHelpOptions` adds `--help`/`--version`.

### 2. Add subcommands

Register subcommand classes on the parent with `subcommands = { ... }`. Each is its own `@Command` + `Callable<Integer>`.

```java
@Command(name = "todo", mixinStandardHelpOptions = true,
         subcommands = { AddCommand.class, ListCommand.class })
class Todo implements Runnable {
    public void run() { new CommandLine(this).usage(System.out); } // no subcommand → help
}

@Command(name = "add", description = "Add a new task")
class AddCommand implements Callable<Integer> {
    @Parameters(index = "0") String task;
    @Option(names = {"-p", "--priority"}) int priority = 1;
    public Integer call() { System.out.println("added: " + task); return 0; }
}

@Command(name = "list", description = "List tasks")
class ListCommand implements Callable<Integer> {
    public Integer call() { System.out.println("listing tasks"); return 0; }
}
```

### 3. Validate input and set exit codes

Throw `CommandLine.ParameterException` for bad usage (picocli prints it + usage to stderr and returns a usage exit code), and return distinct codes from `call()`. Map exceptions to codes with an `IExitCodeExceptionMapper` or the `@Command(exitCodeOnExecutionException = …)` attribute.

```java
@Override
public Integer call() {
    if (priority < 1 || priority > 5) {
        throw new CommandLine.ParameterException(spec.commandLine(),
            "priority must be between 1 and 5");
    }
    // ... work ...
    return 0; // 0 success; return non-zero to signal failure
}
```

By convention: `0` success, `1` general error, `2` usage error (picocli's default for parse failures). Never call `System.exit` from inside `call()` — return a code and let `main` exit.

### 4. Use streams correctly

- **Results to `System.out`, diagnostics to `System.err`** so `tool > out.txt` captures only real output.
- **Respect `NO_COLOR` and non-TTY output.** picocli's `Help.Ansi.AUTO` already disables color when output isn't a terminal; honor `NO_COLOR` explicitly too.

```java
boolean useColor = System.console() != null            // null when not a TTY
        && System.getenv("NO_COLOR") == null;
```

### 5. Generate completion and a native binary

picocli generates completion scripts via its `AutoComplete` tool. For fast startup, compile the JAR with GraalVM `native-image`; picocli's `picocli-codegen` annotation processor emits the required reflection metadata. See [Deploy](../deploy.md).

```bash
# Build an executable JAR (Shade/assembly plugin), then:
native-image -jar todo.jar todo      # produces a native ./todo
./todo add "buy milk"                # starts in milliseconds
```

### 6. Make it testable

Keep logic out of `call()` where possible — put it in methods that return values or write to an injected `PrintStream`. picocli lets you `parseArgs` without executing, or capture output by passing custom streams to `CommandLine`. See [Testing](../testing.md).

```java
import org.junit.jupiter.api.Test;
import picocli.CommandLine;
import java.io.*;
import static org.junit.jupiter.api.Assertions.*;

class TodoTest {
    @Test
    void addsTask() {
        var out = new ByteArrayOutputStream();
        var cmd = new CommandLine(new Todo());
        cmd.setOut(new PrintWriter(new PrintStream(out), true));
        int code = cmd.execute("buy milk", "-p", "2");
        assertEquals(0, code);
        assertTrue(out.toString().contains("added: buy milk"));
    }
}
```

## Verification

Build the JAR and exercise each path:

```bash
mvn -q package                       # or: ./gradlew build
java -jar target/todo.jar add "buy milk" --priority 2   # expect: added: buy milk
java -jar target/todo.jar --help                        # expect: usage with subcommands
echo $?                                                 # expect: 0 on success, non-zero on error
```

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Slow startup | Plain JVM boot | Compile with GraalVM `native-image` (picocli supports it) |
| `MissingParameterException` | Required `@Parameters`/`@Option` not supplied | Provide it or give a default; check generated `--help` |
| Reflection error in native image | Missing GraalVM metadata | Add the `picocli-codegen` annotation processor |
| Exit code always `0` | Not returning the code from `execute` | `System.exit(new CommandLine(...).execute(args))` |
| Error text on stdout | Printing errors with `System.out` | Write diagnostics to `System.err`; let picocli print parse errors |
| Colors leak into piped output | Forcing ANSI | Use `Help.Ansi.AUTO`; check `System.console()` and `NO_COLOR` |

## References

- [picocli — the manual](https://picocli.info/)
- [picocli + GraalVM native image](https://picocli.info/#_graalvm_native_image)
- [picocli autocompletion](https://picocli.info/autocomplete.html)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
