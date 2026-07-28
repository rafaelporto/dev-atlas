---
type: how-to
tags:
  - language
  - java
  - backend
  - containerization
related:
  - languages/java/packages-and-build
  - languages/java/toolchain
  - languages/java/project-setup
language: "java"
---
# Deploying a Java Application

> How to package a Java application as a runnable "fat" JAR and containerise it with an efficient, layered Docker image.

---

## Prerequisites

- A JDK installed and a working Maven or Gradle project (see [Project Setup](project-setup.md))
- Docker installed (for the container steps)
- An application with a `main` method as its entry point

---

## Steps

### 1. Build a runnable (fat) JAR

A plain JAR from `mvn package` contains only your classes — not its dependencies. For a self-contained artifact you build a **fat/uber JAR** that bundles everything, so `java -jar app.jar` runs without a classpath.

**Maven** — use the Shade plugin:

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-shade-plugin</artifactId>
      <version>3.5.1</version>
      <executions>
        <execution>
          <phase>package</phase>
          <goals><goal>shade</goal></goals>
          <configuration>
            <transformers>
              <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                <mainClass>com.example.App</mainClass>
              </transformer>
            </transformers>
          </configuration>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

```bash
mvn package
java -jar target/my-app-1.0.0.jar
```

**Gradle** — use the Shadow plugin:

```kotlin
plugins {
    application
    id("com.gradleup.shadow") version "8.3.0"
}

application { mainClass = "com.example.App" }
```

```bash
./gradlew shadowJar
java -jar build/libs/my-app-1.0.0-all.jar
```

> Spring Boot projects skip this: `spring-boot-maven-plugin` / the Gradle Boot plugin already produce a runnable fat JAR via `bootJar`.

### 2. Read configuration from the environment

Do not hard-code environment-specific values. Read them at startup so the same artifact runs in every environment.

```java
public record Config(int port, String dbUrl, String logLevel) {
    public static Config fromEnv() {
        return new Config(
            Integer.parseInt(System.getenv().getOrDefault("PORT", "8080")),
            System.getenv("DATABASE_URL"),
            System.getenv().getOrDefault("LOG_LEVEL", "INFO"));
    }
}
```

```bash
PORT=9090 DATABASE_URL=jdbc:postgresql://localhost/mydb java -jar app.jar
```

### 3. Write a multi-stage Dockerfile

Build in a full JDK image, then run on a smaller JRE-style runtime. A multi-stage build keeps the final image free of build tools and source.

```dockerfile
# Stage 1 — build
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app

# Copy build files first so dependency layers cache across code changes
COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B package -DskipTests

# Stage 2 — run
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Key points:
- A separate **JRE** runtime stage produces a smaller image than shipping the full JDK.
- Copying `pom.xml` and resolving dependencies before copying `src` lets Docker cache the dependency layer — code changes no longer re-download dependencies.
- For a still-smaller footprint, use a `-jre-alpine` tag or a distroless Java base image.

### 4. Build and run the container

```bash
docker build -t my-app:latest .
docker run -p 8080:8080 -e DATABASE_URL=jdbc:postgresql://host/db my-app:latest
```

### 5. (Optional) Tune the JVM for containers

Modern JVMs are container-aware and honor cgroup memory limits, but you can set explicit bounds and pick a GC.

```dockerfile
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

| Flag | Effect |
|---|---|
| `-XX:MaxRAMPercentage=75.0` | Cap heap at 75% of the container's memory limit |
| `-XX:+UseG1GC` | Balanced default collector (implicit on modern JDKs) |
| `-XX:+UseZGC` | Low-pause collector for large heaps |

---

## Verification

```bash
# The fat JAR runs standalone
java -jar target/my-app-1.0.0.jar

# Inspect the built image size
docker images my-app:latest

# The container starts and serves
docker run --rm -p 8080:8080 my-app:latest
curl localhost:8080/health
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `no main manifest attribute` when running the JAR | Fat-JAR plugin missing or `mainClass` unset | Configure Shade/Shadow (or Spring Boot plugin) with the main class |
| `ClassNotFoundException` at runtime | Plain JAR without bundled dependencies | Build a fat JAR, or supply the full classpath |
| Container OOM-killed | Heap sized above the container limit | Set `-XX:MaxRAMPercentage` or `-Xmx` below the limit |
| `UnsupportedClassVersionError` | Runtime JDK older than the compile JDK | Match the runtime image major version to the compile target |
| Image rebuild re-downloads all dependencies | `COPY src` before dependency resolution | Copy `pom.xml`/build files and resolve deps before copying sources |

---

## References

- [Apache Maven Shade Plugin](https://maven.apache.org/plugins/maven-shade-plugin/)
- [Gradle Shadow plugin](https://gradleup.com/shadow/)
- [Eclipse Temurin container images](https://hub.docker.com/_/eclipse-temurin)
- [Containerizing Java — Docker docs](https://docs.docker.com/language/java/)
- [The Twelve-Factor App — Config](https://12factor.net/config)
- [JVM container awareness — OpenJDK](https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html)
