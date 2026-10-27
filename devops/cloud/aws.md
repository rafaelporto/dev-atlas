---
type: concept
tags:
  - tool
  - devops
  - cloud
related:
  - devops/cloud/overview
  - devops/iac/terraform
  - software-engineering/messaging/brokers/aws-sqs
  - software-engineering/databases/engines/dynamodb
language: null
---

# Amazon Web Services (AWS)

> The largest public cloud: the broadest service catalogue, driven from the console, the `aws` CLI, or IaC — at the cost of the steepest learning curve.

---

## What is it?

Amazon Web Services is Amazon's cloud: you rent servers, storage, databases, and hundreds of other ready-made services from Amazon and pay for what you use. It launched in 2006 with S3 and EC2, defined most of the vocabulary the industry still uses, and remains the largest provider by market share (about 28% in Q1 2026, per Synergy Research).

## Why does it matter?

- **Breadth** — more than 200 services, from plain VMs to managed Kafka, machine learning, satellite ground stations, and IoT. If a managed version of something exists, AWS probably has it.
- **Ecosystem** — the most third-party tools, Terraform modules, tutorials, and engineers who already know it. Hiring and getting help are easier.
- **Maturity** — the longest track record in regions, availability zones, and compliance certifications.

The flip side of breadth is complexity: overlapping services (ECS, EKS, Lambda, Lightsail, Elastic Beanstalk all run code), a dense permission model, and a bill with many dimensions.

## How it works

### Resource hierarchy

```
AWS Organization (management account)
 └── Organizational Units (OUs)            ← group accounts, apply guardrails (SCPs)
      └── AWS accounts                     ← billing + security boundary; one per env/team
           └── Regions (us-east-1, sa-east-1, …)
                └── Availability Zones (us-east-1a, …)
                     └── Resources (EC2 instance, S3 bucket, RDS database, …)
```

The **account** is the unit of isolation. A common setup is one account per environment (dev, staging, prod), created and governed through **AWS Organizations** and **Control Tower**. Most resources live in a region; a few (IAM, Route 53, CloudFront) are global.

### Identity and access

- **IAM** controls who can do what: users, groups, **roles**, and JSON **policies** that allow or deny actions on resources (`s3:GetObject` on `arn:aws:s3:::my-bucket/*`).
- Humans should sign in through **IAM Identity Center** (SSO) and get short-lived credentials; workloads assume **roles**. Long-lived access keys are the classic source of leaks.
- Every resource has an **ARN** (`arn:aws:<service>:<region>:<account-id>:<resource>`), used in policies and CLI calls.

### Core services

| Category | Services |
|---|---|
| Compute | EC2 (VMs), Lambda (functions), ECS + Fargate (containers), EKS (Kubernetes), Lightsail (simple VPS) |
| Storage | S3 (objects), EBS (block disks), EFS (shared files) |
| Databases | RDS and Aurora (relational), DynamoDB (key-value/document), ElastiCache (Redis/Valkey/Memcached) |
| Networking | VPC, Route 53 (DNS), CloudFront (CDN), Elastic Load Balancing, API Gateway |
| Messaging | SQS, SNS, EventBridge, Kinesis, MSK (Kafka) |
| Operations | CloudWatch (metrics, logs), CloudTrail (audit), Systems Manager |
| IaC | CloudFormation, CDK |

> App Runner, the former "simplest way to run a container", stopped accepting new customers on 30 April 2026. AWS points new projects to **ECS Express Mode**.

### Pricing

