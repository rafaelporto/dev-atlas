---
type: concept
tags:
  - language
  - csharp
  - dotnet
related:
  - languages/csharp/games/overview
  - languages/csharp/games/unity
  - languages/csharp/games/godot
  - languages/csharp/overview
language: "csharp"
---

# MonoGame and C#

> A code-first C# framework with no visual editor — the successor to Microsoft XNA, built around a simple game loop.

---

## What is it?

MonoGame is a free, open-source **framework** — not an engine — for building games entirely in C#. There is no visual editor: you write the whole game in code, from the window and game loop to rendering and input. It is the open-source successor to Microsoft's **XNA Framework**, keeping a very similar API.

MonoGame gives you a thin, cross-platform layer over graphics, audio, and input, and gets out of the way. You are responsible for the architecture, which is why it appeals to developers who want full control and want to understand how a game actually runs. See the [C# for game development overview](overview.md) for how it compares with Unity and Godot.

---

## Why does it matter?

MonoGame trades convenience for control. Without an editor or built-in scene system, you learn and own the fundamentals — the game loop, rendering, collision, state — instead of relying on engine "magic." That clarity is a great way to learn game programming and a good fit when you want no framework opinions imposed on your design.

It is also battle-tested: several commercially successful games ship on MonoGame, proving the framework scales from learning projects to polished releases.

---

## How it works

### The Game class and loop

A MonoGame project centers on a class that inherits from `Game`. The framework drives a loop that calls a few methods in a fixed order:

```
Initialize()    → once, at startup: set up non-graphics state
LoadContent()   → once: load textures, sounds, fonts
Update(gameTime)→ every frame: input, physics, game logic
Draw(gameTime)  → every frame: render the current state
UnloadContent() → at shutdown: release resources
```

`gameTime` carries the elapsed time, which you use to keep movement frame-rate independent — the same idea as Unity's `Time.deltaTime` and Godot's `delta`.

### The Content Pipeline

Assets (images, audio, fonts) are processed by the **Content Pipeline** into an optimized runtime format, then loaded in `LoadContent` via a `ContentManager`. This build step is how MonoGame keeps assets efficient and cross-platform.

### XNA lineage

MonoGame reimplements the XNA 4 API, so older XNA tutorials and code often translate almost directly. That long lineage means a large body of learning material still applies.

---

## Examples

A minimal `Game` subclass showing the loop — clear the screen and update a position each frame:

```csharp
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;

public class MyGame : Game
{
    private readonly GraphicsDeviceManager _graphics;
    private Vector2 _position = Vector2.Zero;

    public MyGame()
    {
        _graphics = new GraphicsDeviceManager(this);
    }

    protected override void Update(GameTime gameTime)
    {
        float dt = (float)gameTime.ElapsedGameTime.TotalSeconds;
        _position.X += 100f * dt; // move 100 px/second
        base.Update(gameTime);
    }

    protected override void Draw(GameTime gameTime)
    {
        GraphicsDevice.Clear(Color.CornflowerBlue);
        // ... draw sprites at _position with a SpriteBatch ...
        base.Draw(gameTime);
    }
}
```

You start it from `Main` with `using var game = new MyGame(); game.Run();`.

---

## When to use

- You want full, code-first control over your game with no editor imposing structure.
- You are building 2D games (MonoGame's sweet spot).
- You want to learn game programming fundamentals — the loop, rendering, timing.
- You are comfortable designing your own architecture.

## When NOT to use

- You want a visual editor and a scene system out of the box (consider [Unity](unity.md) or [Godot](godot.md)).
- You need a large asset marketplace and drag-and-drop workflow.
- Your team wants fast prototyping without building foundations first.
- You need heavy 3D or built-in physics that an engine provides ready-made.

## References

- MonoGame. [MonoGame documentation](https://docs.monogame.net/). docs.monogame.net.
- MonoGame. [Your first game — the game loop](https://docs.monogame.net/articles/getting_started/index.html). docs.monogame.net.
- MonoGame. [What is the Content Pipeline?](https://docs.monogame.net/articles/getting_started/content_pipeline/index.html). docs.monogame.net.
