---
type: concept
tags:
  - language
  - csharp
  - dotnet
  - webassembly
  - frontend
related:
  - languages/csharp/overview
  - software-engineering/architecture/frontend/webassembly
  - languages/javascript/webassembly
  - languages/go/webassembly
language: "csharp"
---

# C# and WebAssembly

> Running C# in the browser via Blazor WebAssembly — the .NET runtime compiled to Wasm, building interactive UIs in C#, and interoperating with JavaScript.

---

## What is it?

C# runs in the browser through **WebAssembly** primarily via **Blazor WebAssembly** — a Microsoft framework that ships a **.NET runtime compiled to Wasm** to the browser, then runs your C# application code on it. You build components (UI) in C# and Razor markup instead of JavaScript, and the framework drives the DOM through a JavaScript interop layer. Beyond Blazor, .NET also supports standalone **`wasm` workloads** for running .NET code as a Wasm module. See the [WebAssembly architecture article](../../software-engineering/architecture/frontend/webassembly.md) for Wasm fundamentals.

---

## Why does it matter?

Blazor WebAssembly lets .NET teams build rich client-side web apps in **C#, end to end** — sharing models, validation, and logic between server and browser with a single language and type system. This eliminates the C#-backend / JavaScript-frontend split for teams standardized on .NET. The historic trade-off is **download size and startup**: the .NET runtime plus your assemblies must reach the browser. Modern .NET mitigates this with runtime relinking, IL trimming, and **ahead-of-time (AOT) compilation** to Wasm for compute-heavy paths, though AOT increases download size in exchange for faster execution.

---

## How it works

### The Blazor WebAssembly model

```
   ┌──────────────────────── browser ─────────────────────────┐
   │  .NET runtime (compiled to Wasm)                          │
   │      runs your C# assemblies (.dll)                        │
   │           │  renders / diffs                               │
   │           ▼                                                │
   │  Blazor render tree ──(JS interop)──► DOM                  │
   └───────────────────────────────────────────────────────────┘
```

The .NET runtime executes your compiled C# in the Wasm sandbox. Blazor maintains a render tree and updates the real DOM through JavaScript interop — C#, like all Wasm, cannot touch the DOM directly.

### A component (Razor + C#)

```razor
@* Counter.razor *@
<h1>Counter</h1>
<p>Current count: @currentCount</p>
<button class="btn" @onclick="IncrementCount">Click me</button>

@code {
    private int currentCount = 0;

    private void IncrementCount()
    {
        currentCount++; // C# event handler; Blazor re-renders the affected DOM
    }
}
```

Markup and C# live together; `@onclick` binds a DOM event to a C# method, and Blazor updates only what changed.

### Project setup

```bash
# Create and run a standalone Blazor WebAssembly app
dotnet new blazorwasm -o MyApp
cd MyApp
dotnet run
```

### JavaScript interop

C# calls JavaScript through `IJSRuntime`, and JS can call back into C# via `[JSInvokable]`:

```csharp
// Call a JS function from C#
public class ClipboardService(IJSRuntime js)
{
    public async Task CopyAsync(string text) =>
        await js.InvokeVoidAsync("navigator.clipboard.writeText", text);
}
```

```csharp
// Expose a C# method to JavaScript
public class Interop
{
    [JSInvokable]
    public static string FormatName(string first, string last) => $"{first} {last}";
}
```

```javascript
// invoke the C# method from JS
const name = await DotNet.invokeMethodAsync('MyApp', 'FormatName', 'Ada', 'Lovelace');
```

As always, interop crosses the sandbox boundary — prefer coarse-grained calls over chatty ones.

### AOT compilation

By default Blazor uses an IL interpreter running on the Wasm runtime. For CPU-bound hot paths you can enable **AOT**, compiling C# directly to Wasm for near-native speed at the cost of a larger download:

```xml
<!-- MyApp.csproj -->
<PropertyGroup>
  <RunAOTCompilation>true</RunAOTCompilation>
</PropertyGroup>
```

---

## Examples

Sharing a validated model between a .NET backend and the Blazor client — the same C# type and data annotations run in both:

```csharp
// In a shared class library referenced by both server and Blazor client
public class SignupModel
{
    [Required] public string Name { get; set; } = "";
    [Range(18, 120)] public int Age { get; set; }
}
```

The Blazor `EditForm` validates against the same annotations the server uses — no duplicated validation logic.

---

## When to use

- .NET teams building rich, interactive client-side web apps who want C# end to end and shared code with the server.
- Line-of-business and enterprise apps where the .NET ecosystem, tooling, and type sharing outweigh bundle-size concerns.
- Compute-heavy client logic that benefits from AOT-compiled C# in the browser.

## When NOT to use

- Public, size- and startup-sensitive sites where shipping the .NET runtime is too heavy — consider Blazor Server, SSR, or a JS framework.
- Simple sites or widgets that don't justify a full runtime download.
- DOM-intensive micro-interactions where the JS interop overhead negates the benefit.

## References

- Microsoft. [ASP.NET Core Blazor hosting models — WebAssembly](https://learn.microsoft.com/aspnet/core/blazor/hosting-models). learn.microsoft.com.
- Microsoft. [Call JavaScript from .NET / .NET from JavaScript in Blazor](https://learn.microsoft.com/aspnet/core/blazor/javascript-interoperability/). learn.microsoft.com.
- Microsoft. [ASP.NET Core Blazor WebAssembly build tools and AOT](https://learn.microsoft.com/aspnet/core/blazor/tooling/webassembly). learn.microsoft.com.
