---
type: how-to
tags:
  - language
  - csharp
  - dotnet
  - backend
  - containerization
related:
  - languages/csharp/toolchain
  - languages/csharp/project-setup
  - languages/csharp/packages-and-nuget
language: "csharp"
---
# Deploying a .NET Application

> How to publish a C# app — framework-dependent, self-contained, or Native AOT — and package it as a container image with configuration passed through the environment.

---

## Prerequisites

- The .NET SDK installed and a working project (see [Project Setup](project-setup.md))
- Docker installed (for the container steps)
- Familiarity with the terminal

---

## Steps

### 1. Choose a publish mode

`dotnet publish` produces the deployable output. Three modes trade off image size, portability, and startup:

| Mode | Target needs .NET installed? | Size | Notes |
|---|---|---|---|
| **Framework-dependent** | Yes (runtime present) | Smallest | Default; relies on a shared runtime |
| **Self-contained** | No | Largest | Bundles the runtime with the app |
| **Native AOT** | No | Small, native | Compiles to a native binary; fastest startup, some limitations |

### 2. Publish framework-dependent (default)

Best when the target already has the matching .NET runtime (including most official base images):

```bash
dotnet publish -c Release -o out
```

### 3. Publish self-contained

Bundle the runtime so the target needs nothing installed. Specify a runtime identifier (RID):

```bash
dotnet publish -c Release -r linux-x64 --self-contained true -o out
```

Common RIDs: `linux-x64`, `linux-arm64`, `win-x64`, `osx-arm64`.

Trim unused code to shrink self-contained output:

```bash
dotnet publish -c Release -r linux-x64 --self-contained true \
  -p:PublishTrimmed=true -o out
```

### 4. Publish Native AOT (optional)

Native AOT compiles ahead of time to a self-contained native executable — the fastest startup and smallest memory footprint, ideal for containers and serverless. It requires opting in and has constraints (limited reflection, no runtime code generation).

Enable it in the `.csproj`:

```xml
<PropertyGroup>
  <PublishAot>true</PublishAot>
</PropertyGroup>
```

```bash
dotnet publish -c Release -r linux-x64 -o out
```

### 5. Pass configuration through the environment

.NET's configuration system reads environment variables automatically and binds them to the [Options pattern](csharp-patterns.md). Nested keys use `__` (double underscore) as the separator:

```bash
export ConnectionStrings__Default="Host=db;Database=app;Username=app"
export Logging__LogLevel__Default="Information"
export ASPNETCORE_URLS="http://+:8080"
```

Never hard-code environment-specific values or secrets in the image — inject them at run time.

### 6. Containerize

Use a multi-stage Dockerfile: build with the SDK image, run on the smaller runtime (or bare) image. This example is framework-dependent using the ASP.NET Core runtime image.

```dockerfile
# Stage 1 — build and publish
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# restore first for layer caching
COPY *.sln .
COPY src/MyApp.Api/*.csproj src/MyApp.Api/
RUN dotnet restore src/MyApp.Api/MyApp.Api.csproj

COPY . .
RUN dotnet publish src/MyApp.Api/MyApp.Api.csproj -c Release -o /app

# Stage 2 — run
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApp.Api.dll"]
```

Key points:

- Copying `.csproj` files and running `dotnet restore` *before* the full source lets Docker cache the restore layer — rebuilds only re-restore when dependencies change.
- Use `mcr.microsoft.com/dotnet/aspnet` for web apps, `runtime` for non-web apps.
- For self-contained or AOT builds, run on `mcr.microsoft.com/dotnet/runtime-deps` (or a distroless/`scratch`-style base) and copy the native binary instead of invoking `dotnet`.

### 7. Build and run the image

```bash
docker build -t myapp:latest .
docker run -p 8080:8080 \
  -e ConnectionStrings__Default="Host=db;Database=app;Username=app" \
  myapp:latest
```

> As an alternative to a Dockerfile, the SDK can build an image directly with `dotnet publish -t:PublishContainer` — no Docker daemon required for the build.

---

## Verification

```bash
# Confirm the published output runs
dotnet out/MyApp.Api.dll         # framework-dependent
./out/MyApp.Api                  # self-contained / AOT

# Confirm the container starts and serves traffic
docker run --rm -p 8080:8080 myapp:latest &
curl -sf http://localhost:8080/health && echo OK
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `You must install .NET to run this application` | Framework-dependent app on a host without the runtime | Use a runtime base image or publish self-contained |
| `exec format error` in container | Wrong RID for the target architecture | Publish with the correct `-r` (e.g. `linux-arm64`) |
| Config values ignored | Env var name doesn't match the key path | Use `Section__Key` with double underscores |
| Image rebuild re-restores every time | `COPY . .` before restoring | Copy `.csproj` files and `dotnet restore` before copying source |
| AOT build fails or app crashes on reflection | Library uses runtime reflection/codegen incompatible with AOT | Use framework-dependent/self-contained, or an AOT-compatible library |
| Container can't bind port | App listening on the wrong URL/port | Set `ASPNETCORE_URLS=http://+:8080` and `EXPOSE` it |

---

## References

- [dotnet publish — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-publish)
- [.NET application publishing overview — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/deploying/)
- [Native AOT deployment — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/)
- [Containerize a .NET app — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/docker/build-container)
- [Configuration in .NET — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/extensions/configuration)
