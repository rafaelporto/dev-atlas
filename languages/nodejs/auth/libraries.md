---
type: concept
tags:
  - language
  - nodejs
  - backend
  - security
  - comparison
related:
  - languages/nodejs/auth/overview
  - languages/nodejs/auth/build-vs-buy
  - languages/nodejs/auth/managed-providers
  - languages/nodejs/auth/known-vulnerabilities
  - languages/nodejs/auth/implementing-your-own
  - languages/nextjs/authentication
language: "nodejs"
---
# Auth Libraries for Node.js and TypeScript

> Better Auth, Auth.js (NextAuth), Passport.js, and the low-level primitives (`jose`, `openid-client`, SimpleWebAuthn) compared — maturity, maintenance status, what each covers and leaves out — plus what happened to Lucia, Arctic, and Oslo.

---

## What is it?

An **auth library** is open-source code that runs inside your own application and implements login flows for you, while users, sessions, and credentials stay in **your** database. Unlike a managed provider there is no external service and no per-user fee; unlike building from scratch, the protocol details (OAuth state and PKCE, token verification, session rotation) are written and reviewed by someone else.

Libraries range from **frameworks** that own the whole flow (Better Auth, Auth.js) to **middleware** that only verifies credentials (Passport.js) to **primitives** that implement one building block well (`jose` for JWTs, `openid-client` for OIDC, SimpleWebAuthn for passkeys).

> Maintenance status, versions, and weekly npm downloads in this article were checked in **October 2026** (downloads: week of 12–18 October 2026). This part of the ecosystem changed quickly in 2025–2026 — re-check before choosing.

---

## Why does it matter?

The library you pick decides how much of the auth surface you still own, and its maintenance status decides how fast security fixes reach you. The JS/TS ecosystem consolidated sharply:

- **Auth.js** (formerly NextAuth.js) — the long-time default for Next.js — has been maintained by the Better Auth team since September 2025, in security-fix mode, with an explicit recommendation that new projects start on Better Auth.
- **Better Auth** became the most-downloaded auth framework and joined Vercel in July 2026.
- **Lucia**, once the recommended "minimal" option, became a learning resource; its author later deprecated **Arctic** and most of **Oslo** as well.

Picking a library that is winding down means inheriting its open issues without a path to new features.

---

## How it works

### Better Auth

- **Status** — active; 1.7.x stable, 1.8 in beta. Raised a seed round in 2025, joined Vercel in July 2026 while remaining open source and framework-agnostic. About 7.8 million weekly downloads.
- **Model** — a TypeScript-first framework: you give it a database (Postgres, MySQL, SQLite, or an ORM adapter such as Prisma or Drizzle) and it owns tables for users, sessions, accounts, and verifications. It mounts a handler on any framework (Next.js, Hono, Express, SvelteKit, Nuxt, …) and generates a typed client.
- **Offers** — email/password, social OAuth, magic links, email OTP, sessions with cookie caching, and a large **plugin** catalog: two-factor (TOTP, OTP, backup codes), passkeys, username, organizations and roles, admin, API keys, multi-session, SSO (SAML/OIDC), SCIM, an OAuth 2.1 provider (Better Auth as your own IdP), JWT, rate limiting, Have I Been Pwned checks.
- **Does not offer** — a database-free setup comparable to Auth.js's JWT mode was the main gap the Auth.js team cited when recommending it (check the current docs for stateless options); hosted UI (you build the screens, or use community UI kits).
- **Limitations** — breadth comes with surface area: 2025–2026 brought a high volume of security advisories, several critical, concentrated in the newer SSO, SCIM, OAuth-proxy, and API-key plugins (see [Known Vulnerabilities](known-vulnerabilities.md)). Enable only the plugins you need and track the advisory feed.

### Auth.js (NextAuth.js)

- **Status** — maintenance mode. `next-auth` **v4 is the `latest` release**; v5 (`@auth/core` underneath, with adapters for other frameworks) has been in beta for years and the maintainers have no immediate plans to stabilize it. Security patches continue. About 4 million weekly downloads, mostly from existing apps.
- **Model** — configuration-driven: a list of providers (80+ OAuth/OIDC providers, email magic links, credentials, experimental WebAuthn), callbacks to shape the session, and optional database adapters. Without an adapter, sessions are encrypted JWTs in a cookie — its distinctive strength.
- **Offers** — the widest catalog of pre-configured OAuth providers, stateless sessions, mature Next.js integration.
- **Does not offer** — MFA, organizations, SSO/SCIM, rate limiting. The credentials provider is deliberately limited and does not work with database sessions by default.
- **Limitations** — new features are unlikely; the long v5 beta split the documentation and examples between versions.

### Passport.js

- **Status** — the veteran of the Express era, maintained by its original author; latest core release **0.7.0 (November 2023)**, effectively stable/dormant. About 4.6 million weekly downloads, driven by existing Express and NestJS apps (`@nestjs/passport`).
- **Model** — Express/Connect middleware plus hundreds of **strategies** (separate packages: `passport-local`, `passport-google-oauth20`, `passport-jwt`, `passport-saml`, …). Passport verifies credentials and calls `req.login()`; everything else is yours.
- **Offers** — a strategy for almost any credential type or provider, including SAML.
- **Does not offer** — user storage, session storage (use `express-session` with a store), password hashing, MFA, passkeys, email flows, CSRF protection. Callback-style API.
- **Limitations** — strategy quality varies by maintainer; versions before 0.6.0 did not regenerate the session on login (CVE-2022-25896, session fixation).

### Lucia, Arctic, and Oslo — deprecated

