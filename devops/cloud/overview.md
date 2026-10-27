---
type: concept
tags:
  - concept
  - devops
  - cloud
  - overview
  - comparison
  - decision-support
related:
  - devops/cloud/aws
  - devops/cloud/google-cloud
  - devops/cloud/azure
  - devops/concepts/devops
  - devops/concepts/infrastructure-as-code
  - devops/iac/terraform
language: null
---

# Cloud Providers Overview

> What public cloud is, when renting infrastructure from AWS, Google Cloud, or Azure pays off and when it does not, and how the three compare on ease of use.

---

## What is it?

A public cloud is a company that rents you computers, storage, and ready-made services over the internet, billed by how much you use. Instead of buying servers and putting them in a data centre, you call an API (or click in a web console) and get a virtual machine, a database, or a queue in minutes — and stop paying when you delete it.

Three providers dominate the market: **Amazon Web Services (AWS)**, **Microsoft Azure**, and **Google Cloud**. Together they hold roughly two thirds of global cloud infrastructure spending (Synergy Research, Q1 2026: AWS ~28%, Microsoft ~21%, Google ~14%).

## Why does it matter?

Owning infrastructure means buying hardware ahead of demand, operating it, and replacing it every few years. Renting it changes the economics:

- **No upfront capital** — capacity is an operating expense that follows usage.
- **Elasticity** — scale up for a launch, scale down at night, without owning the peak.
- **Managed services** — databases, queues, identity, and Kubernetes run by the provider, so a small team does not have to operate them.
- **Global reach** — the same API deploys to dozens of regions.

The catch is that cloud is not automatically cheaper. It trades capital cost for a variable bill that grows with traffic, data transfer, and every forgotten resource. Choosing whether to use a hyperscaler at all — and which one — is an architectural decision with years of lock-in behind it.

## How it works

### Service models

```
 You manage ▼            IaaS          PaaS           Serverless / FaaS     SaaS
 ───────────────────────────────────────────────────────────────────────────────
 Application code         you           you            you                   provider
 Runtime / OS             you           provider       provider              provider
 Scaling                  you           shared         provider              provider
 Servers / network        provider      provider       provider              provider
 Example                  EC2, GCE      App Service,   Lambda, Cloud Run,    Microsoft 365,
                          Azure VM      Cloud Run      Azure Functions       Google Workspace
```

The further right, the less you operate — and the more you depend on one provider's model.

### Regions, zones, and shared responsibility

- A **region** is a geographic location (e.g. `us-east-1`, `europe-west1`, `brazilsouth`). A region contains several **availability zones** — isolated data centres with independent power and network. Spreading a service across zones protects it from a single data-centre failure; spreading it across regions protects it from a regional outage.
- Under the **shared responsibility model**, the provider secures the physical infrastructure and the services it manages; you secure what you configure — identities, network rules, data, and your code. Most cloud breaches are misconfigurations on the customer side.

### Pricing model

- **Pay-as-you-go** per second/hour of compute, per GB stored, per request.
- **Commitment discounts** (Savings Plans / Reserved Instances on AWS, committed use discounts on Google Cloud, reservations and savings plans on Azure) trade a 1–3 year commitment for a lower rate.
- **Spot / preemptible** capacity is much cheaper but can be reclaimed at short notice.
- **Data transfer out (egress)** to the internet is billed and is the line item most often underestimated. Data transfer in is usually free.
- Every provider offers a **free tier** and a **pricing calculator**; links are in each provider's article.

### Equivalent services

| Need | AWS | Google Cloud | Azure |
|---|---|---|---|
| Virtual machines | EC2 | Compute Engine | Virtual Machines |
| Containers without a cluster | ECS (Fargate, Express Mode) | Cloud Run | Container Apps |
| Managed Kubernetes | EKS | GKE | AKS |
| Functions | Lambda | Cloud Run functions | Azure Functions |
| Object storage | S3 | Cloud Storage | Blob Storage |
| Managed relational DB | RDS, Aurora | Cloud SQL, AlloyDB | Azure SQL, Database for PostgreSQL/MySQL |
| NoSQL | DynamoDB | Firestore, Bigtable | Cosmos DB |
| Queue / pub-sub | SQS, SNS | Pub/Sub | Service Bus, Event Grid |
| Data warehouse | Redshift | BigQuery | Synapse Analytics, Fabric |
| Identity and access | IAM, IAM Identity Center | Cloud IAM | Microsoft Entra ID, Azure RBAC |
| Infrastructure as Code (native) | CloudFormation, CDK | Infrastructure Manager | Bicep, ARM templates |
| CLI | `aws` | `gcloud` | `az` |

### Ease of use

A qualitative comparison for a developer or small team starting from zero. It reflects the consensus of practitioners, not a benchmark.

