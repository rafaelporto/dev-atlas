---
type: concept
tags:
  - database
  - backend
related:
  - software-engineering/databases/types/key-value
  - devops/orchestration/kubernetes
language: null
---
# etcd

> A strongly-consistent, distributed key-value store for coordination and configuration — small critical metadata that every node must agree on, backed by the Raft consensus algorithm.

---

## What is it?

etcd is a distributed key-value store built for one job: holding **small amounts of critical data that a cluster of machines must agree on**, with strong consistency. It is not a cache and not a general-purpose database — it stores configuration, service-discovery records, feature flags, leader-election state, and distributed locks, where being *correct and consistent* matters far more than raw throughput.

Its defining property is **strong consistency via Raft consensus**: a majority (quorum) of nodes must acknowledge every write, so every reader sees the same committed value. etcd is an open-source CNCF project (Apache 2.0) and is best known as the **backing store for [Kubernetes](../../../devops/orchestration/kubernetes.md)** — every object in a Kubernetes cluster lives in etcd.

## Why does it matter?

etcd is the source of truth beneath much of modern cloud-native infrastructure. Because Kubernetes stores all cluster state in it, etcd's guarantees — consistency, watchability, durability — directly determine whether an orchestrator behaves correctly. Beyond Kubernetes, it is a standard building block whenever distributed processes need to coordinate: elect a leader, hold a lock, or read a config value that is guaranteed to be the latest committed one.

It matters because it solves the hard part of distributed systems — **agreement** — with a well-understood algorithm, exposing it through a simple key-value API plus primitives (watches, leases) that coordination actually needs.

## How it works

```
        Clients (put / get / watch / lease)
                     │
                     ▼  writes routed to the leader
              ┌────────────┐
              │   Leader    │
              └────────────┘
              ╱      │      ╲    replicate log entry
             ▼       ▼       ▼
        ┌────────┐┌────────┐┌────────┐
        │follower││follower││follower│
        └────────┘└────────┘└────────┘
     a write commits once a QUORUM (majority) has it
     3 nodes tolerate 1 failure · 5 nodes tolerate 2
```

- **Raft consensus**: one node is the elected **leader**; all writes go through it and are replicated to followers as log entries. A write is committed only when a **majority** has persisted it — so etcd is a **CP** system (consistent and partition-tolerant; it sacrifices availability when quorum is lost).
- **MVCC**: etcd keeps a revision history of the keyspace. Every change bumps a global revision number, enabling consistent reads at a point in time and reliable change detection.
- **Watches**: clients subscribe to a key or prefix and receive every subsequent change — the mechanism Kubernetes controllers use to react to state.
- **Leases and TTLs**: keys can be attached to a lease that must be kept alive; when it expires, the keys are deleted. This underpins ephemeral registration, health signaling, and distributed locks.

## Examples

Basic put/get and prefix range with `etcdctl`:

```
etcdctl put /config/feature/new-ui "enabled"
etcdctl get /config/feature/new-ui          # → enabled

etcdctl get --prefix /config/               # all keys under /config/
```

Watch a key for changes (blocks, streaming updates):

```
etcdctl watch /config/feature/new-ui
# → PUT /config/feature/new-ui  "disabled"   (printed when it changes)
```

Ephemeral registration with a lease (service discovery / health):

```
lease=$(etcdctl lease grant 15 | awk '{print $2}')   # 15s TTL
etcdctl put --lease=$lease /services/api/node-1 "10.0.0.7:8080"
etcdctl lease keep-alive $lease   # renew; stop renewing → key auto-deletes
```

## When to use

- **Distributed configuration** — a consistent, watchable source of truth for settings across a cluster.
- **Service discovery** — register nodes with leases so stale entries expire automatically.
- **Coordination primitives** — leader election, distributed locks, and barriers.
- **Cluster metadata for control planes** — as in Kubernetes, where all state is stored in etcd.
- **When strong consistency beats availability** — you need the latest committed value, and can tolerate rejecting writes if quorum is lost.

## When NOT to use

- **High-throughput or high-write workloads** — consensus caps write rate; etcd is for small, critical data, not firehoses.
- **Large datasets or big values** — the keyspace is meant for kilobytes of metadata, not gigabytes; there are default size limits.
- **Caching or application data** — use [Redis](redis.md)/[Memcached](memcached.md) for caches and a general-purpose database for app state.
- **You need maximum availability during partitions** — a CP system, etcd stops accepting writes when it loses quorum.
- **Blobs, documents, or query-by-value** — etcd retrieves by key/prefix only, with no secondary indexes.

## References

- [etcd Documentation](https://etcd.io/docs/)
- [*In Search of an Understandable Consensus Algorithm (Raft)* — Ongaro & Ousterhout](https://raft.github.io/raft.pdf)
- [Kubernetes — *Operating etcd clusters*](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
