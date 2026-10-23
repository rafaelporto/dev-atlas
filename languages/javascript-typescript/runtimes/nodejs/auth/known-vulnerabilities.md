---
type: concept
tags:
  - language
  - nodejs
  - backend
  - security
  - antipattern
related:
  - languages/javascript-typescript/runtimes/nodejs/auth/overview
  - languages/javascript-typescript/runtimes/nodejs/auth/libraries
  - languages/javascript-typescript/runtimes/nodejs/auth/managed-providers
  - languages/javascript-typescript/runtimes/nodejs/auth/self-hosted-identity-servers
  - languages/javascript-typescript/runtimes/nodejs/auth/implementing-your-own
  - languages/javascript-typescript/frameworks/nextjs/authentication
  - languages/javascript-typescript/runtimes/nodejs/security
language: "nodejs"
---
# Known Vulnerabilities in JS/TS Authentication

> The failure classes that keep reappearing in authentication code — edge-only checks, JWT verification mistakes, session fixation, broken OAuth state, open redirects, unsafe account linking — each tied to real CVEs in Next.js, Auth.js, Better Auth, Passport, `jsonwebtoken`, and Clerk.

---

## What is it?

This article is a catalog of **how authentication breaks** in the JavaScript/TypeScript ecosystem. It groups real, published vulnerabilities into a small number of **failure classes**, so you can recognize the pattern in your own code or in a library you are evaluating — even after the specific CVEs listed here are long patched.

> Advisories were collected from GitHub Security Advisories, NVD, and vendor posts in **October 2026**. The tables list notable cases, not every advisory; check each project's advisory page for the full and current list.

---

## Why does it matter?

Auth bugs are rarely exotic cryptography failures. They are the same handful of mistakes, made again in new code: trusting a layer that can be skipped, accepting a token without checking everything in it, forgetting to rotate a session, comparing URLs loosely. Mature, widely used libraries ship them too — which is why choosing a library is not the end of the job: you still need to patch quickly, configure it correctly, and keep authorization next to the data.

---

## How it works

### 1. Trusting a layer that can be skipped

Checks in an edge layer (Next.js middleware/proxy, an API gateway, a reverse proxy) are only as strong as the guarantee that every request passes through them. When the framework can be tricked into skipping that layer, every route that relied on it is open.

- **Mitigation** — treat edge checks as optimistic redirects; authorize again in the data access layer, next to the query.

### 2. JWT verification mistakes

- Accepting `alg: none`, or letting the token pick its algorithm (RSA public key reused as an HMAC secret — "algorithm confusion").
- Calling `decode()` where `verify()` was needed.
- Verifying the signature but not `iss`, `aud`, and `exp` — accepting a valid token issued for another app.
- **Mitigation** — always pass an explicit algorithm allowlist, issuer, and audience; use a maintained library (`jose`) with safe defaults.

### 3. Session fixation and missing rotation

If the session identifier from before login stays valid after login, an attacker who planted it owns the authenticated session.

- **Mitigation** — issue a new session on every privilege change (login, MFA completion, password change); delete the old one.

### 4. Broken OAuth/OIDC flows

- Missing or unchecked `state`, `nonce`, or PKCE lets an attacker splice their authorization code into a victim's login.
- State cookies not bound to the provider allow cross-provider confusion.
- Reusing one-time values across different flows (an OAuth `state` accepted as a magic-link token).
- **Mitigation** — use a certified client (`openid-client`) or a framework that enforces all three; never invent token formats shared between flows.

### 5. Open redirects in callbacks

`callbackUrl`, `redirect_to`, or `returnTo` parameters that are validated with a prefix match, an unescaped regex, or a bypassable origin allowlist let attackers send users — and sometimes tokens — to their domain.

- **Mitigation** — allow only relative paths or an exact list of origins parsed with `new URL()`; compare parsed origins, not strings.

### 6. Unsafe identity matching and account linking

Linking a social login to an existing account by unverified email, normalizing addresses after validating them, or letting a parser accept several addresses in one field leads to account takeover or login links sent to the attacker.

- **Mitigation** — link accounts only on verified identifiers, normalize before validating, and reject anything that is not exactly one address.

### 7. Missing abuse controls

No rate limiting, limits that can be bypassed by rotating IPv6 addresses or path tricks, different responses for unknown users, or timing differences — all enable credential stuffing and user enumeration.

- **Mitigation** — rate-limit by account and by network prefix, normalize paths before matching, return identical responses and timings.

### 8. Shared-responsibility gaps in managed platforms

The provider is secure; the customer's configuration is not — database rules left open, security rules never written.

- **Mitigation** — treat RLS policies and security rules as code: reviewed, tested, and enabled by default.

### Real cases

**Next.js**