| Criterion | AWS | Google Cloud | Azure |
|---|---|---|---|
| Onboarding | Hardest — many services with overlapping scope; account and network setup decisions come first | Easiest — a project is created with sensible defaults and APIs are enabled on demand | Medium — straightforward once the tenant → subscription → resource group hierarchy is understood |
| Web console | Functional but dense; each service has its own look | Clean and consistent | Consistent, but deep blade navigation and many settings per resource |
| CLI | `aws` is complete and stable, but verbose; one command group per service API | `gcloud` is the most ergonomic: consistent verbs, interactive prompts, sensible defaults | `az` is consistent and readable; `az <service> up` commands shorten common deploys |
| Documentation | Exhaustive, sometimes fragmented across guides | Clear, task-oriented | Exhaustive on Microsoft Learn, with good tutorials; naming changes leave stale pages |
| Identity and permissions | Most powerful and most complex: JSON policies, roles, organisations, SSO | Simple role bindings on a resource hierarchy | Easy for teams already on Entra ID; two systems (Entra roles and Azure RBAC) confuse newcomers |
| Free tier for learning | Credits for up to 6 months plus always-free limits | Largest trial credit and a usable always-free tier (e.g. Cloud Run, one small VM) | 30-day credit plus 12 months of selected services |
| Cost predictability | Low — many billable dimensions (NAT gateways, cross-AZ traffic, egress) | Medium — per-second billing and sustained-use discounts; egress still bites | Medium — clearer for Microsoft-licensed workloads; many SKUs per service |

## Examples

The same task — authenticate, create an object storage bucket, upload a file, list, and delete — with each CLI.

```bash
# AWS
aws configure sso                                   # or: aws configure (access keys)
aws s3 mb s3://my-team-artifacts-1234 --region us-east-1
aws s3 cp ./report.csv s3://my-team-artifacts-1234/
aws s3 ls s3://my-team-artifacts-1234/
aws s3 rb s3://my-team-artifacts-1234 --force
```

```bash
# Google Cloud
gcloud auth login
gcloud config set project my-project-id
gcloud storage buckets create gs://my-team-artifacts-1234 --location=us-central1
gcloud storage cp ./report.csv gs://my-team-artifacts-1234/
gcloud storage ls gs://my-team-artifacts-1234/
gcloud storage rm --recursive gs://my-team-artifacts-1234
```

```bash
# Azure — blobs live in a container inside a storage account inside a resource group
az login
az group create --name rg-artifacts --location eastus
az storage account create --name myteamartifacts1234 --resource-group rg-artifacts --sku Standard_LRS
az storage container create --account-name myteamartifacts1234 --name reports --auth-mode login
az storage blob upload --account-name myteamartifacts1234 --container-name reports \
  --file ./report.csv --name report.csv --auth-mode login
az storage blob list --account-name myteamartifacts1234 --container-name reports --auth-mode login -o table
az group delete --name rg-artifacts --yes            # deletes everything in the group
```

The Azure flow has more steps because of its hierarchy, but deleting the resource group cleans up everything at once.

## When to use

- **Variable or unknown load** — launches, seasonal peaks, batch jobs: elasticity is the main economic benefit.
- **A small team that needs managed services** — databases, queues, identity, and Kubernetes the team cannot afford to operate.
- **Global users or compliance in many jurisdictions** — regions on every continent with certifications already in place.
- **Fast experimentation** — infrastructure in minutes, deleted when the experiment ends.
- **Choosing which one**:
  - **AWS** when you need the widest catalogue, the biggest hiring pool, or the most third-party integrations.
  - **Google Cloud** for data and analytics (BigQuery), managed Kubernetes (GKE), and the gentlest developer experience.
  - **Azure** when the organisation already runs on Microsoft — Entra ID, Microsoft 365, .NET, Windows Server, SQL Server licences.

## When NOT to use

- **Small, stable workloads** — a personal project, an internal tool, or a site with steady traffic usually costs a fraction on a VPS (Hetzner, DigitalOcean) or a developer PaaS (Fly.io, Render, Railway, Vercel), with far less configuration.
- **Predictable, heavy, always-on load** — when capacity is flat and high, owned or colocated hardware is often cheaper over three years; elasticity you do not use is a premium you still pay.
- **Egress-heavy products** — video, large downloads, or data replicated across clouds pay per GB out; a CDN or a provider with included bandwidth can change the economics completely.
- **No one to own the bill and the security** — without budgets, tagging, and least-privilege IAM, cloud accounts drift into surprise invoices and public buckets.
- **Multi-cloud "to avoid lock-in" from day one** — it doubles the operational surface for a hypothetical benefit; pick one provider, keep the core portable (containers, Terraform, open-source databases), and revisit later.
- **Strict data sovereignty the provider cannot meet** — check region availability and certifications before committing.

## References

- [The NIST Definition of Cloud Computing (SP 800-145)](https://csrc.nist.gov/pubs/sp/800/145/final)
- [AWS — Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)
- [Google Cloud — Compare AWS and Azure services to Google Cloud](https://cloud.google.com/docs/get-started/aws-azure-gcp-service-comparison)
- [Microsoft Learn — Azure for AWS professionals](https://learn.microsoft.com/en-us/azure/architecture/aws-professional/)
- [CRN — Cloud market share Q1 2026 (Synergy Research data)](https://www.crnasia.com/news-network/2026/cloud-market-share-q1-2026-aws-microsoft-google-battling-in-ai-era)
- [37signals — Why we're leaving the cloud](https://world.hey.com/dhh/why-we-re-leaving-the-cloud-654b47e0)
