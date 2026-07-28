---
type: how-to
tags:
  - language
  - clojure
  - backend
related:
  - languages/clojure/project-setup
  - languages/clojure/toolchain
language: "clojure"
---
# Installing Clojure

> How to install a JDK and the official Clojure CLI (and, optionally, Leiningen) so you can start a REPL and run Clojure code.

---

## Prerequisites

- Terminal access (macOS, Linux, or WSL on Windows)
- Permission to install software (Homebrew on macOS, or `sudo` on Linux)
- `curl` and `rlwrap` available on Linux

Clojure runs on the JVM, so a **JDK must be installed first**. Clojure officially supports Java LTS releases (currently Java 8, 11, 17, 21, and 25); a recent LTS such as Temurin 21 is a good default.

---

## Steps

### 1. Install a JDK

Verify whether a JDK is already present:

```bash
java -version
```

If not, install a Temurin (Adoptium) LTS build.

**macOS (Homebrew):**

```bash
brew install --cask temurin@21
```

**Linux (Debian/Ubuntu example):**

```bash
sudo apt-get update
sudo apt-get install -y openjdk-21-jdk
```

Confirm `java` is on `PATH` (or that `JAVA_HOME` is set) — the Clojure tools require it.

---

### 2. Install the Clojure CLI

The official Clojure CLI installs two commands: `clojure` (the driver) and `clj` (the same driver wrapped in `rlwrap` for a nicer interactive REPL).

**macOS (Homebrew):**

```bash
brew install clojure/tools/clojure
```

**Linux (official installer script):**

```bash
curl -L -O https://github.com/clojure/brew-install/releases/latest/download/linux-install.sh
chmod +x linux-install.sh
sudo ./linux-install.sh
```

The Linux installer places `clj` and `clojure` in `/usr/local/bin` and support files in `/usr/local/lib/clojure`. Linux also needs `rlwrap`:

```bash
sudo apt-get install -y rlwrap
```

**Windows:** use WSL and follow the Linux steps, or install via the community `scoop`/`clj-msi` packages documented on clojure.org.

---

### 3. (Optional) Install Leiningen

Many existing projects use Leiningen instead of (or alongside) the CLI. Install it if you will work on such projects.

**macOS (Homebrew):**

```bash
brew install leiningen
```

**Manual (any platform):** download the `lein` script from [leiningen.org](https://leiningen.org), put it on your `PATH`, make it executable, and run `lein` once to self-install.

---

### 4. Start a REPL

The REPL is the heart of the Clojure workflow. Start one with no project at all:

```bash
clj
```

You should see a `user=>` prompt. Evaluate an expression:

```clojure
user=> (+ 1 2 3)
6
user=> (map inc [10 20 30])
(11 12 13)
```

Exit with `Ctrl-D` or `(System/exit 0)`.

---

## Verification

```bash
java -version            # a supported LTS, e.g. openjdk version "21..."
clojure --version        # e.g. Clojure CLI version 1.12.x.xxxx
clj -e "(println (clojure-version))"   # prints the language version, e.g. 1.12.5
lein version             # (only if you installed Leiningen)
```

Run a one-liner without entering the REPL:

```bash
clj -e '(println "Clojure is working.")'   # prints: Clojure is working.
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Execution error ... Unable to locate a Java Runtime` | No JDK installed or `java` not on `PATH` | Install a JDK; ensure `java` is on `PATH` or set `JAVA_HOME` |
| `clj: command not found` | Clojure CLI not installed or not on `PATH` | Re-run the installer; confirm `/usr/local/bin` is on `PATH` |
| `rlwrap: command not found` (Linux) | `clj` needs `rlwrap`; only `clojure` works without it | `sudo apt-get install rlwrap`, or use `clojure` instead of `clj` |
| Very slow first `clj` start | Dependencies downloading to `~/.m2` and `~/.gitlibs` | Expected on first run; subsequent starts are cached and fast |
| Wrong Clojure version reported | An old CLI or a project `deps.edn` pinning an old `org.clojure/clojure` | Upgrade the CLI (`brew upgrade clojure/tools/clojure`); bump the dep version |

---

## References

- [Clojure — Install Clojure (official guide)](https://clojure.org/guides/install_clojure)
- [Clojure — Getting Started](https://clojure.org/guides/getting_started)
- [Adoptium Temurin JDK downloads](https://adoptium.net/)
- [Leiningen — official site](https://leiningen.org)
- [Clojure — Deps and CLI Reference](https://clojure.org/reference/deps_and_cli)
