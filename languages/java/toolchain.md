---
type: concept
tags:
  - language
  - java
  - tool
  - backend
related:
  - languages/java/packages-and-build
  - languages/java/installation
  - languages/java/deploy
language: "java"
---
# Toolchain

> The JDK ships a full command-line toolchain — `javac`, `java`, `jar`, `jshell`, and more — beneath the build tools and formatters most projects use day to day.

---

## What is it?

The Java toolchain is the set of programs that compile, run, package, and inspect Java code. It has two tiers:

1. **The JDK's built-in command-line tools** — `javac` (compiler), `java` (launcher), `jar` (archiver), `jshell` (REPL), `javadoc` (docs), plus diagnostics like `jstack` and `jcmd`.
2. **Ecosystem tools layered on top** — build tools (Maven, Gradle), code formatters (Spotless, google-java-format), and static analyzers (Checkstyle, SpotBugs, PMD, Error Prone).

Most projects drive everything through a build tool, but understanding the underlying JDK commands demystifies what the build tool does.

---

## Why does it matter?

Unlike Go, whose single `go` command bundles building, testing, formatting, and vetting, Java's tooling is assembled from separate pieces. Knowing what each JDK command does — and which build-tool goal wraps it — is what lets you debug a broken build, reproduce a CI failure locally, or run a quick experiment without scaffolding a project.

The formatter and static-analysis layer matters because, unlike `gofmt`, Java has no single official formatter. Teams pick and enforce one, and the choice becomes part of the project's toolchain.

---

## How it works

### Core JDK commands

| Command | Purpose |
|---|---|
| `javac` | Compile `.java` source to `.class` bytecode |
| `java` | Launch a class, a JAR, or (Java 11+) a single source file |
| `jar` | Create, view, and extract JAR archives |
| `jshell` | Interactive REPL for evaluating Java expressions |
| `javadoc` | Generate HTML API documentation from doc comments |
| `jlink` | Assemble a custom, minimal runtime image from modules |
| `jpackage` | Produce native installers/executables |
| `jcmd` / `jstack` / `jmap` | Runtime diagnostics on a live JVM |
| `jfr` | Java Flight Recorder — low-overhead profiling |

### Compile and run manually

```bash
# Compile into an output directory
javac -d out src/com/example/App.java

# Run the compiled class (note: package name, not file path)
java -cp out com.example.App

# Run a single source file directly, no explicit compile (Java 11+)
java src/com/example/App.java
```

### jshell — the REPL

Great for exploring an API without a project.

```bash
jshell
```

```java
jshell> var list = new java.util.ArrayList<Integer>();
jshell> list.add(42);
jshell> list.stream().mapToInt(i -> i).sum()
$3 ==> 42
```

### Packaging with jar

```bash
# Create an executable JAR with a manifest entry point
jar --create --file app.jar --main-class com.example.App -C out .

# Run it
java -jar app.jar

# Inspect contents
jar --list --file app.jar
```

### Formatters and static analysis

Java has no built-in formatter, so projects adopt one and enforce it in the build and CI.

| Tool | Role |
|---|---|
| google-java-format | Opinionated formatter (Google style) |
| Spotless | Build-tool plugin that applies and checks formatting |
| Checkstyle | Enforces style rules (naming, imports, structure) |
| SpotBugs / PMD | Static analysis for likely bugs and smells |
| Error Prone | Compile-time bug detection (Google) |

A Gradle example wiring Spotless to run google-java-format:

```kotlin
plugins { id("com.diffplug.spotless") version "6.25.0" }

spotless {
    java {
        googleJavaFormat()
        removeUnusedImports()
    }
}
```

```bash
./gradlew spotlessApply    # format
./gradlew spotlessCheck    # fail the build if unformatted
```

### Build tools tie it together

In practice you rarely call `javac` directly. Maven and Gradle orchestrate compile → test → package and manage dependencies. See [Packages and Build](packages-and-build.md).

```bash
mvn package          # compile, test, and build the JAR
./gradlew build      # the Gradle equivalent
```

---

## Examples

### A minimal build without a build tool

```bash
mkdir out
javac -d out $(find src -name "*.java")
jar --create --file app.jar --main-class com.example.App -C out .
java -jar app.jar
```

### Generating documentation

```bash
javadoc -d docs -sourcepath src -subpackages com.example
```

### Creating a trimmed runtime with jlink

```bash
jlink --add-modules java.base,java.sql \
      --output custom-runtime \
      --strip-debug --no-man-pages
```

---

## When to use

- **`java <file>.java`** and **`jshell`** — for quick experiments and learning, no project needed.
- **A build tool (Maven/Gradle)** — for any real project; it wraps `javac`, `jar`, and dependency resolution.
- **A formatter (Spotless + google-java-format)** — enforced in CI so style never becomes a review topic.
- **Static analysis (Error Prone, SpotBugs)** — in CI to catch bug patterns the compiler misses.
- **`jlink` / `jpackage`** — when shipping a self-contained runtime or native installer.

---

## When NOT to use

- **Do not hand-run `javac`/`jar`** for multi-module projects — let the build tool manage the classpath.
- **Do not skip a formatter** and rely on manual style — it wastes review time; automate it.
- **Avoid committing without static analysis** on a team project — bug-pattern detectors pay for themselves.
- **Do not use `jshell` for anything persistent** — it is for exploration, not application code.

---

## References

- [JDK Tool Specifications — Oracle](https://docs.oracle.com/en/java/javase/21/docs/specs/man/index.html)
- [Introduction to jshell](https://docs.oracle.com/en/java/javase/21/jshell/introduction-jshell.html)
- [google-java-format](https://github.com/google/google-java-format)
- [Spotless](https://github.com/diffplug/spotless)
- [Error Prone](https://errorprone.info/)
