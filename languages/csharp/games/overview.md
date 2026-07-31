---
type: concept
tags:
  - language
  - csharp
  - dotnet
  - overview
related:
  - languages/csharp/overview
  - languages/csharp/installation
  - languages/csharp/games/unity
  - languages/csharp/games/godot
  - languages/csharp/games/monogame
language: "csharp"
---

# C# for Game Development

> Why C# is one of the most widely used languages in games — the engine landscape, tooling, how to start, and notable titles.

---

## What is it?

C# is one of the most widely used languages in game development, largely because it is the scripting language of **Unity**, the most popular game engine in the world. "Using C# for games" usually means writing **gameplay logic** — player movement, rules, AI, UI — in C#, while an engine or framework handles rendering, input, audio, and physics.

C# does not build games on its own. You pair it with one of three main options: a full engine with a visual editor (**Unity**, **Godot**), or a code-first framework with no editor (**MonoGame**). Each is covered in its own article.

---

## Why does it matter?

C# hits a sweet spot for games: it is high-level and productive (garbage collection, rich standard library, great tooling) yet fast enough for most gameplay code. That combination lowers the barrier to entry compared with C++, the traditional engine language, while keeping enough performance for indie and even AAA titles.

The ecosystem is the real draw. Choosing C# means access to Unity's massive Asset Store and community, Godot's open-source freedom, or MonoGame's lineage of shipped commercial hits — plus mature IDEs and debuggers. For a developer who already knows C# from backend or desktop work, moving into games is mostly about learning an engine, not a new language.

---

## How it works

### The engine landscape

| Engine / Framework | Type | Best for |
|---|---|---|
| Unity | Full engine + visual editor | Mobile, indie to AAA, AR/VR, multiplatform |
| Godot (.NET build) | Open-source engine + editor | 2D and indie 3D, license-sensitive and open-source projects |
| MonoGame | Code-first framework (no editor) | Full control, 2D games, learning fundamentals |

All three run your gameplay code in C#. Unity and Godot add a visual editor where you compose scenes and attach C# scripts to objects; MonoGame gives you a bare `Game` loop and you build everything in code. See [Unity](unity.md), [Godot](godot.md), and [MonoGame](monogame.md) for each model.

### IDEs

- **Visual Studio** (Windows/Mac) — the traditional choice; deep Unity integration via the Visual Studio Tools for Unity, strong debugger.
- **JetBrains Rider** — very popular with Unity and Godot developers; first-class engine integrations, refactoring, and a fast debugger. Paid, but free for non-commercial use.
- **VS Code** — lightweight, cross-platform; works with the C# Dev Kit and engine-specific extensions. Common with Godot.

Engines also ship their own editors (Unity Editor, Godot Editor) for scenes and assets; the IDE handles the C# code and debugging alongside them.

### Getting started

1. Pick an engine/framework based on the table above (Unity is the safest default for beginners).
2. Install the engine and the **.NET SDK** (see [Installation](../installation.md)); for Unity, install via Unity Hub.
3. Install an IDE (Visual Studio, Rider, or VS Code) and its engine integration.
4. Create a starter project from the engine's templates, attach or write a first C# script, and run it.
5. Iterate: press play in the editor (or `dotnet run` for MonoGame) and see changes live.

### Strengths and weaknesses

**Strengths**

- Productive, safe, and readable compared with C++.
- Huge ecosystem (Unity Asset Store, tutorials, community).
- Excellent tooling and debugging.
- Cross-platform reach: mobile, desktop, console, web, AR/VR.

**Weaknesses**

- Garbage-collection pauses can matter for tight, allocation-heavy loops (mitigated with pooling and `struct`/`Span<T>`).
- For cutting-edge AAA engines, C++ still dominates the lowest levels.
- You depend on an engine's release cadence, licensing, and quirks.

---

## Examples

The "shape" of gameplay code in C# — a per-frame update that moves something over time. This is a Unity `MonoBehaviour`, but every engine has an equivalent update callback:

```csharp
using UnityEngine;

// Attached to a GameObject in the editor; runs every frame.
public class Mover : MonoBehaviour
{
    public float speed = 5f;

    void Update()
    {
        // Time.deltaTime keeps motion frame-rate independent.
        transform.Translate(Vector3.right * speed * Time.deltaTime);
    }
}
```

The engine calls `Update` once per frame; your C# decides what happens. Godot uses `_Process(double delta)` and MonoGame uses `Update(GameTime)` for the same idea.

---

## When to use

- You already know C# and want to build games without learning C++ first.
- You want a large ecosystem, ready-made assets, and strong tooling (Unity).
- You need an open-source, royalty-free engine (Godot).
- You want full, code-first control and to learn engine fundamentals (MonoGame).
- You are targeting mobile, desktop, console, or multiplatform indie games.

## When NOT to use

- You are building a bespoke, cutting-edge AAA engine where C++ control at the lowest level is required.
- You need hard real-time guarantees that a garbage-collected runtime cannot provide.
- Your team is standardized on a different engine/language and switching brings no benefit.
- The project is a tiny prototype better served by a lighter tool than a full engine.

## References

- Unity Technologies. [Unity Manual — Scripting](https://docs.unity3d.com/Manual/ScriptingSection.html). docs.unity3d.com.
- Godot Engine. [C# / .NET documentation](https://docs.godotengine.org/en/stable/tutorials/scripting/c_sharp/index.html). docs.godotengine.org.
- MonoGame. [MonoGame documentation](https://docs.monogame.net/). docs.monogame.net.
- Microsoft. [C# documentation](https://learn.microsoft.com/en-us/dotnet/csharp/). learn.microsoft.com.
