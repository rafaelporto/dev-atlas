---
type: concept
tags:
  - architecture
  - frontend
  - styling
  - css
  - micro-frontends
related:
  - software-engineering/architecture/frontend/micro-frontends
  - software-engineering/architecture/frontend/design-system-architecture
  - software-engineering/architecture/frontend/component-driven-architecture
  - languages/javascript-typescript/frameworks/react/styling
  - languages/css/css-modules-and-scoped-styles
  - software-engineering/architecture/frontend/styling/design-tokens
  - software-engineering/architecture/frontend/styling/css-architecture-and-organization
language: null
---

# Styling Micro-Frontends

> Independently deployed frontends share one document and therefore one cascade — isolate each team's CSS by construction, share only tokens as a runtime contract, and give exactly one owner the global reset.

---

## What is it?

When several teams build separate parts of one web page and deploy them independently, all of their stylesheets still end up in the same browser document. Styling micro-frontends is the set of decisions that stop those stylesheets from breaking each other while keeping the page looking like one product.

[Micro-Frontends](../micro-frontends.md) covers the composition models (build-time packages, server-side composition, Module Federation, iframes, Web Components). This article covers the CSS consequences of each and the strategies for isolation and sharing.

---

## Why does it matter?

As Cam Jackson puts it in his martinfowler.com article, CSS is "inherently global, inheriting, and cascading, traditionally with no module system, namespacing or encapsulation." Micro-frontends turn that from a code-quality issue into an operational one, because the conflicting styles are deployed by different teams on different days:

- **Global leakage** — team A's `.title { font-size: 2rem }` restyles team B's titles the moment both are on the page.
- **Ordering conflicts** — two micro-frontends define rules of equal specificity; the winner is whichever bundle loaded last, which depends on navigation path.
- **Duplicate resets** — each micro-frontend ships its own normalize/reset; the second one undoes base styles the shell or another team relied on.
- **Design-system version skew** — checkout runs design system v3, search runs v4; both inject `.ds-button`, and the page gets a mix of both versions' rules.
- **Leftover CSS** — a single-page shell mounts and unmounts micro-frontends on route changes, but their stylesheets stay in `<head>` and keep applying.

None of these produce build errors. They show up as visual bugs in production, often only on specific navigation sequences, which makes them expensive to diagnose.

---

## How it works

### Ownership: who styles what

Clear ownership prevents most conflicts before any technique is applied:

```
  ┌──────────────────────── Shell (platform team) ───────────────────────┐
  │ owns: reset/base, tokens (CSS custom properties on :root),            │
  │       layout of regions, global typography defaults                   │
  │                                                                        │
  │  ┌──── MFE: search ────┐  ┌──── MFE: checkout ───┐  ┌── MFE: account ─┐ │
  │  │ owns: styles inside │  │ owns: styles inside   │  │ …               │ │
  │  │ its own root only;  │  │ its own root only;    │  │                 │ │
  │  │ reads tokens        │  │ reads tokens          │  │                 │ │
  │  └─────────────────────┘  └───────────────────────┘  └─────────────────┘ │
  └────────────────────────────────────────────────────────────────────────┘
```

- **Exactly one owner of the global reset and base element styles** — normally the shell. Micro-frontends must not ship a reset, and must not style bare elements (`h1`, `body`, `a`) globally.
- **The shell publishes tokens**, as CSS custom properties on `:root` (or a theme attribute on `<html>`).
- **Each micro-frontend styles only inside its own root element** and only through isolated selectors.

### Isolation strategies

| Strategy | How it isolates | Strength | Costs |
|---|---|---|---|
| **Naming prefix** (`.chk-`, BEM block per team) | Convention: every class carries a team prefix | Weak — relies on discipline; lint can enforce | No tooling needed; still global, still order-sensitive |
| **CSS Modules / build-time hashing** | Class names are rewritten to unique hashes per build | Strong for class collisions | Does not stop element selectors or global imports; two builds of one design system still collide on its global classes |
| **Scoping to a root** (`@scope (#checkout-root)`, or a wrapper selector) | Rules only match inside the micro-frontend's container | Medium–strong | Requires every rule to be scoped; third-party CSS often isn't; `@scope` is Baseline only since March 2026, so check your browser support matrix |
| **Per-app `@layer`** | Each micro-frontend's CSS lives in its own named layer under a shell-defined order | Solves *ordering*, not collisions | Shell must declare the layer order; combine with hashing or prefixes |
| **Shadow DOM / Web Components** | Styles inside a shadow root do not leak out, and outside selectors do not match in | Strongest in-document isolation | Global CSS (resets, fonts, utility classes) does not reach inside; portals, modals and third-party widgets need care; SSR needs Declarative Shadow DOM |
| **iframe** | Separate document, separate cascade | Total | Sizing, focus, accessibility, routing and performance costs; rarely worth it for UI that must feel native |

Strategies combine. A common, pragmatic stack is **CSS Modules (or prefixes) for collisions + per-app `@layer` for ordering + tokens via custom properties for consistency**. Shadow DOM is the choice when micro-frontends come from teams or vendors you cannot coordinate with closely.

### Tokens as a runtime contract

Custom properties are the one part of CSS designed to cross boundaries: they inherit through the DOM and **pass into shadow roots**. That makes them the right channel for consistency between independently deployed pieces:

```
   shell sets on :root ─────────────────────────────────────────┐
     --color-action-bg, --space-4, --font-body …                  │ inherits
                                                                   ▼
   MFE (light DOM, CSS Modules)     MFE (shadow DOM)        MFE (any framework)
     background: var(--color-…)     background: var(--…)    background: var(--…)
```

