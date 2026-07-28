---
type: concept
tags:
  - language
  - csharp
  - dotnet
  - tool
related:
  - languages/csharp/overview
  - languages/csharp/project-setup
  - languages/csharp/toolchain
language: "csharp"
---
# Packages and NuGet

> NuGet is .NET's package manager; dependencies are declared as `<PackageReference>` entries in the project file and restored from nuget.org or a private feed.

---

## What is it?

**NuGet** is the package manager for .NET. A NuGet package (`.nupkg`) bundles compiled assemblies, content, and metadata. The public gallery **nuget.org** hosts the ecosystem's libraries; organizations can also run private feeds (Azure Artifacts, GitHub Packages, self-hosted).

Dependencies are declared inside the SDK-style project file (`.csproj`) as `<PackageReference>` items. The `dotnet` CLI (or Visual Studio) restores them into a global package cache and resolves the full dependency graph.

---

## Why does it matter?

NuGet is how nearly all C# code reuses libraries — from the ASP.NET Core framework packages to logging, serialization, and testing tools. Because references live in the project file as plain XML, dependencies are reviewable in version control and reproducible across machines and CI.

Understanding transitive resolution, version ranges, and lock files is what keeps builds deterministic and avoids "works on my machine" drift.

---

## How it works

### Declaring a dependency

A `PackageReference` in the `.csproj`:

```xml
<ItemGroup>
  <PackageReference Include="Serilog" Version="4.1.0" />
  <PackageReference Include="Dapper" Version="2.1.35" />
</ItemGroup>
```

Or add it from the CLI, which edits the file for you:

```bash
dotnet add package Serilog
dotnet add package Dapper --version 2.1.35
```

### Restoring

Restore downloads packages into the global cache (`~/.nuget/packages`) and computes the dependency graph. `dotnet build` and `dotnet run` restore automatically; you can also do it explicitly:

```bash
dotnet restore
```

### Transitive dependencies

You only declare your **direct** dependencies. NuGet pulls in their dependencies (transitive) automatically. To pin or override a transitive version, add a direct `PackageReference` for it.

### Central Package Management

For multi-project solutions, a single `Directory.Packages.props` file at the repo root defines every version once, and projects reference packages without a version:

```xml
<!-- Directory.Packages.props -->
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Serilog" Version="4.1.0" />
  </ItemGroup>
</Project>
```

```xml
<!-- any project .csproj -->
<PackageReference Include="Serilog" />
```

### Lock files for reproducibility

Enable a lock file to pin the exact resolved graph so CI restores identical versions:

```xml
<PropertyGroup>
  <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
</PropertyGroup>
```

This writes `packages.lock.json`; restore in CI with `dotnet restore --locked-mode` to fail if the graph would change.

### Project references

A `ProjectReference` links to another project in the same solution rather than a published package — the standard way to split a solution into layers:

```xml
<ItemGroup>
  <ProjectReference Include="../MyApp.Domain/MyApp.Domain.csproj" />
</ItemGroup>
```

### Auditing dependencies

Modern `dotnet` can report known vulnerabilities and outdated packages:

```bash
dotnet list package --vulnerable
dotnet list package --outdated
```

---

## Examples

Adding, listing, and updating packages for a web API project:

```bash
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package FluentValidation.AspNetCore

dotnet list package                 # show direct references and versions
dotnet list package --include-transitive
dotnet remove package FluentValidation.AspNetCore
```

Version ranges in the project file:

```xml
<PackageReference Include="Serilog" Version="4.*" />        <!-- highest 4.x -->
<PackageReference Include="Dapper" Version="[2.1.35]" />    <!-- exact, pinned -->
```

---

## When to use

- **`PackageReference`** for every external library — it is the only supported style for SDK-style projects.
- **Central Package Management** for any solution with more than a couple of projects, to keep versions aligned.
- **Lock files + `--locked-mode`** in CI for reproducible restores.
- **`ProjectReference`** to split a solution into layered projects.

---

## When NOT to use

- **Do not commit the `bin/` and `obj/` folders** — they are build output; restore regenerates them.
- **Do not float wide version ranges** (`*`) in production — pin versions or use a lock file so builds are reproducible.
- **Do not add a package just for a one-line helper** — every dependency is a maintenance and security surface; prefer the standard library when it suffices.
- **Do not ignore `dotnet list package --vulnerable`** — unpatched transitive packages are a common supply-chain risk.

---

## References

- [NuGet documentation — Microsoft Learn](https://learn.microsoft.com/en-us/nuget/)
- [PackageReference in project files — Microsoft Learn](https://learn.microsoft.com/en-us/nuget/consume-packages/package-references-in-project-files)
- [Central Package Management — Microsoft Learn](https://learn.microsoft.com/en-us/nuget/consume-packages/central-package-management)
- [Auditing package dependencies for security vulnerabilities — Microsoft Learn](https://learn.microsoft.com/en-us/nuget/concepts/auditing-packages)
