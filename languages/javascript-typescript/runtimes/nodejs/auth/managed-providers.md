---
type: concept
tags:
  - language
  - nodejs
  - backend
  - security
  - comparison
related:
  - languages/javascript-typescript/runtimes/nodejs/auth/overview
  - languages/javascript-typescript/runtimes/nodejs/auth/build-vs-buy
  - languages/javascript-typescript/runtimes/nodejs/auth/libraries
  - languages/javascript-typescript/runtimes/nodejs/auth/self-hosted-identity-servers
  - languages/javascript-typescript/runtimes/nodejs/auth/known-vulnerabilities
  - languages/javascript-typescript/frameworks/nextjs/authentication
language: "nodejs"
---
# Managed Identity Providers

> Clerk, Auth0, Supabase Auth, Firebase Authentication, Amazon Cognito, and WorkOS compared for JS/TS applications — what each offers, how it is priced, how hard it is to leave, and the limitations and incidents to know before signing up.

---

## What is it?

A **managed identity provider** is a hosted service that stores your users and credentials and runs the sign-in flows for you. Your application redirects to it (or embeds its components), receives a verified identity back, and never handles passwords directly. Signup, login, password reset, MFA, social and enterprise login, and the related emails are the vendor's code running on the vendor's infrastructure.

> Pricing and feature figures in this article were taken from each vendor's official pages in **October 2026**. They change often — re-check before deciding.

---

## Why does it matter?

A managed provider is the fastest way to ship complete auth — including the expensive parts such as MFA recovery, enterprise SSO, and SCIM provisioning — and it moves the riskiest code out of your repository. The price is a different set of risks:

- **A recurring bill tied to your user count**, plus add-ons that can dominate it.
- **Your users live in someone else's system**: leaving may require their cooperation to export password hashes, or force every user to reset.
- **Their outage and their breach are yours**: the Okta incidents below affected the customers who had delegated identity to it.
- **Shared-responsibility gaps**: several of the largest data exposures linked to these platforms were customer misconfigurations, not vendor bugs.

---

## How it works

### Integration model

```
Browser ──▶ Your app ──redirect / embedded component──▶ Provider (login, MFA, SSO)
   ▲            │                                          │
   └── session ◀┴──── verified identity (OIDC/JWT/SDK) ◀───┘
```

All six expose OIDC or SDK-verified JWTs, and all ship JS/TS SDKs. The difference is how much of your UI and middleware becomes vendor-specific: Clerk and Firebase lean on their own components and SDKs; Auth0, Cognito, and WorkOS can be consumed as plain OIDC.

### Provider by provider

#### Clerk

- **Strengths** — the tightest React/Next.js integration: prebuilt `<SignIn/>`, `<UserButton/>`, and organization components, plus middleware helpers for the App Router. Organizations, enterprise SSO (SAML/OIDC), and — since April 2026 — SCIM directory sync included with an enterprise connection.
- **Pricing** — free Hobby tier up to 50,000 **monthly retained users** (MRU: users who come back after their first day; one-day signups are not billed). Pro is $25/month (with 50k MRU included), then a per-MRU fee that drops with volume. MFA and passkeys require Pro. One enterprise SSO connection is included; more cost $75/month each.
- **Exit** — users can be exported from the Dashboard as CSV including password hashes.
- **Watch out for** — the deep component and SDK integration that makes it fast also makes it the hardest to swap out. CVE-2024-22206 in `@clerk/nextjs` (Jan 2024) let attackers act as other users through a logic flaw in `auth()`/`getAuth()`; fixed in 4.29.3.

#### Auth0 (Okta)

- **Strengths** — the most mature and broadest feature set: every social and enterprise protocol, Actions (hooks in the login pipeline), Organizations, inbound SCIM, fine-grained configuration. Common default for enterprise B2B.
- **Pricing** — free up to 25,000 MAU. Paid plans split into B2C and B2B and climb quickly: at 500 MAU, B2C Essentials is $35/month and B2B Professional $800/month; extra enterprise connections cost $100/month each, and Enterprise MFA is a paid tier or add-on.
- **Exit** — user profiles via the Management API; **password hashes only through a support ticket**, not on the free plan, subject to eligibility review, executive sign-off, a PGP key, and a file that expires after three days.
- **Watch out for** — cost at scale and B2B add-ons. Parent-company incidents: the Lapsus$/Sitel intrusion (January 2022, two customer tenants accessed) and the support-system breach (September–October 2023) in which HAR files with session tokens from 134 customers were accessed and the report of all support-system users was downloaded. Auth0 itself disclosed in 2022 that archives of its pre-2021 code repositories had been obtained by a third party.

