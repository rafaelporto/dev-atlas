# Node.js — Authentication

> Choosing and implementing authentication in Node.js and TypeScript — the concepts, build vs buy, libraries, managed and self-hosted identity providers, known vulnerabilities, and a from-scratch guide.

---

| Article | Description |
|---|---|
| [Overview](overview.md) | Authn vs authz, sessions vs JWTs, OAuth 2.0/OIDC, passkeys and MFA, and the three kinds of auth solution |
| [Build vs Buy](build-vs-buy.md) | Deciding between primitives, a library, a managed provider, or a self-hosted IdP — criteria, decision flow, and scenarios |
| [Auth Libraries](libraries.md) | Auth.js, Better Auth, Passport.js, Lucia, and the primitives (`jose`, `openid-client`, SimpleWebAuthn) compared — with maintenance status |
| [Managed Identity Providers](managed-providers.md) | Clerk, Auth0, Supabase Auth, Firebase Auth, Cognito, and WorkOS — features, pricing, lock-in, and limitations |
| [Self-Hosted Identity Servers](self-hosted-identity-servers.md) | Keycloak, Zitadel, Ory, and Authentik — when running your own IdP pays off and what it costs |
| [Known Vulnerabilities](known-vulnerabilities.md) | Recurring auth failure classes and real CVEs in the JS/TS auth ecosystem, with the lesson from each |
| [Implementing Your Own](implementing-your-own.md) | Step-by-step session auth on `node:crypto` and Argon2id — cookies, CSRF, rate limiting, revocation, password reset |
