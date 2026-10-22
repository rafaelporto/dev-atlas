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
  - devops/orchestration/kubernetes
language: "nodejs"
---
# Self-Hosted Identity Servers

> Keycloak, Zitadel, Ory, and Authentik — identity servers you run yourself and connect to from Node.js over OIDC — compared by maturity, features, licensing, and the operational cost that decides whether they are worth it.

---

## What is it?

A **self-hosted identity server** (identity provider, IdP) is a standalone service that owns users, credentials, and login flows, and that your applications trust over standard protocols — mostly **OpenID Connect**, sometimes SAML. It does what a managed provider does, but on infrastructure you control. Your Node.js app does not import the IdP as a library; it acts as an OIDC client (a "relying party") that redirects users to the IdP and verifies the tokens it returns.

> Licensing, pricing, and CVE data in this article were checked against official sources in **October 2026**.

---

## Why does it matter?

A self-hosted IdP gives you what a managed provider offers — SSO across apps, MFA, social and enterprise federation, an admin console — without per-user fees and without your users' data leaving your infrastructure. That matters when:

- data residency or regulation forbids sending identities to a vendor;
- many internal apps and services need one login and one place to manage users;
- user volumes make per-MAU pricing prohibitive.

The trade-off is that the IdP becomes **the most critical service you run**: if it is down, nothing logs in; if it is unpatched, every app behind it is exposed. All four servers below have shipped serious authentication-bypass CVEs in the last two years — patching speed is part of the cost.

---

## How it works

### Architecture

```
            ┌──────────────────────────────┐
 Users ───▶ │  Identity server (your infra) │◀── Admins (console)
            │  users · MFA · SSO · LDAP     │
            └──────┬──────────────┬────────┘
              OIDC │              │ OIDC/SAML
          ┌────────▼───┐    ┌─────▼──────┐
          │ Node app A │    │ Node app B │  …each app is only an OIDC client
          └────────────┘    └────────────┘
```

Running it means: the IdP process (clustered for availability), its database (and cache, for some), backups, TLS, upgrades on the project's release cadence, monitoring of the login path, and a person who follows its security advisories.

### The four main options

#### Keycloak

- **What** — the most mature open-source IdP. Java on Quarkus, Apache-2.0, a **CNCF incubating project** since 2023, with commercial support available as the Red Hat build of Keycloak.
- **Features** — OIDC, OAuth 2.0, SAML 2.0, identity brokering, LDAP/Active Directory federation, realms for isolation, admin and account consoles, and **Organizations** for multi-tenancy (fully supported since version 26).
- **Costs** — heavier footprint (JVM, database, distributed cache when clustered); upgrades across major versions and theme customization take real effort.
- **Recent CVEs** — CVE-2024-8698 (SAML signature validation bypass enabling privilege escalation); CVE-2024-1132 (redirect-URI validation bypass with wildcard redirect URIs).

#### Zitadel

- **What** — a newer IdP written in Go with an event-sourced core (every change is an audit event). Core under **AGPL-3.0 since v3** (APIs, SDKs, and Helm chart remain Apache-2.0; commercial license available). Company-governed.
- **Features** — OIDC-certified, SAML 2.0, LDAP, SCIM 2.0, passkeys, native multi-tenancy with instances and organizations — a good fit for B2B SaaS.
- **Hosting** — self-host on PostgreSQL, or use Zitadel Cloud (billed by daily active users, regions in the US, EU, Australia, and Switzerland).
- **Recent CVEs** — CVE-2025-27507 (IDOR in Admin API endpoints, critical); CVE-2025-64101 (password-reset link built from a forwarded host header, enabling account takeover).

#### Ory (Kratos and Hydra)

- **What** — a set of headless Go services under Apache-2.0: **Kratos** (identity and login flows), **Hydra** (OAuth 2.0/OIDC server), plus optional Keto (permissions) and Oathkeeper (proxy). Company-governed; some enterprise features require the Ory Enterprise License.
- **Features** — passkeys, social login, MFA/TOTP, magic links; API-first with no bundled login UI — you build the screens.
- **Costs** — the most flexible and the most assembly required: several services to deploy, and your own UI to build and secure. Ory Network is the managed alternative.
- **Recent CVEs** — CVE-2024-45042 in Kratos (an MFA assurance-level setting allowed access without a second factor); CVE-2026-33504 in Hydra (SQL injection through forged pagination tokens in admin APIs).

#### Authentik

- **What** — Python/Django core with Go "outposts", MIT-licensed core plus an enterprise edition. Popular with small companies and homelabs.
- **Features** — OIDC, SAML, LDAP, SCIM, RADIUS, and a **proxy/forward-auth** mode that protects apps that have no auth of their own; visual flow editor for login steps.
- **Costs** — lighter to run than Keycloak; fewer large-enterprise references.
- **Recent CVEs** — CVE-2024-47070 (password stage bypass via an unparsable `X-Forwarded-For` when not behind a correctly configured proxy); CVE-2024-52289 (redirect URIs compared as unescaped regex, letting lookalike domains pass); CVE-2025-64521 (deactivated service accounts could still authenticate).