#### Supabase Auth

- **Strengths** — users live in **your own Postgres** (`auth.users`), integrated with Row Level Security, so the database enforces per-user access. MFA (TOTP, phone), SAML SSO on Pro, and passkeys in beta since May 2026.
- **Pricing** — free up to 50,000 MAU; Pro from $25/month with 100,000 MAU included, then a fraction of a cent per MAU. SAML users are billed separately.
- **Exit** — the easiest of the group: the data, including bcrypt password hashes, is in a database you can query.
- **Watch out for** — it is most valuable when you use Supabase as your database; on its own it is less complete for B2B (no confirmed organizations or SCIM). The shared-responsibility trap is real: in 2025 (CVE-2025-48757, assigned to the Lovable app builder) researchers found 170 generated apps whose Supabase tables were readable and writable with the public anon key because RLS was never enabled.

#### Firebase Authentication / Google Identity Platform

- **Strengths** — simple, cheap, and well integrated with the rest of Firebase and mobile SDKs. Upgrading to Identity Platform adds MFA, blocking functions, SAML/OIDC, and multi-tenancy without code changes.
- **Pricing** — free up to 50,000 MAU for standard sign-in methods; SAML/OIDC users have a 50-MAU free allowance, then a per-MAU fee; phone auth is billed per SMS.
- **Exit** — `firebase auth:export` exports users with their hashes; the custom scrypt parameters needed to verify them are shown in the console.
- **Watch out for** — weaker fit for B2B: no organization model or SCIM. The ecosystem's best-known failure is again misconfiguration: in 2024 researchers found 916 sites with Firebase backends lacking proper security rules, exposing about 125 million records.

#### Amazon Cognito

- **Strengths** — cheapest option inside AWS, integrates with IAM, API Gateway, ALB, and Amplify. The Essentials tier (default since late 2024) adds a managed login UI, passkeys and passwordless sign-in, and access-token customization; Plus adds threat protection.
- **Pricing** — per MAU by tier (Lite, Essentials, Plus), with a 10,000-MAU free tier on Lite and Essentials; federated SAML/OIDC users are billed separately.
- **Exit** — the hardest: **password hashes cannot be exported**, so leaving means a reset or a lazy-migration flow. Importing hashes into Cognito became possible in July 2026; leaving is still the hard direction.
- **Watch out for** — **standard attributes cannot be changed after a user pool is created**, and required/optional status is fixed; the documented fix is a new pool plus a migration Lambda. Design the schema carefully up front.

#### WorkOS (AuthKit)

- **Strengths** — built around enterprise readiness: SSO with any SAML/OIDC IdP, Directory Sync (SCIM), audit logs, and an admin portal where the customer's IT team configures their own connection. AuthKit adds user management with a hosted UI and Next.js/React SDKs.
- **Pricing** — AuthKit is free up to 1 million MAU; the cost is **per enterprise connection** (around $125/month each for SSO and the same for Directory Sync at low volume).
- **Common pattern** — used alongside a library or another provider purely to add SSO/SCIM for enterprise customers.
- **Watch out for** — the bill scales with the number of enterprise customers rather than users; model it per customer contract.

### Comparison