- **Lucia** — deprecated as a library (announced October 2024, last fixes March 2025). `lucia-auth.com` is now a learning resource on implementing sessions from scratch.
- **Arctic** (OAuth clients for ~50 providers) and **Oslo** (`@oslojs/*` crypto, JWT, OTP utilities) — deprecated by their author in July 2026, except `@oslojs/encoding`. Existing code keeps working, but no fixes should be expected.
- **Where the knowledge went** — the author's guide, formerly The Copenhagen Book, is now **Pilcrow's Auth Book**. Existing Lucia/Arctic users should plan a move to Better Auth or to the primitives below.

### Primitives

| Package | Purpose | Status (Oct 2026) | Notes |
|---|---|---|---|
| `jose` | JWS/JWE/JWT/JWK/JWKS on any JS runtime | Active, v6 | WebCrypto-based, zero dependencies; recommended by the Next.js docs for session tokens. ~93M weekly downloads |
| `openid-client` | OAuth 2.0 / OIDC relying party | Active, v6 | OpenID-certified (Basic, FAPI 1.0, FAPI 2.0 RP); the replacement for Arctic in OAuth flows |
| `@simplewebauthn/server` (+ `/browser`) | Passkeys / WebAuthn registration and authentication | Active, v14 | The standard choice for passkeys outside a framework |
| `@node-rs/argon2` | Argon2id password hashing | Active, v2 | Prebuilt native binaries, async off the main thread |
| `jsonwebtoken` | Sign/verify JWTs (Node only) | Maintained, v9 | Older API; versions before 9.0.0 had insecure defaults. Prefer `jose` for new code |

### Comparison

| | Better Auth | Auth.js | Passport.js | Primitives |
|---|---|---|---|---|
| Maintenance | Active (Vercel) | Security fixes only | Stable/dormant | Active (except Arctic/Oslo) |
| Weekly downloads | ~7.8M | ~4.0M (`next-auth`) | ~4.6M | varies |
| Framework support | Any (adapters) | Next.js first; others via `@auth/*` | Express/Connect, NestJS | Any |
| Database required | Yes, by design | No (JWT mode) | You choose | You choose |
| Email/password | Built in | Limited (credentials provider) | `passport-local` + your code | Your code |
| Social OAuth | Built in | 80+ providers | Strategy per provider | `openid-client` |
| MFA / passkeys | Plugins | No / experimental | No | SimpleWebAuthn, your TOTP |
| Organizations / roles | Plugin | No | No | Your code |
| Enterprise SSO / SCIM | Plugins | No | `passport-saml` | Your code |
| Biggest risk | Fast-moving plugin surface, frequent advisories | No new features; v5 forever beta | Everything around login is yours | All security properties are yours |

---

## Examples

**Better Auth** in a Next.js app (TypeScript):

```ts
// lib/auth.ts
import { betterAuth } from "better-auth";
import { twoFactor, organization } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  plugins: [twoFactor(), organization()], // enable only what you use
});

// app/api/auth/[...all]/route.ts
import { toNextJsHandler } from "better-auth/next-js";
export const { GET, POST } = toNextJsHandler(auth);

// In a Server Component or Server Action
import { headers } from "next/headers";
const session = await auth.api.getSession({ headers: await headers() });
```

**Auth.js** (v5 beta API, the one most Next.js App Router examples use):

```ts
// auth.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub], // reads AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
  // no adapter → encrypted JWT session cookie, no database needed
});

// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;

// Anywhere on the server
const session = await auth();
```

---

## When to use

- Use **Better Auth** for new TypeScript projects that want a full framework with users in their own database — especially when MFA, passkeys, or organizations are needed.
- Keep **Auth.js** in existing apps that work well with it; consider it for new projects only when stateless JWT sessions without a database are a hard requirement.
- Use **Passport.js** in existing Express/NestJS codebases, or when you need a specific strategy (such as SAML) that nothing else provides.
- Use the **primitives** when you build your own flow ([Implementing Your Own](implementing-your-own.md)) or need one capability — verifying third-party JWTs, adding passkeys — without a framework.

## When NOT to use

- Do not start new projects on Lucia, Arctic, or Oslo; they are deprecated.
- Do not enable every Better Auth plugin "just in case" — each one is attack surface, and the advisories cluster in plugins.
- Do not choose Auth.js for a new product that will need MFA, organizations, or SSO; none of these will be added.
- Do not use Passport alone and assume sessions, CSRF, and hashing are handled — they are not.
- Do not pin an auth library and forget it: subscribe to its GitHub security advisories and patch quickly.

---

## References

- [Better Auth — Documentation](https://www.better-auth.com/docs)
- [Better Auth — Auth.js is now part of Better Auth](https://www.better-auth.com/blog/authjs-joins-better-auth)
- [Better Auth — Better Auth joins Vercel](https://better-auth.com/blog/better-auth-joins-vercel)
- [Auth.js — Documentation](https://authjs.dev) · [next-auth discussion #13252 on the project's future](https://github.com/nextauthjs/next-auth/discussions/13252)
- [Passport.js — Documentation](https://www.passportjs.org) · [CHANGELOG](https://github.com/jaredhanson/passport/blob/master/CHANGELOG.md)
- [Lucia — deprecation discussion #1714](https://github.com/lucia-auth/lucia/discussions/1714)
- [pilcrowonpaper — "I am deprecating most of my open-source NPM packages"](https://pilcrowonpaper.com/blog/18)
- [Pilcrow's Auth Book](https://auth.pilcrowonpaper.com/)
- [jose (panva)](https://github.com/panva/jose) · [openid-client (panva)](https://github.com/panva/openid-client) · [SimpleWebAuthn](https://github.com/MasterKale/SimpleWebAuthn)
