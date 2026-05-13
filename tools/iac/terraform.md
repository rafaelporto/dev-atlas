# Terraform

> Terraform is an open-source Infrastructure as Code tool that lets you define and provision cloud and on-premises infrastructure using a declarative configuration language, then converge the real world to that declaration with a single command.

---

## What is it?

Terraform is a tool by HashiCorp that lets you describe infrastructure — servers, databases, networks, DNS records, and more — as code. You write configuration files in HCL (HashiCorp Configuration Language), and Terraform figures out what API calls need to happen to make reality match your description.

The key property is declarative: you say what the end state should look like, not the sequence of steps to get there. Terraform computes the steps.

Terraform supports hundreds of platforms through a **provider** model. The same workflow applies whether you are provisioning AWS EC2 instances, GCP Cloud SQL databases, Azure virtual networks, Cloudflare DNS records, or GitHub repository settings.

## Why does it matter?

Before IaC, infrastructure was configured manually through web consoles or ad-hoc scripts. This created several problems:

- **Configuration drift**: the actual state of a system diverges from what anyone intended, and no one knows exactly what is running.
- **No review process**: infrastructure changes bypassed the code review workflow.
- **No reproducibility**: recreating an environment from scratch — for disaster recovery, staging, or a new region — required tribal knowledge and was error-prone.

Terraform solves all three. Configuration lives in version control, changes go through pull requests, and `terraform apply` can recreate an identical environment from zero. The **state file** is the authoritative record of what Terraform has provisioned, enabling precise incremental updates rather than full teardowns on every change.

## How it works

You write `.tf` files declaring **resources**. Each resource block describes one infrastructure object — an S3 bucket, an EC2 instance, a DNS record. Terraform uses a **provider** plugin to translate those resource declarations into the appropriate API calls for the target platform.

The **state file** (`terraform.tfstate`) records the mapping between your configuration and the real objects Terraform created. On every subsequent run, Terraform reads the state file to compute a diff: what needs to be created, updated, or destroyed to reach the declared configuration.

The four commands that make up the standard workflow:

| Command | What it does |
|---|---|
| `terraform init` | Downloads provider plugins and initialises the working directory |
| `terraform plan` | Shows a preview of changes without applying them |
| `terraform apply` | Executes the plan and updates the state file |
| `terraform destroy` | Tears down all resources tracked in the state file |

```
.tf files (HCL)
     ↓
terraform plan  →  diff against state file
     ↓
terraform apply  →  Provider API calls
     ↓
Real Infrastructure  +  updated state file
```

**Modules** are reusable units of configuration — a module might encapsulate everything needed to stand up a VPC, and be called from multiple environments with different variable values. The [Terraform Registry](https://registry.terraform.io) hosts thousands of community and official modules.

Remote **backends** (S3, GCS, Terraform Cloud) store the state file outside of local disk, enabling team collaboration and state locking to prevent concurrent writes.

## Getting Started

Install Terraform:

```bash
# macOS
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Verify
terraform version
```

Create a minimal configuration:

```bash
mkdir terraform-demo && cd terraform-demo
```

Add `main.tf`:

```hcl
terraform {
  required_providers {
    local = {
      source = "hashicorp/local"
    }
  }
}

resource "local_file" "hello" {
  content  = "Hello, Terraform!"
  filename = "hello.txt"
}
```

Run the workflow:

```bash
terraform init    # download providers
terraform plan    # preview changes
terraform apply   # create resources
```

Official quickstart: [https://developer.hashicorp.com/terraform/tutorials/aws-get-started](https://developer.hashicorp.com/terraform/tutorials/aws-get-started)

## Examples

A minimal AWS S3 bucket resource:

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "assets" {
  bucket = var.bucket_name

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id

  versioning_configuration {
    status = "Enabled"
  }
}
```

Input variables:

```hcl
# variables.tf

variable "aws_region" {
  description = "AWS region to deploy resources into"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Globally unique name for the S3 bucket"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. staging, production)"
  type        = string
}
```

Output values:

```hcl
# outputs.tf

output "bucket_arn" {
  description = "ARN of the created S3 bucket"
  value       = aws_s3_bucket.assets.arn
}

output "bucket_domain_name" {
  description = "Domain name of the bucket for use in policies or DNS"
  value       = aws_s3_bucket.assets.bucket_regional_domain_name
}
```

Running the workflow:

```bash
# Initialise the working directory and download the AWS provider
terraform init

# Preview what will be created (safe — no changes applied)
terraform plan -var="bucket_name=my-assets-prod" -var="environment=production"

# Apply the configuration
terraform apply -var="bucket_name=my-assets-prod" -var="environment=production"

# Tear everything down
terraform destroy
```

## When to use

- Provisioning cloud infrastructure: VPCs, subnets, security groups, databases, load balancers, DNS records, IAM roles.
- Managing infrastructure that changes infrequently (daily or less).
- Multi-cloud or multi-environment setups where a single consistent workflow matters — Terraform handles AWS, GCP, and Azure with the same commands.
- Environments that need to be recreated reliably: disaster recovery, staging environments spun up on demand, per-branch preview environments.
- When infrastructure changes need to go through code review before being applied.

## When NOT to use

- Configuring what runs inside a server (OS packages, service configuration files, user accounts) — that is the job of Ansible, Chef, or Puppet.
- Very dynamic infrastructure that changes many times per day. Each `terraform plan` must read the current state and reconcile it with all provider APIs, which can be slow at scale. Purpose-built orchestrators handle high-frequency churn better.
- When your team is already deeply invested in a cloud-native IaC tool like AWS CDK or Pulumi that allows general-purpose programming languages (TypeScript, Python, Go). Those tools offer richer abstractions and better IDE support for teams that prefer imperative logic over HCL.
- One-off manual tasks where the overhead of writing and maintaining a configuration outweighs the benefit.

## References

- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [Terraform Registry — providers and modules](https://registry.terraform.io)
- Brikman, Yevgeniy. *Terraform: Up & Running*. O'Reilly Media.
