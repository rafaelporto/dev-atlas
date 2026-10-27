---
type: concept
tags:
  - tool
  - devops
  - cloud
related:
  - devops/cloud/overview
  - devops/iac/terraform
  - software-engineering/messaging/brokers/google-pubsub
language: null
---

# Google Cloud

> Google's public cloud, strongest in data, analytics, and managed Kubernetes, driven through projects and the `gcloud` CLI.

---

## What is it?

Google Cloud is Google's cloud: you rent virtual machines, storage, databases, and managed services that run on the same global network and data centres as Google Search and YouTube, and pay for what you use. It is the third-largest provider (about 14% of the market in Q1 2026, per Synergy Research) and the one most often praised for developer experience.

## Why does it matter?

- **Data and analytics** — BigQuery, a serverless data warehouse that queries terabytes in seconds without provisioning anything, is the reason many teams choose Google Cloud.
- **Kubernetes** — Google created Kubernetes; GKE (including the fully managed Autopilot mode) is widely regarded as the most polished managed Kubernetes.
- **Simplicity** — the project model, consistent APIs, and the `gcloud` CLI make it the easiest of the three to start with.
- **Serverless containers** — Cloud Run deploys any container image (or source code) as an autoscaling HTTPS service, scaling to zero when idle.

The trade-offs are a smaller catalogue than AWS, a smaller pool of engineers who know it, and a history of product renames and retirements that makes some teams cautious.

## How it works

### Resource hierarchy

```
Organization (your domain, via Cloud Identity / Google Workspace)
 └── Folders                         ← group projects by team or environment; inherit policies
      └── Projects                   ← unit of billing, APIs, quotas, and IAM; has a project ID
           └── Resources (VM, bucket, Cloud SQL instance, …)
                └── in a region (us-central1, southamerica-east1) or zone (us-central1-a)
```

The **project** is the unit you work in every day. Each project is linked to a **billing account**, and each service's API must be **enabled** in the project before use (`gcloud services enable …`). Deleting a project deletes everything in it.

### Identity and access

- **Cloud IAM** grants **roles** (bundles of permissions, e.g. `roles/storage.objectViewer`) to **principals** (Google accounts, groups, service accounts) on a resource. Bindings are inherited down the hierarchy.
- Workloads run as **service accounts**. Prefer **Workload Identity Federation** over downloaded service-account keys for CI and other clouds.
- Local tools and SDKs use **Application Default Credentials** (`gcloud auth application-default login`).

### Core services

| Category | Services |
|---|---|
| Compute | Compute Engine (VMs), Cloud Run (containers and functions), GKE (Kubernetes), App Engine |
| Storage | Cloud Storage (objects), Persistent Disk / Hyperdisk (block), Filestore (files) |
| Databases | Cloud SQL, AlloyDB (PostgreSQL-compatible), Spanner (global relational), Firestore, Bigtable, Memorystore |
| Data and analytics | BigQuery, Dataflow, Dataproc, Looker |
| Networking | VPC (global), Cloud Load Balancing, Cloud CDN, Cloud DNS |
| Messaging | Pub/Sub, Eventarc, Cloud Tasks |
| Operations | Cloud Logging, Cloud Monitoring, Cloud Trace |
| AI | Vertex AI, Gemini models |
| IaC | Infrastructure Manager (Terraform-based), Config Connector |

### Pricing

