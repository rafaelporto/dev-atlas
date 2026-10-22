---
type: how-to
tags:
  - language
  - nodejs
  - backend
  - security
related:
  - languages/nodejs/auth/overview
  - languages/nodejs/auth/build-vs-buy
  - languages/nodejs/auth/libraries
  - languages/nodejs/auth/known-vulnerabilities
  - languages/nodejs/security
  - languages/nodejs/data-access
language: "nodejs"
---
# How to Implement Session Authentication Yourself in Node.js

> A minimal, correct username-and-password authentication built on `node:crypto` and Argon2id: hashed passwords, database-backed sessions in `HttpOnly` cookies, session rotation, CSRF and rate limiting, logout, and password reset.

---

## Prerequisites

- You have read [Build vs Buy](build-vs-buy.md) and have a reason to own this code (learning, unusual constraints, or a small and controlled scope). If you need social login, MFA, or enterprise SSO, start from a [library](libraries.md) instead.
- Node.js active LTS (22+), TypeScript, and a relational database. The examples use a small `db` interface you map to your driver or ORM.
- HTTPS everywhere, including staging — `Secure` cookies are not sent over plain HTTP.
- `npm install @node-rs/argon2` (Argon2 bindings with prebuilt binaries; no native toolchain needed).

The design follows Pilcrow's Auth Book and the OWASP cheat sheets. It deliberately covers **username/password + sessions only**; OAuth, MFA, and email verification are out of scope and are where a library pays off.

---

## Steps

### 1. Create the tables

Store only **hashes** of anything that grants access: password hashes, session token hashes, reset token hashes. A database leak then does not hand out live sessions.

```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,          -- SHA-256 of the token, never the token itself
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE password_reset_tokens (
  id         TEXT PRIMARY KEY,          -- SHA-256 of the token
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
```

### 2. Hash passwords with Argon2id

Use Argon2id with at least the OWASP minimum parameters (19 MiB memory, 2 iterations, parallelism 1). Rehash on login when the stored parameters are weaker than the current ones, so you can raise the cost later without forcing resets.

```ts
// auth/password.ts
import { hash, verify } from "@node-rs/argon2";

const PARAMS = { memoryCost: 19456, timeCost: 2, parallelism: 1 }; // Argon2id is the default algorithm

export const hashPassword = (password: string) => hash(password, PARAMS);
export const verifyPassword = (stored: string, password: string) => verify(stored, password);

export function needsRehash(stored: string): boolean {
  // Encoded form: $argon2id$v=19$m=19456,t=2,p=1$salt$hash
  const m = /\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(stored);
  if (!m) return true;
  return Number(m[1]) < PARAMS.memoryCost || Number(m[2]) < PARAMS.timeCost;
}
```

Enforce a minimum length (8+ with MFA, 15+ without, per NIST SP 800-63B), allow long passphrases, and reject passwords known to be breached rather than imposing composition rules.

### 3. Generate and store session tokens

The token sent to the browser is 32 random bytes from the CSPRNG. The database keeps only its SHA-256, so the lookup is a hash plus a primary-key read.

```ts
// auth/session.ts
import { randomBytes, createHash } from "node:crypto";

const DAY = 24 * 60 * 60 * 1000;
const SESSION_TTL = 30 * DAY;
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL);
  await db.sessions.insert({ id: sha256(token), userId, expiresAt });
  return { token, expiresAt };
}
```

### 4. Set the cookie

```ts
// auth/cookie.ts
export function sessionCookie(token: string, expiresAt: Date) {
  return [
    `session=${token}`,
    "HttpOnly",              // not readable from JavaScript (XSS cannot steal it)
    "Secure",                // HTTPS only
    "SameSite=Lax",          // not sent on cross-site POSTs
    "Path=/",
    `Expires=${expiresAt.toUTCString()}`,
  ].join("; ");
}

export const clearSessionCookie = () =>
  "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
```

Use the `__Host-` prefix (`__Host-session`) when the app owns its whole origin: the browser then refuses the cookie unless it is `Secure`, has `Path=/`, and has no `Domain`.

### 5. Log in without leaking information

Return the same error for "no such user" and "wrong password", and spend the same time on both paths. Create a **new** session on every successful login so a session ID planted before login (session fixation) is never promoted.

```ts
// auth/login.ts
import { hashPassword, verifyPassword, needsRehash } from "./password";
import { createSession } from "./session";

// Hash of a random value, computed once, to equalize timing when the user does not exist
const DUMMY_HASH = await hashPassword(crypto.randomUUID());

export async function login(username: string, password: string) {
  const user = await db.users.findByUsername(username);
  const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);
  if (!user || !ok) return { error: "Invalid username or password" } as const;

  if (needsRehash(user.passwordHash)) {
    await db.users.update(user.id, { passwordHash: await hashPassword(password) });
  }
  return { session: await createSession(user.id) } as const; // always a fresh session
}
```

### 6. Validate the session on every request

Look up the hash, reject expired sessions, and extend the expiry when the session is in the second half of its life (sliding expiration) so active users are not logged out.

```ts
// auth/session.ts (continued)
export async function validateSession(token: string | undefined) {
  if (!token) return null;
  const id = sha256(token);
  const session = await db.sessions.findById(id);
  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await db.sessions.delete(id);
    return null;
  }
  if (session.expiresAt.getTime() - Date.now() < SESSION_TTL / 2) {
    session.expiresAt = new Date(Date.now() + SESSION_TTL);
    await db.sessions.update(id, { expiresAt: session.expiresAt });
  }
  return session; // { id, userId, expiresAt }
}
```

