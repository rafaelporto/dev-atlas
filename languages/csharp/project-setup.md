---
type: how-to
tags:
  - language
  - csharp
  - backend
related:
  - languages/csharp/installation
  - languages/csharp/packages-and-nuget
  - languages/csharp/toolchain
language: "csharp"
---
# Project Setup

> How to scaffold a C# solution with the `dotnet` CLI, organize projects into layers, and wire up references and a test project.

---

## Prerequisites

- The .NET SDK installed and `dotnet` on your PATH (see [Installation](installation.md))
- A terminal and a text editor or IDE (see [IDEs and Editors](ides.md))

---

## Steps

### 1. Create a solution

A **solution** (`.sln`) groups related projects. Start with an empty one:

```bash
mkdir MyApp && cd MyApp
dotnet new sln --name MyApp
```

### 2. Create projects from templates

`dotnet new` scaffolds projects. List available templates with `dotnet new list`. Common ones:

```bash
# a web API
dotnet new webapi -o src/MyApp.Api

# a class library for domain logic
dotnet new classlib -o src/MyApp.Domain

# a console app
dotnet new console -o src/MyApp.Cli
```

Each command creates a directory with a `.csproj` project file — the SDK-style, MSBuild-based build definition.

### 3. Add projects to the solution

```bash
dotnet sln add src/MyApp.Api/MyApp.Api.csproj
dotnet sln add src/MyApp.Domain/MyApp.Domain.csproj
```

### 4. Reference one project from another

Layer the code by having the API depend on the domain, not the reverse:

```bash
dotnet add src/MyApp.Api/MyApp.Api.csproj \
  reference src/MyApp.Domain/MyApp.Domain.csproj
```

This adds a `<ProjectReference>` to the API's `.csproj`.

### 5. Add a test project

```bash
dotnet new xunit -o tests/MyApp.Tests
dotnet sln add tests/MyApp.Tests/MyApp.Tests.csproj
dotnet add tests/MyApp.Tests/MyApp.Tests.csproj \
  reference src/MyApp.Domain/MyApp.Domain.csproj
```

### 6. Understand the project file

An SDK-style `.csproj` is short and readable:

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Serilog" Version="4.1.0" />
  </ItemGroup>

</Project>
```

- `TargetFramework` — which .NET version to build against (`net10.0`).
- `Nullable` — enables nullable reference type checks (see [Types and Nullability](types-and-nullability.md)).
- `ImplicitUsings` — auto-imports common namespaces so you write fewer `using` lines.

### 7. Share settings across projects (optional)

A `Directory.Build.props` at the repo root applies MSBuild properties to every project, keeping settings consistent:

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
</Project>
```

---

## Verification

```bash
# Build every project in the solution
dotnet build

# Run the API
dotnet run --project src/MyApp.Api

# Run the tests
dotnet test
```

A typical resulting layout:

```
MyApp/
├── MyApp.sln
├── Directory.Build.props
├── src/
│   ├── MyApp.Api/        # web API
│   ├── MyApp.Domain/     # domain logic (referenced by Api)
│   └── MyApp.Cli/        # console entry point
└── tests/
    └── MyApp.Tests/      # xUnit tests
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `dotnet build` compiles but IDE shows errors | IDE using a different SDK, or stale cache | Restart the IDE; ensure it targets the same SDK as `dotnet --version` |
| Circular reference error | Two projects reference each other | Extract shared code into a third project both depend on |
| `The type or namespace could not be found` | Missing project or package reference | `dotnet add reference` / `dotnet add package` the dependency |
| Wrong target framework | `TargetFramework` doesn't match installed SDK | Set `TargetFramework` to an installed version or install that SDK |
| Test project can't see the code under test | No reference to the target project | `dotnet add reference` to the project being tested |

---

## References

- [dotnet new command — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-new)
- [Organize your project with solution files — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/tutorials/cli-templates-create-project-template)
- [Project file (.csproj) reference — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/overview)
- [Directory.Build.props — Microsoft Learn](https://learn.microsoft.com/en-us/visualstudio/msbuild/customize-by-directory)
