> Helm is the package manager for Kubernetes, letting you install, upgrade, and roll back applications bundled as versioned, reusable charts with a single command.

## What is it?

Helm is a tool that packages Kubernetes YAML manifests into reusable, versioned units called **charts**. A chart contains everything needed to deploy an application or service to a Kubernetes cluster: resource definitions, default configuration, and metadata.

Just as `apt` manages Debian packages or `npm` manages JavaScript packages, Helm manages Kubernetes applications. You can install a publicly available chart (e.g. a PostgreSQL or Prometheus chart from a chart repository) or write your own for internal applications.

## Why does it matter?

A real-world Kubernetes application typically involves dozens of YAML files — Deployments, Services, ConfigMaps, Secrets, Ingresses, HorizontalPodAutoscalers — with values that repeat across files (image tag, replica count, resource limits). Managing this manually across multiple environments creates duplication and drift.

Helm solves this by:

- **Centralizing configuration** in a single `values.yaml` file, letting you override per-environment without duplicating manifests.
- **Enabling parameterization** through Go template syntax inside manifest files, so one chart serves dev, staging, and production with different values.
- **Tracking release history** — every `helm install` or `helm upgrade` creates a versioned release record stored in the cluster, making `helm rollback` trivial.
- **Distributing applications** via chart repositories, which is the standard way to share and consume Kubernetes-ready software (databases, monitoring stacks, ingress controllers).

## How it works

A **chart** is a directory with a fixed layout:

```
mychart/
├── Chart.yaml          # name, version, description
├── values.yaml         # default configuration values
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    └── _helpers.tpl    # reusable template fragments
```

`Chart.yaml` identifies the chart with a name, a semantic version, and an optional description. `values.yaml` holds the defaults that users can override at install time. The `templates/` directory contains standard Kubernetes manifests with Go template directives (e.g. `{{ .Values.image.tag }}`) that Helm replaces with real values before sending manifests to the Kubernetes API.

When you run `helm install`, Helm:

1. Merges the chart's default `values.yaml` with any overrides you supply.
2. Renders all templates in `templates/` using the merged values.
3. Sends the resulting Kubernetes manifests to the API server.
4. Stores the rendered state as a **release** (a Kubernetes Secret) in the target namespace.

That stored release is what enables `helm upgrade` (which diffs and applies changes) and `helm rollback` (which re-applies a previous revision).

## Getting Started

Install Helm:

```bash
# macOS
brew install helm

# Verify
helm version
```

Add the Bitnami chart repository and install a chart:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install nginx
helm install my-nginx bitnami/nginx

# List installed releases
helm list
```

Official quickstart: [https://helm.sh/docs/intro/quickstart/](https://helm.sh/docs/intro/quickstart/)

## Examples

### values.yaml

```yaml
replicaCount: 2

image:
  repository: my-org/web-app
  tag: "1.4.2"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"
```

### templates/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-web-app
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}-web-app
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}-web-app
    spec:
      containers:
        - name: web-app
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: 8080
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
```

### Common Helm commands

```bash
# Add a chart repository
helm repo add bitnami https://charts.bitnami.com/bitnami

# Update local repository cache
helm repo update

# Install a chart as a new release
helm install my-release ./mychart

# Install with value overrides (inline or from file)
helm install my-release ./mychart --set image.tag=2.0.0
helm install my-release ./mychart -f prod-values.yaml

# Upgrade an existing release
helm upgrade my-release ./mychart -f prod-values.yaml

# Roll back to a previous revision
helm rollback my-release 1

# List all releases in the current namespace
helm list

# Remove a release
helm uninstall my-release
```

## When to use

- You are deploying third-party software to Kubernetes (databases, monitoring stacks, ingress controllers) and want to use a community-maintained chart rather than writing manifests from scratch.
- You manage the same application across multiple environments (dev, staging, production) with different configuration values but identical structure.
- You need versioned, auditable deployments where you can inspect what was deployed at any revision and roll back reliably.
- You are building a platform and want to package internal services so other teams can install them with a single command and override only what they need.

## When NOT to use

- Your application is a single Deployment and one Service — adding a Helm chart introduces more structure than the problem warrants.
- Your team is new to both Kubernetes and Helm simultaneously; Go template syntax inside YAML is a steep debugging experience, and it is better to learn plain `kubectl` first.
- A GitOps tool like ArgoCD or Flux is already handling your deployment rendering and sync loop — Helm can still be used as a source, but introducing it purely for templating may overlap with what your GitOps tool already does.
- You need logic that exceeds what Go templates can cleanly express; at that point, tools like Kustomize or cdk8s may be a better fit.

## References

- [Helm official documentation](https://helm.sh/docs/)
- [Artifact Hub — Helm chart registry](https://artifacthub.io/)
