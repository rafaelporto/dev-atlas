---
type: concept
tags:
  - language
  - java
  - cli
  - overview
related:
  - languages/java/cli/building-clis
  - languages/java/cli/tui
  - languages/java/overview
  - languages/java/packages-and-build
  - languages/java/deploy
language: "java"
---

# Java for CLIs & Terminal Apps

> Why Java is a stronger CLI language than its reputation suggests — best-in-class libraries like picocli, and GraalVM native-image to erase the JVM's startup cost — and a map of the ecosystem.

---

## What is it?

A **command-line interface (CLI)** is a program you drive by typing a command, flags, and arguments into a terminal. Java's reputation for slow startup made it an unusual choice for CLIs, but the library quality is excellent — **picocli** is one of the best argument parsers in any language — and **GraalVM native-image** now compiles a Java CLI to a fast-starting native binary. Many developer tools (parts of the JHipster and Micronaut tooling) are Java CLIs.

This article is the entry point to the CLI & Terminal cluster. It explains *when* Java fits CLIs and *which* library to reach for, then hands off to the deep dives: [Building CLIs](building-clis.md) and [Terminal UIs](tui.md).

## Why does it matter?

The honest trade-off first: the JVM takes hundreds of milliseconds to start and load classes, so a plain `java -jar` CLI feels sluggish in tight shell loops. For a tiny throwaway script, that overhead is a real reason to reach for something else.

But two things change the calculus. First, **picocli** makes writing the CLI itself a pleasure — annotation-driven commands, typed options, subcommands, ANSI help, and completion, all derived from your types. Second, **GraalVM native-image** ahead-of-time-compiles the tool to a self-contained native binary that starts in single-digit milliseconds, closing most of the gap with Go. And when the tool already lives inside a JVM codebase (a Spring app, a build plugin), building its CLI in Java reuses everything.

## How it works

A Java CLI is a class with a `main` method. picocli turns an annotated class into a full command; you package it as an executable JAR or compile it to a native binary.

```
annotated @Command class
        │
        ├── java -jar tool.jar      ──▶  runs on any JVM (slower start)
        └── native-image            ──▶  self-contained native binary (fast start)
```

| Property | What it means for CLIs |
|---|---|
| **JVM startup latency** | Plain `java -jar` is slow to start — poor for tiny, frequently-invoked tools. |
| **picocli** | Annotation-driven parsing, subcommands, typed options, ANSI help, completion — best-in-class. |
| **GraalVM native-image** | AOT-compile to a fast-starting native binary; picocli has first-class support. |
| **Huge ecosystem** | Any Maven/Gradle library is available to the tool. |
| **Reuse in JVM codebases** | Ship a CLI alongside an existing Spring/JVM app with shared code. |
| **`Runnable`/`Callable`** | picocli maps a command's return value to the process exit code. |

### The ecosystem: what to reach for

```
┌─────────────────────────────────────────────────────────────┐
│  Interactive shells              Spring Shell                │
├─────────────────────────────────────────────────────────────┤
│  Command framework (subcommands) picocli · JCommander        │
├─────────────────────────────────────────────────────────────┤
│  Standard library                String[] args              │
│                                  · Apache Commons CLI        │
└─────────────────────────────────────────────────────────────┘
```

**Standard library (`String[] args`)** — the raw argument array; you parse everything by hand. **Apache Commons CLI** is a low-level, long-standing parser if you want a little help without annotations.

**picocli** — the idiomatic modern choice. You annotate a class with `@Command` and its fields with `@Option`/`@Parameters`; picocli parses, validates, generates help, supports nested subcommands and shell completion, and works great with GraalVM. Covered in [Building CLIs](building-clis.md). **JCommander** is a comparable annotation-based alternative.

**Spring Shell** — for building an *interactive shell* (a REPL-like prompt with commands), on top of Spring, when your tool is a session rather than a one-shot command.

### GraalVM native-image

For a fast-starting binary, compile the JAR with `native-image`. picocli ships an annotation processor that generates the reflection metadata GraalVM needs, so a picocli CLI compiles to native with minimal configuration. See [Deploy](../deploy.md) and [Packages and Build](../packages-and-build.md).

## Examples

A minimal picocli command implements `Callable<Integer>` (its return value is the exit code):

```java
import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;
import picocli.CommandLine.Parameters;
import java.util.concurrent.Callable;

@Command(name = "greet", mixinStandardHelpOptions = true, version = "1.0")
public class Greet implements Callable<Integer> {

    @Parameters(index = "0", defaultValue = "world", description = "who to greet")
    String name;

    @Option(names = {"-u", "--upper"}, description = "uppercase the greeting")
    boolean upper;

    @Override
    public Integer call() {
        String greeting = "Hello, " + name + "!";
        System.out.println(upper ? greeting.toUpperCase() : greeting); // stdout
        return 0; // exit code
    }

    public static void main(String[] args) {
        System.exit(new CommandLine(new Greet()).execute(args));
    }
}
```

```console
$ java -jar greet.jar Ada --upper
HELLO, ADA!
```

`mixinStandardHelpOptions` gives `--help` and `--version` for free; the `@Parameters`/`@Option` types drive parsing and validation. For subcommands, exit codes, and native builds, see [Building CLIs](building-clis.md).

## When to use

- CLIs that live inside an existing JVM codebase (Spring app, build/Gradle plugin) and reuse its code.
- Substantial tools where picocli's ergonomics and the Maven ecosystem outweigh startup cost — especially when compiled with GraalVM native-image.
- Interactive shells (Spring Shell) where the process is long-lived and startup is amortized.
- Teams deeply invested in Java who want type-safe, annotation-driven parsing.

## When NOT to use

- **Tiny, frequently-invoked scripts** where plain-JVM startup latency dominates and you can't justify a native-image build.
- **When you need effortless cross-compilation** to many targets — Go is more turnkey; GraalVM builds are per-platform and heavier.
- **A quick one-off on your own machine** — a shell or [Clojure/babashka](../../clojure/cli/overview.md) script is faster to write.

## References

- [picocli](https://picocli.info/) — the manual and examples.
- [picocli + GraalVM native image](https://picocli.info/#_graalvm_native_image)
- [Spring Shell](https://spring.io/projects/spring-shell)
- [Apache Commons CLI](https://commons.apache.org/proper/commons-cli/)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