- Pay-as-you-go per second or hour for compute, per GB-month for storage, per request for serverless; **data transfer out** to the internet and between AZs is billed separately.
- **Savings Plans** and **Reserved Instances** cut compute cost in exchange for a 1- or 3-year commitment; **Spot** instances are cheaper but can be reclaimed with two minutes' notice.
- **Free Tier**: new accounts get up to **$200 in credits** ($100 at sign-up plus up to $100 for exploring services) on a Free plan that lasts up to **6 months**, plus 30+ services with always-free monthly limits.
- **Pricing page**: [aws.amazon.com/pricing](https://aws.amazon.com/pricing/) · **Calculator**: [calculator.aws](https://calculator.aws/) · **Free Tier**: [aws.amazon.com/free](https://aws.amazon.com/free/)

### Ease of use

The hardest of the three to start with: account structure, VPC networking, and IAM decisions come before the first deploy, and the console is dense. Once learned, everything is scriptable and well documented. See the comparison table in [Cloud Providers Overview](overview.md#ease-of-use).

## Examples

### Install and authenticate the CLI

```bash
# macOS
brew install awscli
# Linux (x86_64)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip && sudo ./aws/install

aws --version

# Recommended: SSO with short-lived credentials (prompts for the start URL and region)
aws configure sso --profile dev
aws sso login --profile dev

# Alternative: access keys (avoid for humans)
aws configure --profile ci
```

Profiles live in `~/.aws/config` and `~/.aws/credentials`. Select one per command (`--profile dev`) or per shell (`export AWS_PROFILE=dev`).

### Check who you are and where you are

```bash
aws sts get-caller-identity --profile dev     # account and role in use
aws configure get region --profile dev
aws ec2 describe-regions --query 'Regions[].RegionName' --output text
```

### Object storage (S3)

```bash
aws s3 mb s3://my-team-artifacts-1234 --region us-east-1
aws s3 cp ./dist/ s3://my-team-artifacts-1234/site/ --recursive
aws s3 ls s3://my-team-artifacts-1234/site/
aws s3 rb s3://my-team-artifacts-1234 --force       # delete bucket and contents
```

### Run a container (ECS Express Mode)

Express Mode creates the Fargate service, load balancer, HTTPS endpoint, and auto scaling from one call. It needs a task execution role and an infrastructure role (see the ECS guide in References).

```bash
aws ecs create-express-gateway-service \
  --primary-container "image"="public.ecr.aws/nginx/nginx:latest" \
  --execution-role-arn arn:aws:iam::<account-id>:role/ecsTaskExecutionRole \
  --infrastructure-role-arn arn:aws:iam::<account-id>:role/ecsInfrastructureRoleForExpressServices \
  --monitor-resources
# → https://<service-name>.ecs.<region>.on.aws/
```

### Filter output with `--query` (JMESPath)

```bash
aws ec2 describe-instances \
  --filters Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[].{id:InstanceId,type:InstanceType,az:Placement.AvailabilityZone}' \
  --output table
```

### Guard the bill with a budget

```bash
aws budgets create-budget --account-id <account-id> \
  --budget '{"BudgetName":"monthly-50","BudgetLimit":{"Amount":"50","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}'
```

Add `--notifications-with-subscribers` to alert when actual or forecast spend crosses a threshold.

## When to use

- You need a service only AWS offers, or the widest choice of managed services in one place.
- The team (or the hiring market you draw from) already knows AWS; its knowledge is the most transferable.
- Integrations matter: most SaaS vendors, observability tools, and Terraform modules support AWS first.
- Serverless-heavy architectures — Lambda, DynamoDB, SQS, and EventBridge are the most mature combination of their kind.
- Multi-account governance at scale with Organizations, Control Tower, and service control policies.

## When NOT to use

- **A small app or side project** — a VPS or a developer PaaS is cheaper and needs no VPC, IAM, or NAT gateway decisions.
- **No one to own IAM and cost** — the permission model and the many billing dimensions (NAT gateways, cross-AZ traffic, idle load balancers) punish teams that do not watch them.
- **Data and analytics first** — BigQuery on Google Cloud usually gets a team to insight with less tuning than Redshift.
- **A Microsoft-centred organisation** — Entra ID, Microsoft 365, and Windows/SQL Server licensing fit Azure more naturally.
- **You want the simplest path to "run this container"** — Cloud Run (Google Cloud) or Azure Container Apps get there with fewer prerequisites.

## References

- [AWS Documentation](https://docs.aws.amazon.com/)
- [AWS CLI User Guide](https://docs.aws.amazon.com/cli/latest/userguide/) and [Command Reference](https://docs.aws.amazon.com/cli/latest/reference/)
- [AWS Pricing](https://aws.amazon.com/pricing/) and [AWS Pricing Calculator](https://calculator.aws/)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Amazon ECS — Create your first Express Mode service using the AWS CLI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-getting-started.html)
- [AWS App Runner availability change](https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html)
