---
type: concept
tags:
  - language
  - java
  - backend
  - overview
related:
  - languages/java/paradigms
  - languages/java/concurrency
  - languages/java/java-patterns
language: "java"
---
# Java Overview

> Java is a statically typed, object-oriented language that compiles to portable bytecode and runs on the Java Virtual Machine, powering a vast share of the world's enterprise and backend systems.

---

## What is it?

Java is a general-purpose programming language created by James Gosling at Sun Microsystems and released in 1995. Its defining promise is "write once, run anywhere": source code compiles to platform-neutral **bytecode** that runs on any device with a Java Virtual Machine (JVM), instead of being compiled to a specific CPU's machine code.

Java is statically typed, class-based, and garbage collected. Since 2017 it follows a six-month release cadence, with a **Long-Term Support (LTS)** release every two years. The reference implementation is open source (OpenJDK), and Oracle plus vendors like Eclipse Adoptium, Amazon (Corretto), and Azul distribute production builds.

---

## Why does it matter?

Java occupies a rare position: it is simultaneously one of the oldest languages still in mainstream use and one of the most actively evolved. Three decades of backward compatibility mean code written for Java 5 typically still runs today, which is why banks, governments, and large enterprises standardized on it.

The value is not the language syntax — it is the **platform**:

- The **JVM** is one of the most sophisticated managed runtimes ever built, with a Just-In-Time (JIT) compiler that optimizes hot code paths at runtime and garbage collectors (G1, ZGC, Shenandoah) tuned for latency or throughput.
- The **ecosystem** — Spring, Jakarta EE, Hibernate, Maven, Gradle — is deep, mature, and battle-tested at scale.
- The language now evolves quickly: records, sealed classes, pattern matching, and virtual threads landed in the last few releases.

Any language that targets the JVM (Kotlin, Scala, Clojure, Groovy) inherits this platform, which is why the JVM matters beyond Java itself.

---

## What can you build with Java?

| Domain | Fit | Notes |
|---|---|---|
| Backend / enterprise services | ⭐ Strong | The core use case — Spring Boot, Jakarta EE, gRPC, messaging. Unmatched ecosystem depth. |
| Web APIs and microservices | ⭐ Strong | Spring Boot, Quarkus, Micronaut, Helidon; virtual threads simplify high-concurrency I/O. |
| Big data / streaming | ⭐ Strong | Hadoop, Spark, Kafka, Flink, and Elasticsearch all run on the JVM. |
| Android apps | 🟢 Solid | Fully supported, but Google now recommends **Kotlin** as the preferred Android language. |
| Cloud-native / containers | 🟢 Solid | Mature, though JVM startup and memory footprint need tuning; GraalVM native image helps. |
| Desktop GUI | 🟡 Evolving | JavaFX and Swing exist and are maintained, but the ecosystem trails web and native toolkits. |
| CLI tools / scripting | 🟠 Limited | JVM startup latency makes short-lived commands feel heavy; GraalVM native image mitigates it. |
| Data science / ML | 🟠 Limited | Python dominates; JVM libraries (DL4J, Tribuo) exist but are niche. |
| Systems / embedded programming | 🟠 Limited | Managed runtime and GC make it unsuitable for hard-real-time or bare-metal work. |

> Not the best fit for: hard-real-time systems, low-level systems programming, quick throwaway scripts, or data-science notebooks. Reach for C/C++/Rust, a shell/Python script, or Python respectively.

---

## Key highlights

**Platform independence via bytecode**
`javac` compiles `.java` to `.class` bytecode. The JVM interprets and JIT-compiles that bytecode on whatever platform it runs, so the same artifact runs on Linux, macOS, and Windows.

**The JVM and JIT compilation**
The HotSpot JVM starts by interpreting bytecode, profiles which methods run hot, then compiles those to optimized native code (tiered compilation, C1/C2). Long-running server processes reach performance competitive with statically compiled languages.

**Automatic memory management**
Multiple garbage collectors target different goals: **G1** (balanced default), **ZGC** and **Shenandoah** (sub-millisecond pauses on large heaps), and Serial/Parallel for throughput. GC is pluggable via JVM flags.

**Strong, static typing with modern ergonomics**
Records, sealed classes, `var` local inference, switch pattern matching, and text blocks have made recent Java far less verbose than its reputation suggests.

**Virtual threads (Project Loom)**
Finalized in Java 21 (JEP 444), virtual threads make blocking I/O cheap: a single JVM can run millions of them, letting straightforward blocking code scale like reactive code without the callback complexity.

**Backward compatibility**
Decades-old bytecode still runs on modern JVMs. This stability is a primary reason large organizations trust Java for long-lived systems.

---

## Ecosystem highlights

| Area | Notable tools and libraries |
|---|---|
| Web / microservice frameworks | Spring Boot, Quarkus, Micronaut, Helidon, Jakarta EE |
| Persistence | JDBC (stdlib), JPA/Hibernate, Spring Data JPA, jOOQ, MyBatis |
| Build tools | Maven, Gradle |
| Testing | JUnit 5, Mockito, AssertJ, Testcontainers, JMH (benchmarks) |
| Big data / streaming | Apache Spark, Kafka, Flink, Hadoop, Elasticsearch |
| Reactive | Project Reactor, RxJava, Akka |
| Observability | Micrometer, OpenTelemetry Java, JFR (Java Flight Recorder) |
| Native compilation | GraalVM Native Image |

---

## Versions worth knowing

| Version | Release | Notable features |
|---|---|---|
| Java 8 (LTS) | 2014 | Lambdas, Stream API, `java.time`, default methods — the release that modernized the language |
| Java 11 (LTS) | 2018 | First LTS after the new cadence; `var` in lambdas, HTTP client, single-file source launch |
| Java 17 (LTS) | 2021 | Sealed classes, records (finalized in 16), pattern matching for `instanceof`, text blocks |
| Java 21 (LTS) | 2023 | Virtual threads, pattern matching for `switch`, record patterns, sequenced collections |
| Java 25 (LTS) | 2025 | Latest LTS; continued Loom, pattern matching, and performance refinements |

> LTS releases (8, 11, 17, 21, 25) get years of updates and are what most organizations target. Non-LTS releases ship every six months and are best for testing new features.

---

## Design decisions worth knowing

**Everything (almost) is an object** — except the eight primitive types (`int`, `long`, `double`, etc.), all values are objects. Autoboxing bridges primitives and their wrapper classes.

**Checked exceptions** — Java is nearly unique in forcing callers to declare or handle certain exceptions at compile time. Divisive, but a deliberate reliability decision.

**Single inheritance of classes, multiple of interfaces** — a class extends exactly one superclass but can implement many interfaces (which can carry default methods).

**Type erasure for generics** — generic type parameters exist at compile time only; the JVM sees raw types at runtime. This preserved backward compatibility but limits reflection over generic types.

**No operator overloading, no unsigned integers, no free functions** — deliberate simplicity choices that keep code predictable (methods always live on a class).

---

## References

- [Java Documentation — Oracle](https://docs.oracle.com/en/java/javase/)
- [dev.java — Official Java learning portal](https://dev.java/)
- [OpenJDK](https://openjdk.org/)
- [The Java Language Specification](https://docs.oracle.com/javase/specs/)
- [JEP 444: Virtual Threads](https://openjdk.org/jeps/444)
- [Oracle Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)
- *Effective Java* — Joshua Bloch (3rd ed., Addison-Wesley, 2018)
