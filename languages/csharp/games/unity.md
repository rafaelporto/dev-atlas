---
type: concept
tags:
  - language
  - csharp
  - dotnet
related:
  - languages/csharp/games/overview
  - languages/csharp/games/godot
  - languages/csharp/games/monogame
  - languages/csharp/overview
language: "csharp"
---

# Unity and C#

> The most popular game engine in the world, with C# as its scripting language — GameObjects, components, and the MonoBehaviour lifecycle.

---

## What is it?

Unity is a cross-platform game engine with a visual editor, and **C# is the language you write gameplay in**. You compose scenes in the editor by placing objects and attaching C# scripts to them; the engine handles rendering, physics, input, and audio, while your scripts define behavior.

Unity is the most common entry point into C# game development. Its scale — mobile, desktop, console, web, and AR/VR from one project — and its Asset Store make it the default choice for many indie and studio teams. See the [C# for game development overview](overview.md) for how it compares with Godot and MonoGame.

---

## Why does it matter?

Unity's reach and ecosystem are hard to match. A single project can ship to dozens of platforms, and the Asset Store, tutorials, and community mean most problems already have a documented solution. For a C# developer, that means the language you know is the language of a huge slice of the games industry.

It is also approachable: the editor lets you build and iterate visually, pressing "play" to test instantly, while your logic lives in ordinary C# classes you can debug in Visual Studio or Rider.

---

## How it works

### GameObjects and components

A Unity scene is a tree of **GameObjects**. A GameObject is mostly empty by itself — its behavior comes from **components** attached to it (a renderer, a collider, a rigidbody, and your C# scripts). This is composition over inheritance: you build objects by combining components rather than deep class hierarchies.

Your C# scripts are components too — each one derives from `MonoBehaviour` and is attached to a GameObject in the editor.

### The MonoBehaviour lifecycle

Unity calls specific methods on your `MonoBehaviour` at defined points. The most common, in order:

```
Awake        → once, when the object loads (set up references)
OnEnable     → each time the object becomes active
Start        → once, before the first frame (initialization)
Update       → every frame (gameplay logic)
FixedUpdate  → every physics step (physics logic)
LateUpdate   → every frame, after all Updates (e.g. camera follow)
OnDisable    → when the object is disabled
OnDestroy    → when the object is destroyed (cleanup)
```

You override only the ones you need. `Update` is where most per-frame gameplay goes; `FixedUpdate` is for physics.

---

## Examples

A small `MonoBehaviour` that reads input and moves its GameObject, frame-rate independent:

```csharp
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    public float speed = 5f;

    void Update()
    {
        // Built-in axes: arrow keys / WASD / gamepad stick.
        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");

        var move = new Vector3(horizontal, 0f, vertical);
        // Multiply by deltaTime so speed is per-second, not per-frame.
        transform.Translate(move * speed * Time.deltaTime);
    }
}
```

Attach this script to a GameObject in the editor, press play, and the object moves with input.

---

## When to use

- You want the widest platform reach from a single project (mobile, console, desktop, web, AR/VR).
- You value a mature ecosystem, Asset Store, and large community.
- You are new to game development and want a visual editor with instant iteration.
- Your team already knows C#.

## When NOT to use

- You need a fully open-source, royalty-free engine (consider [Godot](godot.md)).
- You want minimal, code-first control with no editor (consider [MonoGame](monogame.md)).
- You are building a bespoke AAA engine where C++ at the lowest level is required.
- Your game is a tiny prototype that a full engine would over-serve.

## References

- Unity Technologies. [Unity Manual — Scripting](https://docs.unity3d.com/Manual/ScriptingSection.html). docs.unity3d.com.
- Unity Technologies. [Order of execution for event functions (MonoBehaviour lifecycle)](https://docs.unity3d.com/Manual/ExecutionOrder.html). docs.unity3d.com.
- Unity Technologies. [GameObjects](https://docs.unity3d.com/Manual/GameObjects.html). docs.unity3d.com.
