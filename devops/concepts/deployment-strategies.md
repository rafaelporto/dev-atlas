---
type: concept
tags:
  - concept
  - devops
related:
  - devops/concepts/ci-cd
  - devops/concepts/container-orchestration
  - devops/orchestration/kubernetes
language: null
---
# Deployment Strategies

> The different ways to release a new version of a service — trading off downtime, risk, resource cost, and rollback speed.

---

## What is it?

A deployment strategy is the *method* by which you replace the running version of an application with a new one. The naive approach — stop the old version, start the new one — causes downtime and makes a bad release visible to every user at once. Deployment strategies are the established alternatives that reduce or eliminate that risk.

The main strategies are **recreate**, **rolling**, **blue-green**, and **canary**, often combined with **feature flags**.

## Why does it matter?

Every release is a risk: the new version might have a bug that only shows up under real traffic. How you deploy determines two things — whether users experience downtime during the switch, and how quickly and cheaply you can recover when something is wrong.

A good strategy lets you release **without downtime** and **limit the blast radius** so that a bad version affects a small fraction of users before you notice and roll back. This is what makes frequent [CI/CD](ci-cd.md) releases safe: the more often you deploy, the more the deployment mechanism itself needs to be low-risk.

## How it works

The strategies differ in how the old (v1) and new (v2) versions coexist during the switch:

- **Recreate** — stop all v1, then start all v2. Simple, but causes downtime. Fine for dev or where a maintenance window is acceptable.
- **Rolling** — replace instances a few at a time; v1 and v2 serve traffic together until all are v2. No downtime, no extra capacity, but rollback is slow and two versions run simultaneously.
- **Blue-green** — run a full second environment (green = v2) alongside the live one (blue = v1). Switch all traffic at once by flipping a router. Instant rollback (flip back), but needs double the resources.
- **Canary** — send a small percentage of traffic to v2, watch metrics, then gradually increase. Smallest blast radius; more complex to automate.

```
Rolling      : [v1][v1][v1] → [v2][v1][v1] → [v2][v2][v1] → [v2][v2][v2]

Blue-Green   : Blue  [v1][v1][v1]  ← live
               Green [v2][v2][v2]  ← idle, then flip router → live

Canary       : 95% ─► [v1][v1][v1]
                5% ─► [v2]           → ramp 5% → 25% → 50% → 100%
```

**Feature flags** are an orthogonal technique: deploy the code for everyone but keep the new behaviour switched **off**, then enable it for a subset of users at runtime — decoupling *deploy* from *release*.

## Examples

A rolling update controlled by an orchestrator ([Kubernetes](../orchestration/kubernetes.md)) — replace at most one pod at a time, never drop below full capacity:

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0     # keep full capacity during the rollout
      maxSurge: 1           # add one extra pod at a time
```

A canary as a traffic split — 5% to the new version:

```
route:
  - destination: web-v1
    weight: 95
  - destination: web-v2
    weight: 5      # watch error rate/latency here, then raise the weight
```

## When to use

- **Rolling**: the sensible default for stateless services that tolerate two versions at once.
- **Blue-green**: when you need instant rollback and can afford double capacity, or for risky migrations.
- **Canary**: high-traffic, high-stakes services where you want to validate a release on real users first.
- **Feature flags**: when you want to decouple deploying code from releasing a feature, or do gradual/targeted rollouts.

## When NOT to use

- **Blue-green** when double the infrastructure is too expensive, or when the two environments share a stateful database that can't be duplicated.
- **Rolling / canary** for changes that are **not backward compatible** — if v1 and v2 can't run against the same database schema simultaneously, coexistence breaks; sequence the migration first.
- **Canary** without good [observability](observability.md) — you can't judge a canary you can't measure.

## References

- [Martin Fowler — BlueGreenDeployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)
- [Martin Fowler — CanaryRelease](https://martinfowler.com/bliki/CanaryRelease.html)
- [Kubernetes — Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
