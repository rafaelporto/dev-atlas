---
type: concept
tags:
  - tool
  - devops
  - cloud
related:
  - devops/cloud/overview
  - devops/iac/terraform
  - software-engineering/messaging/brokers/azure-service-bus
language: null
---

# Microsoft Azure

> Microsoft's public cloud, the natural fit for organisations already on Microsoft identity, .NET, and Windows, driven through subscriptions and the `az` CLI.

---

## What is it?

Microsoft Azure is Microsoft's cloud: you rent virtual machines, storage, databases, and managed services from Microsoft and pay for what you use. Launched in 2010, it is the second-largest provider (about 21% of the market in Q1 2026, per Synergy Research), and it is tightly integrated with the rest of Microsoft's stack — Entra ID (formerly Azure Active Directory), Microsoft 365, Windows Server, SQL Server, and .NET.

## Why does it matter?

- **Enterprise integration** — companies that already sign in with Entra ID and license Windows Server or SQL Server get single sign-on, familiar tooling, and licence reuse (Azure Hybrid Benefit) on day one.
- **Hybrid and on-premises** — Azure Arc and Azure Local extend management to servers and Kubernetes clusters outside Azure.
- **.NET first-class** — App Service, Azure Functions, and Visual Studio / GitHub tooling are built with .NET workloads in mind, though Linux, Java, Node.js, and Python are fully supported.
- **AI access** — Azure OpenAI and Azure AI Foundry provide enterprise access to OpenAI and other models.

The trade-offs are a two-layer permission model (Entra roles and Azure RBAC), many SKUs and tiers per service, and frequent renames that leave older documentation behind.

## How it works

### Resource hierarchy

```
Microsoft Entra ID tenant (your organisation's identity directory)
 └── Management groups              ← apply policy and RBAC to many subscriptions
      └── Subscriptions              ← billing and quota boundary; one per env/team
           └── Resource groups       ← lifecycle container: deploy, tag, and delete together
                └── Resources (VM, storage account, App Service, …) in a region (eastus, brazilsouth)
```

Every resource belongs to exactly one **resource group**, which is the everyday unit of work: deleting the group deletes everything in it. **Azure Resource Manager (ARM)** is the API behind the portal, CLI, Bicep, and Terraform.

### Identity and access

- **Microsoft Entra ID** holds users, groups, and app registrations. **Azure RBAC** assigns roles (Owner, Contributor, Reader, or fine-grained ones like Storage Blob Data Reader) to those identities at a management group, subscription, resource group, or resource scope.
- Workloads use **managed identities** instead of stored secrets; CI uses **workload identity federation** (e.g. GitHub Actions OIDC).
- **Azure Policy** enforces rules (allowed regions, required tags) across subscriptions.

### Core services

| Category | Services |
|---|---|
| Compute | Virtual Machines, App Service (web apps), Container Apps, AKS (Kubernetes), Azure Functions |
| Storage | Storage accounts (Blob, Files, Queues, Tables), Managed Disks |
| Databases | Azure SQL Database, Azure Database for PostgreSQL / MySQL, Cosmos DB, Azure Cache for Redis |
| Networking | Virtual Network, Application Gateway, Front Door, Azure DNS, Load Balancer |
| Messaging | Service Bus, Event Grid, Event Hubs |
| Operations | Azure Monitor, Log Analytics, Application Insights |
| Data | Microsoft Fabric, Synapse Analytics, Data Factory |
| IaC | Bicep, ARM templates |

### Pricing

