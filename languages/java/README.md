# Java

> A study guide covering Java's platform, core language, concurrency, patterns, data access, and toolchain.

---

## Overview & Philosophy

| Article | Description |
|---|---|
| [Overview](overview.md) | What Java and the JVM are, applicability by domain, ecosystem, versions, and design decisions |
| [Paradigms](paradigms.md) | Object-oriented core plus the functional style added by lambdas and streams |

---

## Core Language

| Article | Description |
|---|---|
| [Types and Generics](types-and-generics.md) | Type system, generics and wildcards, `var`, records, and sealed classes |
| [Error Handling](error-handling.md) | Checked vs unchecked exceptions, try-with-resources, exception chaining |
| [Collections and Streams](collections-and-streams.md) | The Collections Framework and the declarative Stream API |
| [Packages and Build](packages-and-build.md) | Packages, Maven vs Gradle, dependency scopes, and JPMS modules |

---

## Concurrency

| Article | Description |
|---|---|
| [Concurrency](concurrency.md) | Threads, executors, `CompletableFuture`, and virtual threads (Project Loom) |

---

## Patterns & Data

| Article | Description |
|---|---|
| [Java Patterns](java-patterns.md) | GoF patterns in Java plus modern idioms (builder, records-as-DTO, sealed hierarchies, DI) |
| [Databases and ORMs](databases-and-orms.md) | JDBC, JPA/Hibernate, Spring Data JPA, jOOQ — and when to choose ORM vs SQL-first |
| [Testing](testing.md) | JUnit 5, Mockito, AssertJ, and Testcontainers |

---

## Getting Started

| Article | Description |
|---|---|
| [Installation](installation.md) | Install a JDK, manage versions with SDKMAN!, and verify the setup |
| [Project Setup](project-setup.md) | Scaffold a Maven or Gradle project with the standard layout |
| [IDEs and Editors](ides.md) | IntelliJ IDEA, Eclipse, and VS Code compared |

---

## Toolchain & Deploy

| Article | Description |
|---|---|
| [Toolchain](toolchain.md) | `javac`, `java`, `jar`, `jshell`, formatters, and static analysis |
| [Deploy](deploy.md) | Build a runnable fat JAR and containerise it with a layered Docker image |

---

## CLI & Terminal

| Article | Description |
|---|---|
| [CLI & Terminal](cli/README.md) | Building CLI tools and TUIs in Java — picocli, GraalVM native image, and Lanterna |