### 7. Block cross-site requests (CSRF)

`SameSite=Lax` already stops cookies on cross-site `POST`s in modern browsers. Add an `Origin` check on every state-changing request as the second layer.

```ts
// auth/csrf.ts
const ALLOWED_ORIGIN = process.env.APP_ORIGIN!; // e.g. the public https origin of the app

export function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  if (req.headers.get("origin") !== ALLOWED_ORIGIN) {
    throw new Response("Forbidden", { status: 403 });
  }
}
```

Never perform state changes on `GET`.

### 8. Rate-limit login and reset

Throttle by **IP and by username**, so neither one attacker spraying many accounts nor many IPs hammering one account gets through. Use a shared store (Redis, the database) once you run more than one instance.

```ts
// auth/rate-limit.ts — fixed window, single instance; swap the Map for Redis in production
const hits = new Map<string, { count: number; resetAt: number }>();

export function allow(key: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  return ++entry.count <= limit;
}

// usage: if (!allow(`ip:${ip}`, 20) || !allow(`user:${username}`)) return 429
```

### 9. Log out and revoke

Logout deletes the session row and clears the cookie. "Log out everywhere" and password changes delete all rows for the user — the immediate revocation is the main reason to prefer stored sessions over JWTs.

```ts
export async function logout(token: string) {
  await db.sessions.delete(sha256(token));
}

export async function revokeAllSessions(userId: string) {
  await db.sessions.deleteByUser(userId);
}
```

### 10. Reset passwords with single-use tokens

The reset token is random, stored as a hash, short-lived, deleted on use, and every existing session is revoked after the password changes. Respond identically whether or not the account exists.

```ts
// auth/reset.ts
const RESET_TTL = 30 * 60 * 1000; // 30 minutes

export async function requestReset(username: string) {
  const user = await db.users.findByUsername(username);
  if (user) {
    const token = randomBytes(32).toString("base64url");
    await db.resetTokens.deleteByUser(user.id);
    await db.resetTokens.insert({ id: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL) });
    await sendResetLink(user, token); // link to a page that POSTs the token; never log it
  }
  return { message: "If the account exists, a reset link was sent." };
}

export async function completeReset(token: string, newPassword: string) {
  const row = await db.resetTokens.findById(sha256(token));
  if (!row || row.expiresAt.getTime() <= Date.now()) return { error: "Invalid or expired link" };

  await db.resetTokens.delete(row.id);                        // single use
  await db.users.update(row.userId, { passwordHash: await hashPassword(newPassword) });
  await revokeAllSessions(row.userId);                        // kill sessions an attacker may hold
  return { session: await createSession(row.userId) };
}
```

Send the reset page with `Referrer-Policy: no-referrer` so the token in the URL does not leak to third-party resources.

---

## Verification

Check each protection, not only the happy path:

```bash
# 1. Cookie flags — expect HttpOnly; Secure; SameSite=Lax
curl -si -X POST https://localhost:3000/login -H 'Origin: https://localhost:3000' \
  -d 'username=ada&password=correct-horse' | grep -i set-cookie

# 2. CSRF — a foreign Origin on a mutation must get 403
curl -si -X POST https://localhost:3000/settings -H 'Origin: https://attacker.test' \
  -b 'session=<token>' | head -1

# 3. Rate limiting — the 6th bad attempt for the same username must get 429
for i in $(seq 1 6); do curl -s -o /dev/null -w '%{http_code}\n' -X POST https://localhost:3000/login \
  -H 'Origin: https://localhost:3000' -d 'username=ada&password=wrong'; done
```

Also confirm, with tests:

- The `sessions` table contains hashes, never the cookie value.
- The session ID changes after login (fixation test: set a cookie, log in, compare).
- Login responses and timings are indistinguishable for unknown users and wrong passwords.
- A used or expired reset token is rejected, and all old sessions are gone after a reset.
- `needsRehash` upgrades a hash created with weaker parameters on the next login.

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Cookie never set in local development | `Secure` cookie over plain `http://` | Serve local dev over HTTPS, or relax `Secure` only for `localhost` behind an explicit dev flag |
| Users logged out after exactly 30 days while active | Expiry never extended | Implement the sliding-expiration branch in `validateSession` |
| Login takes over a second | Argon2 parameters too high for the host, or hashing on a busy event loop | Benchmark to ~100–500 ms per hash; `@node-rs/argon2` already runs off the main thread |
| Legitimate form posts rejected with 403 | `APP_ORIGIN` mismatch (port, scheme, trailing slash) or proxy rewriting `Origin` | Compare the exact `Origin` header; configure the allowed origin per environment |
| Rate limiter ineffective in production | In-memory `Map` with several instances | Move counters to Redis or the database |
| Sessions survive a password change | No revocation on change/reset | Call `revokeAllSessions` and issue a fresh session |

---

## References

- [Pilcrow's Auth Book — sessions, password-based auth, CSRF, password reset](https://auth.pilcrowonpaper.com/)
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP — Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP — Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP — Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [NIST SP 800-63B — Digital Identity Guidelines: Authentication](https://pages.nist.gov/800-63-4/sp800-63b.html)
- [MDN — Set-Cookie (cookie prefixes)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- [@node-rs/argon2 on npm](https://www.npmjs.com/package/@node-rs/argon2)
