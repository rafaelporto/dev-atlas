---
type: concept
tags:
  - language
  - csharp
  - dotnet
related:
  - languages/csharp/games/overview
  - languages/csharp/games/unity
  - languages/csharp/games/monogame
  - languages/csharp/overview
language: "csharp"
---

# Godot and C#

> An open-source, royalty-free game engine with a .NET build — nodes, scenes, and C# as a first-class-supported language alongside GDScript.

---

## What is it?

Godot is a free, open-source (MIT-licensed) game engine with a visual editor. Its **.NET build** lets you write gameplay in C# instead of, or alongside, Godot's own scripting language, **GDScript**. You compose scenes from nodes in the editor and attach C# scripts to them.

Godot is the leading open-source alternative to Unity, especially strong for 2D and indie 3D games. Because it is MIT-licensed, there are no royalties or licensing fees regardless of how successful your game becomes. See the [C# for game development overview](overview.md) for how it compares with Unity and MonoGame.

---

## Why does it matter?

Godot's licensing is its headline advantage: fully open-source and royalty-free, with no revenue thresholds or per-seat costs. The editor is lightweight and the engine is small, which makes it fast to install and pleasant to iterate in.

For C# developers, the .NET build means you can bring the language and tooling you know to a free engine. The trade-off is that GDScript, not C#, is Godot's "native" first-class language — most examples and community content assume GDScript — so C# support, while solid, has a smaller community.

---

## How it works

### Nodes and scenes

A Godot game is built from **nodes** arranged in a tree. Each node does one thing (a sprite, a collision shape, a camera, an audio player). A **scene** is a reusable tree of nodes — a player, an enemy, a whole level — and scenes can be nested inside other scenes. This composition model is Godot's core idea.

### C# scripts on nodes

A C# script is a class that extends a node type (`Node`, `Node2D`, `Node3D`, etc.) and is attached to a node in the editor. Godot calls lifecycle methods on it, the two most common being:

- **`_Ready()`** — called once when the node enters the scene tree (initialization).
- **`_Process(double delta)`** — called every frame; `delta` is the seconds since the last frame.

There is also `_PhysicsProcess(double delta)` for physics-step logic, mirroring Unity's `FixedUpdate`.

> You need the **.NET / Mono edition** of Godot (a separate download from the standard build) to use C#.

### C# vs GDScript

GDScript is Godot's built-in, Python-like language and its first-class citizen: most documentation, tutorials, and community assets use it. C# is fully supported and a better fit for larger codebases, teams already on .NET, or performance-sensitive logic — but expect fewer C#-specific examples.

---

## Examples

A C# node script that moves its 2D node every frame, frame-rate independent:

```csharp
using Godot;

// Attached to a Node2D in the editor.
public partial class Mover : Node2D
{
    private float _speed = 200f; // pixels per second

    public override void _Ready()
    {
        GD.Print("Mover ready");
    }

    public override void _Process(double delta)
    {
        // Multiply by delta so movement is per-second, not per-frame.
        Position += new Vector2(_speed * (float)delta, 0);
    }
}
```

Attach this to a `Node2D`, run the scene, and the node slides to the right.

---

## When to use

- You need a fully open-source, royalty-free engine with no licensing costs.
- You are building 2D or indie 3D games.
- You want a small, fast, lightweight editor.
- Your team prefers .NET and wants an alternative to Unity.

## When NOT to use

- You need the largest ecosystem and Asset Store (consider [Unity](unity.md)).
- You want a code-first framework with no editor at all (consider [MonoGame](monogame.md)).
- Your project depends heavily on C#-specific tutorials and community assets — the Godot C# community is smaller than GDScript's.
- You need mature, first-party console-export tooling that some commercial engines provide.

## References

- Godot Engine. [C# / .NET documentation](https://docs.godotengine.org/en/stable/tutorials/scripting/c_sharp/index.html). docs.godotengine.org.
- Godot Engine. [Nodes and scenes](https://docs.godotengine.org/en/stable/getting_started/step_by_step/nodes_and_scenes.html). docs.godotengine.org.
- Godot Engine. [Godot documentation](https://docs.godotengine.org/en/stable/). docs.godotengine.org.
