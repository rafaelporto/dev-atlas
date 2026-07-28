---
type: concept
tags:
  - language
  - java
  - backend
  - tool
related:
  - languages/java/toolchain
  - languages/java/project-setup
language: "java"
---
# Packages and Build

> Java organizes code into packages, ships build and dependency management through Maven or Gradle, and can enforce strong encapsulation across JARs with the module system (JPMS).

---

## What is it?

Three related mechanisms structure a Java project at increasing scale:

1. **Packages** — the language-level namespace. A package groups related classes and controls visibility (`public`, package-private, `protected`, `private`).
2. **Build tools** — **Maven** and **Gradle** compile code, resolve third-party dependencies from repositories, run tests, and produce artifacts (JARs).
3. **The Java Platform Module System (JPMS)** — introduced in Java 9, modules add a layer above packages that declares which packages a JAR exports and which modules it requires, enforcing encapsulation at the boundary between components.

---

## Why does it matter?

Java has no built-in dependency manager like `go mod` or `cargo`. A build tool is not optional for real projects — it defines the dependency graph, the compilation lifecycle, and the reproducible artifact. The choice between Maven and Gradle affects build speed, flexibility, and how the team configures the project.

Packages matter for encapsulation: package-private visibility is the primary way to hide implementation details within a library. Modules matter when you ship reusable components and want to guarantee that consumers cannot reach into internals — the JDK itself is fully modularized.

---

## How it works

### Packages

A package is declared at the top of a file and mirrors the directory structure. Reverse-DNS naming avoids collisions.

```java
package com.example.orders;

public class OrderService { /* ... */ }
```

```
src/main/java/com/example/orders/OrderService.java
```

Visibility modifiers control access:

| Modifier | Visible to |
|---|---|
| `public` | Everywhere |
| `protected` | Same package + subclasses |
| *(none)* — package-private | Same package only |
| `private` | Same class only |

### Maven

Maven uses a declarative `pom.xml` and a fixed build lifecycle (`validate → compile → test → package → install → deploy`). It favors convention over configuration.

```xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>orders</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <properties>
        <maven.compiler.release>21</maven.compiler.release>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.10.2</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

```bash
mvn compile        # compile sources
mvn test           # run tests
mvn package        # build the JAR into target/
```

### Gradle

Gradle uses a programmable build script (Groovy or Kotlin DSL), incremental compilation, and a build cache, making it typically faster on large projects.

```kotlin
// build.gradle.kts
plugins {
    java
    application
}

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
}

application {
    mainClass = "com.example.orders.Main"
}
```

```bash
./gradlew build    # compile, test, assemble
./gradlew run      # run the application
```

### Dependency scopes

Both tools distinguish where a dependency is needed:

| Maven scope | Gradle configuration | Meaning |
|---|---|---|
| `compile` (default) | `implementation` | Needed to compile and run |
| `provided` | `compileOnly` | Needed to compile, supplied at runtime |
| `runtime` | `runtimeOnly` | Needed only at runtime (e.g. JDBC driver) |
| `test` | `testImplementation` | Needed only for tests |

### The module system (JPMS)

A module is declared in `module-info.java` at the source root. It states what the module exports and what it requires.

```java
// src/main/java/module-info.java
module com.example.orders {
    requires com.example.common;   // dependency on another module
    requires java.sql;             // JDK module

    exports com.example.orders.api;      // public to consumers
    // com.example.orders.internal is NOT exported → hidden
}
```

Modules add **strong encapsulation**: non-exported packages are inaccessible even via reflection (unless explicitly opened). Most application code still runs on the classpath rather than the module path; JPMS is most valuable for libraries and platform code.

---

## Examples

### Multi-module Maven layout

```
my-app/
├── pom.xml                 # parent (packaging: pom)
├── orders-api/
│   └── pom.xml
├── orders-service/
│   └── pom.xml
└── orders-web/
    └── pom.xml
```

The parent `pom.xml` lists modules and centralizes versions:

```xml
<packaging>pom</packaging>
<modules>
    <module>orders-api</module>
    <module>orders-service</module>
    <module>orders-web</module>
</modules>
```

### Classpath vs module path

```bash
# Classpath (traditional; most applications)
java -cp app.jar:libs/* com.example.orders.Main

# Module path (JPMS)
java --module-path mods --module com.example.orders/com.example.orders.Main
```

---

## When to use

- **Maven** — for standardized, convention-driven enterprise projects and teams that value predictability and a huge plugin ecosystem.
- **Gradle** — for large builds where speed matters, for Android (the default), and when you need programmable, flexible build logic.
- **JPMS modules** — for libraries, SDKs, and platform code that must enforce a hard public/internal boundary.
- **Package-private visibility** — as the default for classes not meant to be part of a library's public API.

---

## When NOT to use

- **Do not skip a build tool** — hand-managing the classpath and dependencies does not scale past a toy project.
- **Do not adopt JPMS reflexively** — for a typical application deployed as a single unit, the classpath is simpler and modules add ceremony without benefit.
- **Avoid mixing Maven and Gradle** in one repository — pick one to keep the build reproducible.
- **Do not make everything `public`** — it erodes encapsulation and freezes your API surface.

---

## References

- [Maven — Getting Started](https://maven.apache.org/guides/getting-started/index.html)
- [Gradle User Manual](https://docs.gradle.org/current/userguide/userguide.html)
- [JEP 261: Module System](https://openjdk.org/jeps/261)
- [The Java Tutorials — Creating and Using Packages](https://docs.oracle.com/javase/tutorial/java/package/index.html)
- [Understanding Java 9 Modules — dev.java](https://dev.java/learn/modules/)
