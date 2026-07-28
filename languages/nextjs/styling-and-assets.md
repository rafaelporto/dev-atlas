---
type: concept
tags:
  - language
  - nextjs
  - full-stack
  - frontend
  - concept
related:
  - languages/nextjs/optimization
  - languages/react/styling
  - languages/nextjs/project-setup
language: "nextjs"
---
# Styling and Assets

> Next.js supports CSS Modules, global CSS, Tailwind, and CSS-in-JS, and optimizes images and fonts through the built-in `next/image` and `next/font` components.

---

## What is it?

This covers how you style a Next.js app and how it handles static assets. For styling: **CSS Modules**, **global stylesheets**, **Tailwind CSS**, and **CSS-in-JS** libraries. For assets: the **`next/image`** component (automatic image optimization) and **`next/font`** (self-hosted, layout-shift-free fonts), plus the `public/` directory for static files.

---

## Why does it matter?

Images and fonts are usually the heaviest assets on a page and the main cause of poor Core Web Vitals (layout shift, slow largest-contentful-paint). Next.js's built-in components solve these correctly by default. On styling, knowing which approach works cleanly with Server Components avoids a class of hydration and bundle problems.

---

## How it works

### CSS Modules (scoped, works everywhere)

```tsx
// button.module.css → import as an object; class names are locally scoped
import styles from "./button.module.css";
export function Button() {
  return <button className={styles.primary}>Go</button>;
}
```

### Global CSS

Import a global stylesheet once, in the root layout.

```tsx
// app/layout.tsx
import "./globals.css";
```

### Tailwind CSS

Utility-first classes; `create-next-app` can configure it. Works well with Server Components because it is just class names — no runtime.

```tsx
<div className="mx-auto max-w-2xl p-4 text-lg">…</div>
```

### CSS-in-JS caveat

Runtime CSS-in-JS libraries often need a Client Component (`"use client"`) and special SSR setup, since they run JavaScript to produce styles. Prefer CSS Modules, Tailwind, or zero-runtime solutions to keep styling in Server Components.

### Images with next/image

```tsx
import Image from "next/image";

<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />
```

`next/image` automatically resizes/serves modern formats (WebP/AVIF), lazy-loads by default, and reserves space to prevent layout shift. Use `priority` for above-the-fold images. Remote images require configuring allowed domains in `next.config`.

### Fonts with next/font

```tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html className={inter.className}><body>{children}</body></html>;
}
```

Fonts are self-hosted at build time (no external request to Google), eliminating a round-trip and preventing layout shift.

### Static assets

Files in `public/` are served from the root: `public/logo.svg` → `/logo.svg`.

---

## Examples

```tsx
// Optimized, responsive hero image that fills its container
import Image from "next/image";

<div className="relative h-96 w-full">
  <Image src="/banner.jpg" alt="Banner" fill className="object-cover" priority />
</div>
```

---

## When to use

- Use **CSS Modules** or **Tailwind** as the default — both compose cleanly with Server Components.
- Use **`next/image`** for all content images to get optimization, lazy loading, and no layout shift.
- Use **`next/font`** to self-host fonts and avoid layout shift and third-party requests.
- Put unprocessed static files (favicons, robots.txt, downloads) in `public/`.

## When NOT to use

- Do not use a plain `<img>` for content images — you lose optimization and risk layout shift.
- Do not adopt runtime CSS-in-JS without its SSR setup — it can break in Server Components and add client JS.
- Do not import global CSS anywhere but the root layout (or where the framework allows) — it can cause ordering issues.
- Do not skip `width`/`height` (or `fill`) on `next/image` — they prevent layout shift.

---

## References

- [Next.js — CSS](https://nextjs.org/docs/app/building-your-application/styling)
- [Next.js — Image Optimization (`next/image`)](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Next.js — Font Optimization (`next/font`)](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
- [Next.js — Static Assets in `public`](https://nextjs.org/docs/app/api-reference/file-conventions/public-folder)