- Pay-as-you-go per second/hour for compute and per GB for storage; **reservations** and **savings plans** for 1- or 3-year commitments; **Spot VMs** for interruptible work.
- **Azure Hybrid Benefit** lets existing Windows Server and SQL Server licences reduce VM and database cost.
- **Free account**: **$200 credit for 30 days**, then **12 months** of selected services free (after upgrading to pay-as-you-go), plus 65+ always-free services within monthly limits.
- **Pricing page**: [azure.microsoft.com/pricing](https://azure.microsoft.com/en-us/pricing/) · **Calculator**: [azure.microsoft.com/pricing/calculator](https://azure.microsoft.com/en-us/pricing/calculator/) · **Free services**: [azure.microsoft.com/pricing/free-services](https://azure.microsoft.com/en-us/pricing/free-services)

### Ease of use

In the middle: the portal and `az` CLI are consistent, and resource groups make clean-up easy, but the tenant → subscription → resource group hierarchy and the Entra/RBAC split take time to absorb. Teams already on Microsoft find it the most familiar. See the comparison table in [Cloud Providers Overview](overview.md#ease-of-use).

## Examples

### Install and authenticate the CLI

```bash
# macOS
brew install azure-cli
# Debian / Ubuntu
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

az version
az login                                     # opens the browser; pick a subscription
az login --use-device-code                   # for headless machines
```

### Pick a subscription and set defaults

```bash
az account list --output table
az account set --subscription "<subscription-name-or-id>"
az account show --query "{name:name, id:id, tenant:tenantId}"

az config set defaults.location=eastus defaults.group=rg-demo
```

### Resource group and object storage (Blob)

```bash
az group create --name rg-demo --location eastus
az storage account create --name myteamartifacts1234 --resource-group rg-demo --sku Standard_LRS
az storage container create --account-name myteamartifacts1234 --name site --auth-mode login
az storage blob upload-batch --account-name myteamartifacts1234 --destination site \
  --source ./dist --auth-mode login
az storage blob list --account-name myteamartifacts1234 --container-name site \
  --auth-mode login --output table
```

`--auth-mode login` uses your Entra identity instead of account keys; it requires a data-plane role such as Storage Blob Data Contributor.

### Run a container (Container Apps)

```bash
az extension add --name containerapp --upgrade
az containerapp up \
  --name hello --resource-group rg-demo --location eastus \
  --image mcr.microsoft.com/k8se/quickstart:latest \
  --target-port 80 --ingress external
az containerapp show --name hello --resource-group rg-demo \
  --query properties.configuration.ingress.fqdn --output tsv
```

### Filter output with `--query` (JMESPath)

```bash
az resource list --resource-group rg-demo \
  --query "[].{name:name, type:type, location:location}" --output table
```

### Guard the bill and clean up

```bash
az consumption budget create --budget-name monthly-50 --amount 50 \
  --category cost --time-grain monthly \
  --start-date 2026-11-01 --end-date 2027-10-31

az group delete --name rg-demo --yes --no-wait   # removes every resource in the group
```

## When to use

- **The organisation runs on Microsoft** — Entra ID, Microsoft 365, Windows Server, SQL Server, .NET: identity, licensing, and tooling carry over.
- **Hybrid estates** — servers and clusters on-premises or in other clouds managed alongside Azure through Arc.
- **Enterprise governance** — management groups, Azure Policy, and RBAC scoped to resource groups suit large, regulated organisations.
- **.NET web apps and APIs** — App Service and Functions deploy them with minimal configuration.
- **Enterprise access to OpenAI models** through Azure OpenAI with private networking and compliance controls.

## When NOT to use

- **A small, steady app** — a VPS or developer PaaS costs less and needs no tenant, subscription, or resource group setup.
- **No Microsoft footprint and no Microsoft-specific need** — the main advantages (identity, licensing) do not apply, and AWS or Google Cloud may be simpler.
- **Analytics-first workloads** — BigQuery on Google Cloud is usually simpler to adopt than Synapse/Fabric.
- **Teams without time to learn Entra plus RBAC** — permission errors across the two layers are a common early blocker.
- **Relying on old tutorials** — services are renamed often (Azure AD → Entra ID, Azure Stack HCI → Azure Local); check the current Microsoft Learn page before following a guide.

## References

- [Azure documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/)
- [Azure CLI documentation](https://learn.microsoft.com/en-us/cli/azure/) and [command reference](https://learn.microsoft.com/en-us/cli/azure/reference-index)
- [Azure Pricing](https://azure.microsoft.com/en-us/pricing/) and [Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)
- [Azure free services](https://azure.microsoft.com/en-us/pricing/free-services) and [Avoid charges with your Azure free account](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/avoid-charges-free-account)
- [Azure Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/)
- [Azure Container Apps — az containerapp up](https://learn.microsoft.com/en-us/azure/container-apps/containerapp-up)