Treat the token *names* as a versioned API between the shell and every micro-frontend (see [Design Tokens](design-tokens.md)). The shell can then re-theme or rebrand all micro-frontends at once, with no redeploy of the micro-frontends. The reverse is also true: renaming a token is a coordinated breaking change across every team.

Share **tokens at runtime, components at build time**. Each micro-frontend bundles the design-system components it uses (ideally with hashed or prefixed class names, so two versions can coexist), while all of them read the same live token values. That keeps version skew in the component layer harmless and consistency in the token layer guaranteed.

### Ordering with per-app layers

The shell declares the full layer order once, before any micro-frontend loads:

```css
@layer reset, tokens, shell, mfe, overrides;
```

Each micro-frontend wraps its CSS in a sub-layer (`@layer mfe.checkout { … }`). Now every micro-frontend rule beats the reset regardless of load time, and no micro-frontend can out-rank the shell's `overrides`. Two micro-frontends can still collide on identical class names inside `mfe` — layers solve order, not naming.

### Loading and unloading CSS on route changes

In a client-side shell, a micro-frontend's CSS is typically injected when its bundle loads. Whether it is *removed* on unmount depends on the integration:

- **Bundler-injected `<style>`/`<link>` tags** usually stay in the document after the micro-frontend unmounts. Harmless if the CSS is fully scoped (hashed or `@scope`d); harmful if it contains any global rule.
- **Lifecycle-managed CSS** — frameworks such as single-spa recommend removing the micro-frontend's `<link>`/`<style>` elements in its unmount lifecycle (the `single-spa-css` helper automates this).
- **Shadow DOM** — styles live inside the shadow root and disappear with it.

The robust rule: **write micro-frontend CSS so it is safe to leave loaded**. Unloading is an optimisation, not a correctness mechanism, because a fast route change can mount the next micro-frontend before cleanup runs.

### Module Federation and shared CSS

Module Federation shares JavaScript modules (and can enforce singletons such as one copy of React). CSS is not a first-class shared module: a remote's CSS is emitted by its own build and loaded when its chunks load. Consequences:

- A design system marked as a shared singleton gives one copy of its JS, but its CSS may still be bundled by several remotes, or by none if each expects another to provide it. Decide explicitly who loads design-system CSS — usually the shell, once.
- Without a singleton, two versions of the design system can load; this is safe only if its class names are versioned or hashed.
- Remote CSS is loaded asynchronously, so a remote can render briefly unstyled; render-blocking the remote's CSS (or inlining critical rules) avoids the flash.

---

## Examples

Shell entry: owns reset and tokens, fixes the layer order for everyone:

```css
/* shell/src/global.css */
@layer reset, tokens, shell, mfe, overrides;

@import url("./reset.css") layer(reset);

@layer tokens {
  :root {
    --color-action-bg: oklch(0.55 0.18 250);
    --color-text: oklch(0.2 0 0);
    --space-4: 1rem;
    --font-body: system-ui, sans-serif;
  }
  [data-brand="b"] {
    --color-action-bg: oklch(0.6 0.2 30);
  }
}
```

A micro-frontend: its own sub-layer, scoped to its root, reading only tokens, no reset, no bare element selectors:

```css
/* checkout/src/checkout.css */
@layer mfe.checkout {
  @scope (.chk-root) {
    .summary {
      padding: var(--space-4);
      font-family: var(--font-body);
    }
    .pay {
      background: var(--color-action-bg);
    }
  }
}
```

A Web Component micro-frontend: shadow DOM blocks outside selectors, but tokens still flow in:

```css
/* inside the shadow root of <account-panel> */
:host {
  display: block;
  padding: var(--space-4);              /* inherited from the shell */
  color: var(--color-text);
}
.title { font-size: 1.25rem; }          /* cannot leak to the page */
```

Lint rules every micro-frontend repository enforces (Stylelint configuration excerpt):

```json
{
  "rules": {
    "selector-max-type": [0, { "ignore": ["compounded", "descendant"] }],
    "selector-disallowed-list": [":root", "html", "body"],
    "custom-property-pattern": "^(chk)-.+"
  }
}
```

The last rule restricts the custom properties this micro-frontend may *define* to its own prefix, so only the shell defines shared tokens.

---

## When to use

- Any micro-frontend architecture where more than one team's CSS reaches the same document.
- Server-side or edge composition, where fragments from different services are concatenated into one HTML response and share one cascade.
- Incremental migration of a legacy app, where new micro-frontends must coexist with legacy global CSS (put legacy in a low layer, new code in scoped layers).
- White-label or multi-brand products assembled from independently deployed slices — tokens on the shell make rebranding a shell-only change.

## When NOT to use

- **iframes for ordinary product UI** — total isolation buys you sizing, focus and accessibility problems; use it only for genuinely untrusted or vendor content.
- **Shadow DOM everywhere by default** — if teams already share a design system and use hashed class names, shadow roots add friction (global fonts, modals, third-party widgets) for little extra safety.
- **Sharing component CSS at runtime as a singleton** — it couples every micro-frontend to one design-system version and defeats independent deployment; share tokens at runtime, components at build time.
- **Letting each micro-frontend ship its own reset** — the last loaded reset wins and silently re-bases the whole page.
- **Relying on CSS removal on unmount for correctness** — write CSS that is safe to stay loaded.

---

## References

- Jackson, Cam. [Micro Frontends — Styling and shared component libraries](https://martinfowler.com/articles/micro-frontends.html). martinfowler.com, 2019.
- single-spa. [CSS in microfrontends](https://single-spa.js.org/docs/ecosystem-css/). single-spa documentation.
- MDN Web Docs. [Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM).
- MDN Web Docs. [`@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer).
- Module Federation. [Documentation](https://module-federation.io/). module-federation.io.