- Per-second billing for VMs, **sustained use discounts** applied automatically to VMs that run most of the month, and **committed use discounts** for 1- or 3-year commitments; **Spot VMs** for interruptible work.
- Cloud Run and BigQuery bill per use (requests and CPU-seconds; bytes scanned or slots), so idle workloads cost little or nothing.
- **Free Trial**: **$300** in credit for **90 days**. **Free Tier** (always free, monthly): one e2-micro VM in selected US regions, 2 million Cloud Run requests, 5 GB-months of Cloud Storage in US regions, and more.
- **Pricing page**: [cloud.google.com/pricing](https://cloud.google.com/pricing) · **Calculator**: [cloud.google.com/products/calculator](https://cloud.google.com/products/calculator) · **Free Tier**: [cloud.google.com/free](https://cloud.google.com/free)

### Ease of use

The easiest of the three to start: create a project, enable an API, deploy. The console is clean and the `gcloud` CLI is consistent and interactive. See the comparison table in [Cloud Providers Overview](overview.md#ease-of-use).

## Examples

### Install and authenticate the CLI

```bash
# macOS
brew install --cask gcloud-cli
# Linux (interactive installer)
curl https://sdk.cloud.google.com | bash && exec -l $SHELL

gcloud init                                  # log in, pick or create a project, set defaults
gcloud auth login                            # CLI credentials
gcloud auth application-default login        # credentials for SDKs and Terraform
```

### Configurations: switch between projects and accounts

```bash
gcloud config configurations create dev
gcloud config set project my-project-dev
gcloud config set run/region us-central1
gcloud config configurations activate dev
gcloud config list
```

### Enable APIs and check the project

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
gcloud services list --enabled
gcloud projects describe my-project-dev --format="value(projectNumber)"
```

### Object storage (Cloud Storage)

```bash
gcloud storage buckets create gs://my-team-artifacts-1234 --location=us-central1
gcloud storage cp --recursive ./dist gs://my-team-artifacts-1234/site
gcloud storage ls gs://my-team-artifacts-1234/site
gcloud storage rm --recursive gs://my-team-artifacts-1234
```

### Run a container (Cloud Run)

```bash
# from an existing image
gcloud run deploy hello \
  --image=us-docker.pkg.dev/cloudrun/container/hello \
  --allow-unauthenticated

# or straight from source: builds with Cloud Build and deploys
gcloud run deploy my-api --source . --allow-unauthenticated

gcloud run services describe hello --format="value(status.url)"
gcloud run services delete hello
```

### Filter and format output

```bash
gcloud compute instances list \
  --filter="status=RUNNING AND zone~us-central1" \
  --format="table(name,machineType.basename(),zone.basename())"
```

### Guard the bill with a budget

```bash
gcloud billing accounts list
gcloud billing budgets create --billing-account=<billing-account-id> \
  --display-name="monthly-50" --budget-amount=50USD \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9
```

## When to use

- **Data-heavy products** — analytics, event pipelines, and warehousing built around BigQuery, Dataflow, and Pub/Sub.
- **Kubernetes as the platform** — GKE Autopilot removes most node management.
- **Containerised web services with spiky or low traffic** — Cloud Run scales to zero and bills per request.
- **Small teams that want the shortest path from code to a URL** with a managed, consistent toolset.
- **AI/ML workloads** on Vertex AI, TPUs, and Gemini models.

## When NOT to use

- **A small, steady app** — a VPS or developer PaaS is still cheaper and simpler than any hyperscaler.
- **You need a niche managed service** only AWS offers, or the widest third-party integration support.
- **The organisation lives on Microsoft** — Entra ID, Windows Server, and SQL Server licensing fit Azure better.
- **Heavy enterprise procurement or regional presence requirements** — check that the regions and certifications you need exist; the footprint is smaller than AWS and Azure in some countries.
- **Low tolerance for product churn** — Google has renamed or retired services before (e.g. Cloud Functions became Cloud Run functions); pin to core, long-lived services.

## References

- [Google Cloud Documentation](https://cloud.google.com/docs)
- [gcloud CLI overview](https://cloud.google.com/sdk/gcloud) and [gcloud reference](https://cloud.google.com/sdk/gcloud/reference)
- [Google Cloud Pricing](https://cloud.google.com/pricing) and [Pricing Calculator](https://cloud.google.com/products/calculator)
- [Google Cloud Free Program](https://cloud.google.com/free) and [Free Tier usage limits](https://docs.cloud.google.com/free/docs/free-cloud-features)
- [Google Cloud Well-Architected Framework](https://cloud.google.com/architecture/framework)
- [Resource hierarchy](https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy)
