---
type: how-to
tags:
  - language
  - java
  - backend
related:
  - languages/java/project-setup
  - languages/java/toolchain
language: "java"
---
# Installing Java

> How to install a Java Development Kit (JDK), manage multiple versions with SDKMAN!, and verify the installation.

---

## Prerequisites

- A terminal (bash, zsh, or PowerShell)
- Administrator rights to install software
- Roughly 500 MB of free disk space per JDK version

---

## Steps

### 1. Choose a JDK distribution

Java is a specification with several vendor builds of OpenJDK. Any of these is production-ready; they differ mainly in support terms and bundled tools.

| Distribution | Notes |
|---|---|
| Eclipse Temurin (Adoptium) | Community-standard, free, widely used in CI and containers |
| Oracle JDK | Oracle's build; free under the current terms for most uses |
| Amazon Corretto | Free long-term support, tuned for AWS |
| Azul Zulu | Free builds plus commercial support tiers |

Prefer a current **LTS** release (Java 21 or Java 25) for applications.

### 2. Install SDKMAN! (recommended on macOS/Linux)

SDKMAN! manages multiple JDK versions and switches between them per shell or project.

```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
```

### 3. Install a JDK with SDKMAN!

```bash
# List available JDKs
sdk list java

# Install a specific Temurin LTS build (example version)
sdk install java 21.0.4-tem

# Set it as the default
sdk default java 21.0.4-tem
```

To switch versions in the current shell only:

```bash
sdk use java 17.0.12-tem
```

### 4. Alternative: official installer

If you prefer not to use SDKMAN!, download an installer directly:

- macOS / Windows: run the `.pkg` / `.msi` from the vendor's download page.
- Linux: install via the package manager, e.g. Debian/Ubuntu:

```bash
sudo apt update
sudo apt install openjdk-21-jdk
```

### 5. Set JAVA_HOME (if not using SDKMAN!)

Many build tools read `JAVA_HOME`. SDKMAN! sets it automatically; manual installs may need it.

```bash
# macOS / Linux — add to ~/.zshrc or ~/.bashrc
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"   # macOS
export PATH="$JAVA_HOME/bin:$PATH"
```

```powershell
# Windows (PowerShell, as admin)
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-21", "Machine")
```

---

## Verification

```bash
java -version
# openjdk version "21.0.4" 2024-07-16
# OpenJDK Runtime Environment Temurin-21.0.4+7 ...

javac -version
# javac 21.0.4

echo $JAVA_HOME
# /path/to/jdk-21
```

Run a one-liner to confirm the runtime works (Java 11+ can launch a single source file directly):

```bash
echo 'public class Hi { public static void main(String[] a){ System.out.println("ok"); } }' > Hi.java
java Hi.java
# ok
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `java: command not found` | JDK's `bin` not on `PATH` | Add `$JAVA_HOME/bin` to `PATH`, or reinstall via SDKMAN! |
| `java -version` shows a different version than expected | Multiple JDKs installed; wrong default | `sdk default java <version>` or fix `JAVA_HOME` |
| Build tool uses the wrong JDK | `JAVA_HOME` points elsewhere than `PATH` | Align `JAVA_HOME` with the intended JDK |
| `javac` missing but `java` works | A JRE, not a full JDK, is installed | Install a JDK (includes the compiler) |
| SDKMAN! command not found after install | Init script not sourced | Run `source "$HOME/.sdkman/bin/sdkman-init.sh"` or restart the shell |

---

## References

- [SDKMAN! — Installation](https://sdkman.io/install)
- [Eclipse Temurin (Adoptium)](https://adoptium.net/)
- [Java Downloads — Oracle](https://www.oracle.com/java/technologies/downloads/)
- [Amazon Corretto](https://aws.amazon.com/corretto/)
- [Getting Started with Java — dev.java](https://dev.java/learn/getting-started/)
