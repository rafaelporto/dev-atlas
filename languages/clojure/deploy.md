---
type: how-to
tags:
  - language
  - clojure
  - backend
  - containerization
related:
  - languages/clojure/toolchain
  - languages/clojure/namespaces-and-deps
language: "clojure"
---
# Deploying a Clojure Application

> How to build a self-contained uberjar with `tools.build`, run it on any JVM, containerise it with Docker, and pass configuration through the environment.

---

## Prerequisites

- A JDK and the Clojure CLI installed (`clj --version` prints a result)
- A working `deps.edn` project with an entry namespace (`-main`)
- Docker installed (for the container steps)
- Basic familiarity with the terminal

---

## Steps

### 1. Add an AOT-compiled entry point

An uberjar needs a `main` class. Mark your entry namespace with `(:gen-class)` and give it a `-main`:

```clojure
(ns my.app.core
  (:gen-class))

(defn -main [& _args]
  (println "starting on port" (or (System/getenv "PORT") "8080"))
  ;; start server, block, etc.
  )
```

---

### 2. Configure tools.build

Add a `:build` alias and a `build.clj` that assembles an uberjar (a single jar containing your code plus all dependencies).

```clojure
;; deps.edn (excerpt)
:aliases
{:build {:deps {io.github.clojure/tools.build {:mvn/version "0.10.5"}}
         :ns-default build}}
```

```clojure
;; build.clj
(ns build
  (:require [clojure.tools.build.api :as b]))

(def class-dir "target/classes")
(def uber-file "target/app-standalone.jar")
(def basis (b/create-basis {:project "deps.edn"}))

(defn clean [_]
  (b/delete {:path "target"}))

(defn uber [_]
  (clean nil)
  (b/copy-dir {:src-dirs ["src" "resources"] :target-dir class-dir})
  (b/compile-clj {:basis basis :src-dirs ["src"] :class-dir class-dir})
  (b/uber {:class-dir class-dir
           :uber-file uber-file
           :basis basis
           :main 'my.app.core}))       ;; the AOT'd entry namespace
```

---

### 3. Build the uberjar

```bash
clj -T:build uber
```

This produces `target/app-standalone.jar` — a single artifact you can run on any machine with a compatible JRE, no Clojure installation required:

```bash
java -jar target/app-standalone.jar
```

The uberjar is Clojure's equivalent of a self-contained deployable: one file, plus a JVM.

---

### 4. Pass configuration through environment variables

Read environment-specific values at startup rather than hardcoding them. Environment variables are read with `System/getenv`; keep config in one place.

```clojure
(ns my.app.config)

(defn load-config []
  {:port     (Integer/parseInt (or (System/getenv "PORT") "8080"))
   :db-url   (System/getenv "DATABASE_URL")
   :log-level (keyword (or (System/getenv "LOG_LEVEL") "info"))})
```

Run locally with inline variables:

```bash
PORT=9090 DATABASE_URL=jdbc:postgresql://localhost/app \
  java -jar target/app-standalone.jar
```

Many teams keep defaults in an EDN file on the classpath (`resources/config.edn`) and override with env vars via a library such as `aero` or `cprop`.

---

### 5. Containerise with Docker

A multi-stage build compiles the uberjar in a full build image, then copies only the jar into a slim JRE runtime image.

```dockerfile
# Stage 1 — build the uberjar
FROM clojure:temurin-21-tools-deps AS builder
WORKDIR /app

# Cache deps: copy deps.edn first, prefetch, then copy source
COPY deps.edn build.clj ./
RUN clojure -P -T:build 2>/dev/null || true
COPY . .
RUN clojure -T:build uber

# Stage 2 — minimal runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/app-standalone.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

Key points:
- Copying `deps.edn` before the source lets Docker cache the dependency layer — rebuilds re-download deps only when `deps.edn` changes.
- The runtime image is a **JRE**, not a full JDK, and Alpine keeps it small.
- Clojure produces JVM bytecode, so — unlike Go — the container must ship a JVM; expect an image in the ~150–250 MB range rather than tens of MB.

Build and run:

```bash
docker build -t myapp:latest .
docker run -p 8080:8080 -e DATABASE_URL=jdbc:postgresql://host/db myapp:latest
```

---

### 6. Tune the JVM for containers

Modern JVMs are container-aware, but it is good practice to be explicit about memory:

```dockerfile
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
```

`-XX:MaxRAMPercentage` sizes the heap as a fraction of the container's memory limit, which is safer than a fixed `-Xmx` across environments.

---

## Verification

```bash
# The jar runs standalone
java -jar target/app-standalone.jar

# Inspect the main class recorded in the jar manifest
unzip -p target/app-standalone.jar META-INF/MANIFEST.MF | grep Main-Class

# The container starts and serves
docker run --rm -p 8080:8080 -e PORT=8080 myapp:latest
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `no main manifest attribute` when running the jar | `:main` not set in `b/uber`, or namespace lacks `(:gen-class)` | Set `:main` in `build.clj` and add `(:gen-class)` to the entry ns |
| `ClassNotFoundException` for your `-main` ns | Namespace not AOT-compiled into the jar | Ensure `b/compile-clj` runs before `b/uber` and includes `src` |
| Docker rebuild re-downloads all deps every time | Source copied before dependency prefetch | Copy `deps.edn` and run `clojure -P` before `COPY . .` |
| Container OOM-killed | Heap not sized to the container limit | Add `-XX:MaxRAMPercentage=75` (or set `-Xmx`) |
| Config values missing at runtime | Env vars not passed to the container | Use `docker run -e KEY=value` or the orchestrator's env config |
| Slow startup | JVM + Clojure runtime init | Expected; for fast-start scripts consider babashka instead |

---

## References

- [tools.build — official guide](https://clojure.org/guides/tools_build)
- [clojure — official Docker images](https://hub.docker.com/_/clojure)
- [Eclipse Temurin — Docker images](https://hub.docker.com/_/eclipse-temurin)
- [The Twelve-Factor App — Config](https://12factor.net/config)
- [Docker — Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
