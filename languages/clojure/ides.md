---
type: concept
tags:
  - language
  - clojure
  - backend
related:
  - languages/clojure/toolchain
  - languages/clojure/testing
language: "clojure"
---
# IDEs and REPL-Driven Development in Clojure

> A comparison of the main Clojure editors — Emacs/CIDER, VS Code/Calva, IntelliJ/Cursive — all built around one workflow: a live REPL connected to your editor.

---

## What is it?

A Clojure development environment is, above all, an editor wired to a **running REPL**. Every serious Clojure tool connects to a live process (usually via the **nREPL** protocol) so you can evaluate the expression under the cursor, redefine a function, and inspect data *inside the running program* — without restarting it. The three dominant setups are **Emacs + CIDER**, **VS Code + Calva**, and **IntelliJ IDEA + Cursive**.

---

## Why does it matter?

Clojure is designed for interactive development. Instead of the edit–compile–run–read-logs loop, you keep one long-lived REPL and grow the program inside it: define a function, call it on real data, see the result, adjust, repeat. This tight feedback loop is the single biggest productivity difference from most other languages, and the editor's job is to make evaluating code frictionless. Choosing a tool is really choosing how comfortably you can drive that REPL.

Two features every Clojure editor must provide:

- **Structural (paredit) editing** — because code is nested parentheses, editors manipulate whole s-expressions (slurp, barf, wrap, splice) rather than characters, keeping parens balanced automatically.
- **Inline evaluation** — send a form to the REPL and see its value next to the code.

---

## Options

### VS Code + Calva

[Calva](https://calva.io) is the Clojure/ClojureScript extension for VS Code. It bundles an nREPL client, inline evaluation, paredit, a formatter, and a test runner.

**Pros:**
- Easiest on-ramp — install one extension, "Jack-in" starts a REPL and connects automatically
- Free and open source; familiar VS Code UX
- Good paredit and inline evaluation out of the box
- Works uniformly across Clojure, ClojureScript, and babashka

**Cons:**
- Fewer deep refactorings than Cursive
- Heavier than Emacs/Neovim for very large sessions
- Relies on `clojure-lsp` for navigation, which occasionally lags on huge codebases

**Best for:** newcomers to Clojure, and developers already living in VS Code.

---

### Emacs + CIDER

[CIDER](https://cider.mx) is the original and most powerful Clojure environment, deeply integrated with Emacs. Combined with `clojure-mode` and `paredit`/`smartparens`, it offers the richest REPL interaction available.

**Pros:**
- The most complete REPL integration — debugger, inspector, macroexpansion, test runner, profiling hooks
- Fully keyboard-driven and endlessly customizable (Emacs Lisp)
- Mature, battle-tested, and the reference implementation many features originate in

**Cons:**
- Steep learning curve if you do not already use Emacs
- Configuration effort is significant (though `doom-emacs`/`spacemacs` help)
- The Emacs mental model is unfamiliar to most developers

**Best for:** developers already fluent in Emacs, or those who want maximum control and the deepest REPL tooling.

---

### IntelliJ IDEA + Cursive

[Cursive](https://cursive-ide.com) is a full Clojure IDE built as an IntelliJ plugin. It brings JetBrains-grade static analysis, navigation, and refactoring to Clojure.

**Pros:**
- Best static analysis and refactoring (rename, extract, find usages) of the three
- Excellent for mixed Java/Clojure codebases — full IntelliJ Java tooling alongside Clojure
- Strong structural editing and a polished debugger
- GUI-driven; approachable for developers from Java/Kotlin backgrounds

**Cons:**
- Paid licence for commercial use (free for non-commercial/personal use)
- Heaviest memory footprint; slower startup than Emacs/VS Code
- Some REPL features feel less immediate than CIDER's

**Best for:** teams already on IntelliJ, JVM polyglot projects, and developers who want IDE-grade refactoring.

---

### Neovim (Conjure)

Worth noting: [Conjure](https://github.com/Olical/conjure) brings interactive nREPL evaluation to Neovim, pairing well with a Lisp paredit plugin. It suits developers already committed to a Vim-based, minimal-footprint setup.

---

## Comparison table

| | VS Code + Calva | Emacs + CIDER | IntelliJ + Cursive |
|---|---|---|---|
| Cost | Free | Free | Free (non-commercial), paid (commercial) |
| Setup effort | Low | High | Low–Medium |
| REPL integration | Very good | Excellent (deepest) | Very good |
| Refactoring | Good (via clojure-lsp) | Good | Excellent |
| Paredit / structural editing | Yes | Yes (reference) | Yes |
| Memory footprint | Medium | Low | High |
| Best audience | Newcomers, VS Code users | Emacs users, power users | JetBrains users, Java+Clojure |

---

## How the REPL workflow looks

Regardless of editor, the loop is the same:

1. **Jack-in / connect** — the editor starts (or attaches to) an nREPL server on the project's classpath.
2. **Evaluate a form** — place the cursor on an expression and press the eval key; the value appears inline.
3. **Redefine live** — re-evaluate a changed `defn`; subsequent calls use the new definition immediately.
4. **Inspect data** — send a value to the inspector or just print it; results are Clojure data you can drill into.
5. **Run tests** — evaluate/run a `deftest` or namespace without leaving the editor.

---

## When to use

- **Calva** — starting out with Clojure, or already a VS Code user who wants the shortest path to a working REPL.
- **CIDER** — you use Emacs and want the deepest, most extensible tooling.
- **Cursive** — you want IDE-grade refactoring, or work in a mixed Java/Clojure codebase on IntelliJ.
- Any editor is fine as long as it gives you **inline evaluation** and **paredit**.

## When NOT to use

- Do not edit Clojure in a plain editor without paredit — unbalanced parens will constantly slow you down.
- Do not work without a connected REPL — you lose the interactive feedback loop that makes Clojure productive.
- Do not adopt Emacs/CIDER on a deadline if you have never used Emacs — the ramp-up will cost more than it saves initially.

---

## References

- [Calva — official site](https://calva.io)
- [CIDER — official documentation](https://docs.cider.mx/)
- [Cursive — official site](https://cursive-ide.com)
- [Conjure — GitHub](https://github.com/Olical/conjure)
- [Clojure — Programming at the REPL](https://clojure.org/guides/repl/introduction)
- [nREPL — official site](https://nrepl.org/)
