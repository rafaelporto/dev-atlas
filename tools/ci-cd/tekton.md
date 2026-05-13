> Tekton is a Kubernetes-native CI/CD framework where pipelines, tasks, and their executions are all first-class Kubernetes Custom Resources running as pods on the cluster.

## What is it?

Tekton is an open-source, cloud-native framework for building CI/CD systems on Kubernetes. Pipelines and their building blocks are defined as Kubernetes Custom Resource Definitions (CRDs) and scheduled as pods on any Kubernetes cluster. Tekton is a CNCF graduated project and forms the foundation of Red Hat OpenShift Pipelines.

## Why does it matter?

Tekton brings CI/CD under Kubernetes-native management: pipelines use the same RBAC, secrets management, networking, and resource scheduling as application workloads. Because pipelines run as pods, they scale horizontally with the cluster and can be inspected with standard Kubernetes tooling (`kubectl`, dashboards, monitoring stacks). The framework is provider-agnostic — it runs on any conformant Kubernetes cluster, including local environments like Minikube or kind. Teams on OpenShift get Tekton as a managed, integrated offering.

## How it works

Tekton defines four core CRDs:

- **Task** — a sequence of steps, each of which is a container spec. The containers in a Task share a workspace (volume).
- **TaskRun** — instantiates and executes a Task with specific inputs.
- **Pipeline** — a directed acyclic graph of Tasks, declaring ordering and data flow between them.
- **PipelineRun** — instantiates and executes a Pipeline.

Each Task runs as a Kubernetes Pod; each step inside a Task runs as a container within that pod. **Workspaces** are PersistentVolumeClaims or other volume sources shared between Tasks in a Pipeline.

```
Pipeline
├── Task: clone      (git-clone)   ──► Pod with git container
├── Task: build      (go build)    ──► Pod with golang container
├── Task: test       (go test)     ──► Pod with golang container
└── Task: push       (docker push) ──► Pod with kaniko container

Each Task = one Kubernetes Pod
Each step = one container in that Pod
Workspaces = shared volumes between Tasks
```

## Getting Started

Install Tekton Pipelines on a local Kubernetes cluster (Minikube):

```bash
# Start Minikube
minikube start

# Install Tekton Pipelines
kubectl apply -f https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

# Verify the installation
kubectl get pods -n tekton-pipelines
```

Install the Tekton CLI:

```bash
# macOS
brew install tektoncd-cli
```

Apply a sample Task and run it:

```bash
# Create a task
kubectl apply -f https://raw.githubusercontent.com/tektoncd/pipeline/main/examples/v1/taskruns/task-run.yaml

# List task runs
tkn taskrun list
```

Official quickstart: [https://tekton.dev/docs/getting-started/](https://tekton.dev/docs/getting-started/)

## Examples

A Task that runs Go tests:

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: go-test
spec:
  workspaces:
    - name: source
  steps:
    - name: test
      image: golang:1.22
      workingDir: $(workspaces.source.path)
      script: |
        go test ./...
```

A Pipeline that clones the repository and then runs the task above:

```yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: ci-pipeline
spec:
  workspaces:
    - name: shared-workspace
  tasks:
    - name: clone
      taskRef:
        name: git-clone
      workspaces:
        - name: output
          workspace: shared-workspace
      params:
        - name: url
          value: https://github.com/example/repo.git

    - name: test
      taskRef:
        name: go-test
      runAfter:
        - clone
      workspaces:
        - name: source
          workspace: shared-workspace
```

A PipelineRun that triggers the pipeline:

```yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  name: ci-pipeline-run-1
spec:
  pipelineRef:
    name: ci-pipeline
  workspaces:
    - name: shared-workspace
      volumeClaimTemplate:
        spec:
          accessModes: [ReadWriteOnce]
          resources:
            requests:
              storage: 1Gi
```

## When to use

- Teams fully committed to Kubernetes who want CI/CD to be a first-class citizen of the cluster.
- When CI/CD execution must run on the same cluster as the application workloads, sharing RBAC and secrets management.
- Regulated environments that require Kubernetes-native access control over who can trigger and view pipeline executions.
- Organizations using Red Hat OpenShift, which ships Tekton as its default pipeline engine.

## When NOT to use

- Teams not already using Kubernetes — Tekton requires a cluster and meaningful Kubernetes knowledge to operate.
- When the verbosity of Kubernetes YAML CRDs adds more friction than the Kubernetes-native model provides value.
- Small teams without Kubernetes expertise, where GitHub Actions or GitLab CI deliver the same outcome with far less operational overhead.
- Purely local development workflows — running a Kubernetes cluster locally just to execute CI tasks is disproportionate.

## References

- [Tekton official documentation](https://tekton.dev/docs/)
- [Tekton GitHub repository](https://github.com/tektoncd/pipeline)
- [CNCF Tekton project page](https://www.cncf.io/projects/tekton/)