| ID | Affected → fixed | Class | What happened |
|---|---|---|---|
| [CVE-2025-29927](https://github.com/advisories/GHSA-f82v-jwr5-mffw) | 11.1.4–15.2.2 → 12.3.5 / 13.5.9 / 14.2.25 / 15.2.3 | 1 | Sending the internal `x-middleware-subrequest` header made Next.js skip middleware entirely, bypassing auth implemented there. Critical. |
| [CVE-2024-51479](https://github.com/advisories/GHSA-7gfc-8cq8-jh5f) | 9.5.5–14.2.14 → 14.2.15 | 1 | Pathname-based authorization in middleware could be bypassed for pages directly under the app root. |
| [CVE-2026-44574](https://github.com/advisories/GHSA-492v-c6pp-mqqv) and related (CVE-2026-44573, CVE-2026-44575) | 15.4–15.5.15, 16.0–16.2.4 → 15.5.16 / 16.2.5 (main advisory) | 1 | Crafted query parameters, `.rsc`/prefetch requests, and i18n data routes bypassed middleware/proxy protection on some routes. |

**Auth.js / NextAuth.js**

| ID | Affected → fixed | Class | What happened |
|---|---|---|---|
| [CVE-2023-27490](https://github.com/advisories/GHSA-7r7x-4c4q-c4qf) | `next-auth` < 4.20.1 | 4 | `state`, `nonce`, and PKCE were not enforced; an attacker could strip them and log in as the victim. |
| [CVE-2023-48309](https://github.com/advisories/GHSA-v64w-49xw-qq89) | < 4.24.5 | 4 | A JWT from an incomplete OAuth flow could be used to fake a session. |
| [CVE-2022-24858](https://github.com/advisories/GHSA-f9wg-5f46-cjmw), [CVE-2022-29214](https://github.com/advisories/GHSA-q2mx-j4x2-2h74) | < 4.3.3 | 5 | Open redirects in the default redirect callback and OAuth 1 providers. |
| [CVE-2022-35924](https://github.com/advisories/GHSA-xv97-c62v-4587) | < 4.10.3 | 6 | Comma-separated email input sent magic-link logins to unintended addresses. Critical. |
| [GHSA-5jpx-9hw9-2fx4](https://github.com/advisories/GHSA-5jpx-9hw9-2fx4) | < 4.24.12, v5 beta < 30 | 6 | The mail library's address parser enabled misdelivery of login links. |
| [GHSA-7rqj-j65f-68wh](https://github.com/advisories/GHSA-7rqj-j65f-68wh) | `@auth/core` < 0.41.3, `next-auth` < 4.24.15 | 6 | Email validated before Unicode normalization; a lookalike "@" enabled account takeover via passwordless sign-in. |
| [GHSA-x445-f3h2-j279](https://github.com/advisories/GHSA-x445-f3h2-j279) | same as above | 4 | OAuth `state`/`nonce`/PKCE cookies were not bound to their provider. |

**Better Auth**

| ID | Affected → fixed | Class | What happened |
|---|---|---|---|
| [GHSA-vp58-j275-797x](https://github.com/advisories/GHSA-vp58-j275-797x) | ≤ 1.1.20 → 1.1.21 | 5 | `trustedOrigins` bypass → open redirect and account takeover. |
| [CVE-2025-53535](https://github.com/advisories/GHSA-36rg-gfq2-3h56) | ≤ 1.2.9 → 1.2.10 | 5 | Open redirect in the origin check of verification, reset, and OAuth callbacks. |
| [CVE-2025-61928](https://github.com/advisories/GHSA-99h5-pjcv-gr6v) | < 1.3.26 | — | Unauthenticated creation or modification of any user's API keys (API-key plugin). |
| [GHSA-xg6x-h9c9-2m83](https://github.com/advisories/GHSA-xg6x-h9c9-2m83) | < 1.4.9 | 3 | With cookie caching on, a session counted as valid before 2FA was completed. |
| [GHSA-965c-763c-88jm](https://github.com/better-auth/better-auth/security/advisories/GHSA-965c-763c-88jm) | 1.4.0-beta.18–1.7.6 → 1.7.7 | 4 | An OAuth `state` value could be replayed as a magic-link token to sign in as another user. Critical. |
| [Further 2025–2026 advisories](https://github.com/better-auth/better-auth/security/advisories) | various | 4, 6, 7 | SSO and SCIM account takeovers, SSRF via SSO, OAuth-proxy impersonation, rate-limit bypass via IPv6 rotation and double-slash paths, deleting other users' passkeys. |

**Other packages and providers**

| ID | Affected → fixed | Class | What happened |
|---|---|---|---|
| [CVE-2022-25896](https://github.com/advisories/GHSA-v923-w3x8-wh69) (Passport) | < 0.6.0 | 3 | Session not regenerated on login/logout — session fixation. |
| [CVE-2015-9235](https://github.com/advisories/GHSA-c7hr-j4mj-j2w6) (`jsonwebtoken`) | < 4.2.2 | 2 | Weak `alg` validation: `none` and HS/RS confusion. |
| [CVE-2022-23540](https://github.com/advisories/GHSA-qwph-4952-7xr6), [CVE-2022-23541](https://github.com/advisories/GHSA-hjrf-2m68-5959), [CVE-2022-23539](https://github.com/advisories/GHSA-8cf7-32gw-wr33) (`jsonwebtoken`) | < 9.0.0 | 2 | Insecure defaults: fallback to `none` with a falsy key, RSA→HMAC confusion, legacy key types accepted. |
| [CVE-2024-28176](https://github.com/advisories/GHSA-hhhv-q57g-882q) (`jose`) | < 2.0.7, 3.0.0–4.15.4 | — | Compressed JWE decompression bomb (resource exhaustion). |
| [CVE-2024-22206](https://github.com/advisories/GHSA-q6w5-jg5q-47vg) (`@clerk/nextjs`) | 4.7.0–4.29.2 → 4.29.3 | 1 | Logic flaw in `auth()`/`getAuth()` let attackers act as other users. Critical. |
| Okta support-system breach (Oct 2023) | — | — | Session tokens in support HAR files of 134 customers accessed; 5 sessions hijacked. See [Managed Identity Providers](managed-providers.md). |
| Firebase / Supabase misconfigurations (2024, 2025) | — | 8 | Hundreds of apps with missing security rules or RLS exposed user data. See [Managed Identity Providers](managed-providers.md). |

Self-hosted identity servers have their own history (redirect-URI validation, SAML signature bypass, forwarded-header trust) — see [Self-Hosted Identity Servers](self-hosted-identity-servers.md).

---

## Examples

**Class 2 — verifying a JWT.** The vulnerable version decodes or lets the token choose the algorithm; the fixed version pins everything:

```ts
// ❌ Vulnerable: decode is not verify, and nothing about the token is checked
import jwt from "jsonwebtoken";
const claims = jwt.decode(token);              // anyone can forge this
if (claims?.sub) grantAccess(claims.sub);

// ✅ Fixed: explicit algorithm, issuer, audience; expiry checked by default
import { jwtVerify, createRemoteJWKSet } from "jose";
const JWKS = createRemoteJWKSet(new URL("https://idp.internal/.well-known/jwks.json"));

const { payload } = await jwtVerify(token, JWKS, {
  algorithms: ["RS256"],
  issuer: "https://idp.internal",
  audience: "my-api",
});
grantAccess(payload.sub!);
```

**Class 5 — validating a post-login redirect:**

```ts
// ❌ Vulnerable: "https://app.test.attacker.net" and "//attacker.net" both pass
if (callbackUrl.startsWith("https://app.test") || callbackUrl.startsWith("/")) redirect(callbackUrl);

// ✅ Fixed: parse, then compare the exact origin; fall back to a safe default
export function safeRedirect(callbackUrl: string, appOrigin: string): string {
  try {
    const url = new URL(callbackUrl, appOrigin);    // resolves relative paths against our origin
    return url.origin === appOrigin ? url.pathname + url.search : "/";
  } catch {
    return "/";
  }
}
```

**Class 3 — rotating the session on login** (Express with `express-session`, the behavior Passport adopted in 0.6.0):

```ts
app.post("/login", async (req, res, next) => {
  const user = await verifyCredentials(req.body.username, req.body.password);
  if (!user) return res.status(401).json({ error: "Invalid username or password" });

  req.session.regenerate((err) => {   // new session ID; the pre-login one is discarded
    if (err) return next(err);
    req.session.userId = user.id;
    res.json({ ok: true });
  });
});
```

---

## When to use

- Use the failure classes as a review checklist for any auth code or library configuration.
- Subscribe to GitHub security advisories for every auth-related dependency and patch within days, not sprints.
- Strip internal framework headers (such as `x-middleware-subrequest`) at your edge as defense in depth.
- Authorize next to the data so that a bypassed edge layer does not expose anything.

## When NOT to use

- Do not read an empty advisory list as proof of safety — it may mean nobody has looked yet.
- Do not assume a well-known library or vendor makes these classes impossible; every one of them has a CVE in a popular package.
- Do not enable optional plugins or providers you do not use; most recent advisories live in optional features.
- Do not copy proof-of-concept payloads from advisories into tests or docs without sanitizing them.

---

## References

- [OWASP Top 10 — A01 Broken Access Control, A07 Identification and Authentication Failures](https://owasp.org/www-project-top-ten/)
- [Auth0 — Critical vulnerabilities in JSON Web Token libraries (Tim McLean)](https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/)
- [RFC 8725 — JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725)
- [RFC 9700 — OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700)
- [GitHub Advisory Database](https://github.com/advisories)
- [GitHub Advisory — CVE-2025-29927, Next.js middleware bypass](https://github.com/advisories/GHSA-f82v-jwr5-mffw)
- [Better Auth — Security advisories](https://github.com/better-auth/better-auth/security/advisories)
- [Auth.js — Security advisories](https://github.com/nextauthjs/next-auth/security/advisories)