### Comparison

| | Keycloak | Zitadel | Ory | Authentik |
|---|---|---|---|---|
| Language / runtime | Java (Quarkus) | Go | Go | Python + Go |
| License (core) | Apache-2.0 | AGPL-3.0 | Apache-2.0 | MIT |
| Governance | CNCF incubating | Company | Company | Company |
| OIDC / SAML | Yes / Yes | Yes / Yes | Yes / via enterprise or Polis | Yes / Yes |
| LDAP / AD federation | Yes | Yes | No | Yes |
| Multi-tenancy | Realms, Organizations | Native (instances, orgs) | Enterprise license | Limited (brands) |
| Bundled login UI | Yes (themeable) | Yes | No (headless) | Yes (flow editor) |
| Managed offering | Red Hat build, third parties | Zitadel Cloud | Ory Network | None confirmed |
| Operational weight | High | Medium | Medium–high (several services) | Low–medium |
| Best fit | Enterprises, many internal apps, LDAP | B2B SaaS needing multi-tenancy | Teams wanting full UI control | Small orgs, protecting legacy apps |

---

## Examples

The Node.js side is the same for any OIDC-compliant IdP. With `openid-client` (an OpenID-certified relying-party library), the Authorization Code + PKCE flow looks like this:

```ts
// auth/oidc.ts — works against Keycloak, Zitadel, Ory Hydra, or Authentik
import * as client from "openid-client";

const config = await client.discovery(
  new URL(process.env.OIDC_ISSUER!),          // e.g. the realm URL in Keycloak
  process.env.OIDC_CLIENT_ID!,
  process.env.OIDC_CLIENT_SECRET!,
);

// 1. Start login: store verifier + state in a short-lived HttpOnly cookie
export async function startLogin() {
  const codeVerifier = client.randomPKCECodeVerifier();
  const state = client.randomState();
  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: process.env.OIDC_REDIRECT_URI!,
    scope: "openid profile",
    code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
    code_challenge_method: "S256",
    state,
  });
  return { url, codeVerifier, state };
}

// 2. Callback: the library checks state, exchanges the code, and validates the ID token
export async function finishLogin(callbackUrl: URL, codeVerifier: string, state: string) {
  const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState: state,
  });
  const claims = tokens.claims()!;   // sub, iss, aud, exp already verified
  return { userId: claims.sub };     // then create your own app session
}
```

---

## When to use

- Use a self-hosted IdP when data residency, regulation, or contracts require identities to stay in your infrastructure.
- Use one when several apps and services need shared SSO and central user management.
- Choose Keycloak for LDAP/AD-heavy enterprises and broad protocol needs; Zitadel for multi-tenant B2B SaaS; Ory when you want complete control of the UI; Authentik for small teams and for putting auth in front of apps that lack it.
- Keep apps talking to it over standard OIDC so you can switch IdPs later.

## When NOT to use

- Do not self-host without an owner for upgrades, backups, and security advisories — an unpatched IdP exposes every app behind it.
- Do not add one for a single app with simple needs; a library is less infrastructure.
- Do not expose the IdP directly to the internet without the reverse-proxy configuration it expects — several CVEs above depend on forwarded-header handling.
- Do not ignore the AGPL implications of Zitadel's core if you modify and offer it as a service.

---

## References

- [Keycloak](https://www.keycloak.org/) · [Keycloak 26.0.0 release (Organizations)](https://www.keycloak.org/2024/10/keycloak-2600-released.html) · [CNCF — Keycloak joins as incubating project](https://www.cncf.io/blog/2023/04/11/keycloak-joins-cncf-as-an-incubating-project/)
- [NVD — CVE-2024-8698 (Keycloak)](https://nvd.nist.gov/vuln/detail/CVE-2024-8698)
- [Zitadel on GitHub](https://github.com/zitadel/zitadel) · [Zitadel — Moving from Apache to AGPL](https://zitadel.com/blog/apache-to-agpl) · [NVD — CVE-2025-27507](https://nvd.nist.gov/vuln/detail/CVE-2025-27507)
- [Ory Kratos on GitHub](https://github.com/ory/kratos) · [Ory Hydra advisory GHSA-r9w3-57w2-gch2](https://github.com/ory/hydra/security/advisories/GHSA-r9w3-57w2-gch2)
- [Authentik on GitHub](https://github.com/goauthentik/authentik) · [Authentik security advisories](https://docs.goauthentik.io/security/cves/CVE-2024-47070/)
- [openid-client (panva)](https://github.com/panva/openid-client)
- [OpenID Foundation — Certified OpenID implementations](https://openid.net/certification/)