| | Clerk | Auth0 | Supabase Auth | Firebase / Identity Platform | Cognito | WorkOS |
|---|---|---|---|---|---|---|
| Free tier | 50k MRU | 25k MAU | 50k MAU | 50k MAU | 10k MAU | 1M MAU (AuthKit) |
| Billing driver | Retained users, SSO connections | MAU, plan tier, B2B add-ons | MAU above plan | MAU, SMS | MAU by tier | Enterprise connections |
| Prebuilt UI | Rich React components | Hosted login | Basic | FirebaseUI | Managed login | Hosted AuthKit |
| Passkeys | Yes (paid) | Yes | Beta | Not first-party | Yes (Essentials) | Listed in AuthKit docs |
| Organizations | Yes | Yes | Not native | Tenants | No | Yes |
| Enterprise SSO | Yes | Yes | SAML (Pro) | SAML/OIDC | SAML/OIDC | Core product |
| SCIM | Yes | Yes | No | No | No | Core product |
| Password-hash export | Dashboard CSV | Support ticket, paid plans | Direct (your Postgres) | CLI | Not possible | Check before signing |
| Best fit | Next.js/React apps wanting UI out of the box | Enterprise B2B with complex requirements | Apps already on Supabase | Mobile/Firebase apps, B2C | AWS-native workloads | Adding enterprise SSO/SCIM |

---

## Examples

Keeping the vendor behind your own boundary limits lock-in: the rest of the app asks for a `Session`, not for a Clerk or Auth0 object.

```ts
// lib/auth.ts — the only file that imports the vendor SDK
import { auth } from "@clerk/nextjs/server";

export type Session = { userId: string; orgId: string | null };

export async function getSession(): Promise<Session | null> {
  const { userId, orgId } = await auth();
  return userId ? { userId, orgId: orgId ?? null } : null;
}
// Swapping providers means rewriting this file and the login UI, not every page.
```

---

## When to use

- Use a managed provider when auth is not your differentiator and you want MFA, passkeys, social and enterprise login without owning that code.
- Use Auth0 or WorkOS when enterprise SSO and SCIM are a sales requirement.
- Use Supabase Auth or Firebase when you already use that platform as your backend.
- Use Cognito when the workload is AWS-native and the user schema is stable.
- Model the bill at 10× today's users and with the add-ons you will need, before committing.

## When NOT to use

- Do not adopt one without checking password-hash export; Cognito does not allow it, and Auth0 restricts it.
- Do not let vendor SDK types leak through your codebase; wrap them behind one module.
- Do not assume the vendor protects your data plane: RLS policies and security rules in Supabase and Firebase are your responsibility.
- Do not choose one when data residency or contractual terms forbid sending identities to that vendor or region.
- Do not rely on the provider for authorization inside your domain — it identifies users; you still decide what they may do.

---

## References

- [Clerk — Pricing](https://clerk.com/pricing) · [Exporting users](https://clerk.com/docs/deployments/exporting-users) · [Directory Sync changelog](https://clerk.com/changelog/2026-04-16-directory-sync)
- [NVD — CVE-2024-22206 (@clerk/nextjs)](https://nvd.nist.gov/vuln/detail/CVE-2024-22206)
- [Auth0 — Pricing](https://auth0.com/pricing) · [Export password hashes and MFA secrets](https://auth0.com/docs/manage-users/user-migration/export-password-hashes-and-mfa-secrets)
- [Auth0 — Code repository archives from 2020 and earlier](https://auth0.com/blog/auth0-code-repository-archives-from-2020-and-earlier/)
- [BleepingComputer — Okta breach: 134 customers exposed in October support system hack](https://www.bleepingcomputer.com/news/security/okta-breach-134-customers-exposed-in-october-support-system-hack/)
- [Supabase — Pricing](https://supabase.com/pricing) · [SAML SSO](https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml) · [Passkeys (beta)](https://supabase.com/docs/guides/auth/passkeys)
- [Google Cloud — Firebase Authentication vs Identity Platform](https://docs.cloud.google.com/identity-platform/docs/product-comparison) · [Firebase pricing](https://firebase.google.com/pricing)
- [SecurityWeek — Misconfigured Firebase instances expose 125 million user records](https://www.securityweek.com/misconfigured-firebase-instances-expose-125-million-user-records/)
- [AWS — Amazon Cognito pricing](https://aws.amazon.com/cognito/pricing/) · [Essentials and Plus tiers](https://aws.amazon.com/about-aws/whats-new/2024/11/new-feature-tiers-essentials-plus-amazon-cognito) · [User pool attributes](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html)
- [WorkOS — Pricing](https://workos.com/pricing) · [AuthKit docs](https://workos.com/docs/authkit)
