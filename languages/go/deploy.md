# Deploying a Go Application

> How to build a production-ready Go binary, containerise it with Docker, and pass configuration through environment variables.

---

## Prerequisites

- Go installed and a working module (`go.mod` present)
- Docker installed (for the container steps)
- Basic familiarity with the terminal and shell environment

---

## Steps

### 1. Build a production binary

`go build` produces a statically linked binary with no external runtime dependencies. This is Go's most important deployment property — the binary runs anywhere without installing Go or any library.

```bash
# Build for the current OS/architecture
go build -o bin/myapp ./cmd/myapp

# Strip debug info to reduce binary size (~30% smaller)
go build -ldflags="-s -w" -o bin/myapp ./cmd/myapp
```

| Flag | Effect |
|---|---|
| `-s` | Remove the symbol table |
| `-w` | Remove DWARF debug information |

---

### 2. Cross-compile for a different platform

Go cross-compilation requires only two environment variables — no toolchain changes.

```bash
# Build a Linux amd64 binary from macOS or Windows
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/myapp-linux ./cmd/myapp

# Build for Linux ARM64 (e.g. AWS Graviton, Apple Silicon servers)
GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o bin/myapp-linux-arm64 ./cmd/myapp
```

Common `GOOS`/`GOARCH` combinations:

| Target | GOOS | GOARCH |
|---|---|---|
| Linux x86-64 | `linux` | `amd64` |
| Linux ARM64 | `linux` | `arm64` |
| macOS Apple Silicon | `darwin` | `arm64` |
| Windows x86-64 | `windows` | `amd64` |

---

### 3. Pass configuration through environment variables

Hard-coding configuration is a deploy-time anti-pattern. Read all environment-specific values at startup using `os.Getenv` or a configuration library.

```go
// config/config.go
package config

import (
    "os"
    "strconv"
)

type Config struct {
    Port     string
    DBUrl    string
    LogLevel string
}

func Load() Config {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    return Config{
        Port:     port,
        DBUrl:    os.Getenv("DATABASE_URL"),
        LogLevel: os.Getenv("LOG_LEVEL"),
    }
}
```

Run locally with inline environment variables:

```bash
PORT=9090 DATABASE_URL=postgres://localhost/mydb go run ./cmd/myapp
```

---

### 4. Containerise with Docker

Go's static binary makes the container image minimal. The multi-stage build pattern compiles in a full Go image and copies only the binary into a scratch (empty) or distroless image.

```dockerfile
# Stage 1 — build
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /myapp ./cmd/myapp

# Stage 2 — run
FROM gcr.io/distroless/static-debian12

COPY --from=builder /myapp /myapp

EXPOSE 8080
ENTRYPOINT ["/myapp"]
```

Key points:
- `CGO_ENABLED=0` disables cgo, ensuring a fully static binary that works in `scratch`/distroless images.
- Copying `go.mod` and `go.sum` before the source code lets Docker cache the dependency layer — rebuilds only re-download modules when those files change.
- `distroless/static` contains only SSL certificates and timezone data. The resulting image is typically under 20 MB.

Build and run the image:

```bash
docker build -t myapp:latest .
docker run -p 8080:8080 -e DATABASE_URL=postgres://host/db myapp:latest
```

---

### 5. Embed build metadata

Inject version and commit information at build time using `-ldflags`. This lets the running binary report exactly what was deployed.

```go
// main.go
package main

import "fmt"

var (
    version = "dev"
    commit  = "none"
    date    = "unknown"
)

func main() {
    fmt.Printf("version=%s commit=%s built=%s\n", version, commit, date)
}
```

Pass values at build time:

```bash
go build \
  -ldflags="-X main.version=1.4.2 -X main.commit=$(git rev-parse --short HEAD) -X main.date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -o bin/myapp ./cmd/myapp
```

---

## Verification

```bash
# Confirm the binary runs on the target architecture
file bin/myapp-linux           # ELF 64-bit LSB executable, x86-64, statically linked
./bin/myapp --version          # should print version/commit info

# Confirm the Docker image starts correctly
docker run --rm -e PORT=8080 myapp:latest
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Binary crashes with `exec format error` | Wrong `GOARCH` for the target machine | Rebuild with the correct `GOOS`/`GOARCH` pair |
| `standard_init_linux.go: no such file or directory` in Docker | Binary dynamically linked (cgo enabled) in a scratch image | Set `CGO_ENABLED=0` during build |
| Container starts but config is wrong | `os.Getenv` read before env vars are set | Ensure `docker run -e` or Kubernetes `env:` are set correctly |
| Image rebuild re-downloads all modules | `COPY . .` before `go mod download` | Move `COPY go.mod go.sum` before source copy |
| `-ldflags` version vars not set | Package path is wrong | Use `-X <module-path>/main.version=...` matching your `go.mod` module path |

---

## References

- [go build — command reference](https://pkg.go.dev/cmd/go#hdr-Compile_packages_and_dependencies)
- [Distroless container images — Google](https://github.com/GoogleContainerTools/distroless)
- [The Twelve-Factor App — Config](https://12factor.net/config)
- [Go cross-compilation — go.dev](https://go.dev/doc/install/source#environment)
- [Multi-stage builds — Docker docs](https://docs.docker.com/build/building/multi-stage/)
