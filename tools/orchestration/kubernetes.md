> Kubernetes is an open-source platform for automating the deployment, scaling, and management of containerized applications across clusters of machines.

## What is it?

Kubernetes (also written as K8s) is a system that takes care of running containers across a group of machines. You tell it what you want — how many copies of an application should run, how much memory each one gets, how they should be exposed to traffic — and Kubernetes makes it happen and keeps it that way.

Originally developed by Google and open-sourced in 2014, Kubernetes is now maintained by the Cloud Native Computing Foundation (CNCF) and is the de-facto standard for container orchestration.

## Why does it matter?

Running a single container on a single machine is simple. Running hundreds of containers across dozens of machines, keeping them healthy, routing traffic to them, and updating them without downtime is not. Kubernetes solves that operational complexity by providing:

- **Self-healing**: automatically restarts crashed containers and reschedules them away from failed nodes.
- **Horizontal scaling**: scale a workload up or down with a single command or based on CPU/memory metrics.
- **Rolling deployments and rollbacks**: update applications gradually with zero downtime; roll back instantly if something goes wrong.
- **Service discovery and load balancing**: containers find each other by name; traffic is distributed automatically.
- **Configuration and secret management**: inject environment-specific config without rebuilding images.

## How it works

A Kubernetes cluster has two logical parts: the **control plane** and the **worker nodes**.

The control plane holds the cluster's brain:

- **API Server** — the single entry point for all operations; every tool (`kubectl`, controllers, users) talks to it.
- **Scheduler** — decides which node a new Pod should run on based on available resources and constraints.
- **Controller Manager** — a collection of loops that continuously reconcile actual state with desired state (e.g. ensures the right number of replicas exist).
- **etcd** — a distributed key-value store that holds the entire cluster state.

Worker nodes run the actual workloads:

- **kubelet** — an agent on each node that talks to the API server and ensures the right containers are running.
- **kube-proxy** — maintains network rules so Pods can communicate across nodes.
- **Container runtime** — the engine that actually runs containers (e.g. containerd).

```
┌─────────────────────────────────────────────────┐
│                 Control Plane                   │
│  ┌───────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ API Server│ │Scheduler │ │   Controller  │  │
│  └───────────┘ └──────────┘ │   Manager     │  │
│       ↕                     └───────────────┘  │
│  ┌────────┐                                     │
│  │  etcd  │  (cluster state store)              │
│  └────────┘                                     │
└─────────────────────────────────────────────────┘
          ↕ (kubelet watches API server)
┌──────────────────┐   ┌──────────────────┐
│   Worker Node 1  │   │   Worker Node 2  │
│  ┌────┐ ┌────┐  │   │  ┌────┐ ┌────┐  │
│  │Pod │ │Pod │  │   │  │Pod │ │Pod │  │
│  └────┘ └────┘  │   │  └────┘ └────┘  │
└──────────────────┘   └──────────────────┘
```

Users interact with the cluster by applying **YAML manifests** that declare desired state. The key abstractions are:

| Resource | Purpose |
|---|---|
| **Pod** | Smallest deployable unit; one or more containers sharing a network and storage |
| **Deployment** | Manages a ReplicaSet to keep N copies of a Pod running and handles rollouts |
| **Service** | Stable network endpoint that load-balances traffic to a set of Pods |
| **ConfigMap / Secret** | Inject configuration and sensitive data into Pods without rebuilding images |
| **Ingress** | HTTP/HTTPS routing rules that expose Services to external traffic |

## Getting Started

Install `kubectl` and start a local cluster with Minikube:

```bash
# macOS
brew install kubectl minikube

# Start a local cluster
minikube start --driver=docker

# Verify the cluster is up
kubectl get nodes
```

Deploy a test workload:

```bash
kubectl create deployment hello --image=nginx
kubectl expose deployment hello --port=80 --type=NodePort
minikube service hello
```

Official quickstart: [https://kubernetes.io/docs/tutorials/kubernetes-basics/](https://kubernetes.io/docs/tutorials/kubernetes-basics/)

## Examples

### Deployment manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web-app
          image: my-org/web-app:1.4.2
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
```

### Service manifest

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  selector:
    app: web-app
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

### Common kubectl commands

```bash
# Apply a manifest (create or update)
kubectl apply -f deployment.yaml

# List Pods in the current namespace
kubectl get pods

# Inspect a specific Pod
kubectl describe pod web-app-6d4f8b7c9-xk2lp

# Stream logs from a Pod
kubectl logs -f web-app-6d4f8b7c9-xk2lp

# Execute a command inside a running container
kubectl exec -it web-app-6d4f8b7c9-xk2lp -- /bin/sh

# Check rollout progress
kubectl rollout status deployment/web-app

# Scale a Deployment manually
kubectl scale deployment/web-app --replicas=5
```

## When to use

- You are running multiple services (microservices, APIs, workers) that need independent scaling.
- You need automated rollouts, rollbacks, and self-healing without manual intervention.
- Your team shares infrastructure and needs isolation between workloads (namespaces, RBAC).
- You are deploying to a cloud provider that offers managed Kubernetes (GKE, EKS, AKS) and want to avoid vendor lock-in at the application layer.
- You need fine-grained control over resource allocation, scheduling constraints, or networking.

## When NOT to use

- Your application is a single service without complex scaling requirements — the operational overhead of Kubernetes is not justified.
- Your team has no Kubernetes experience and lacks the time to invest in it; the learning curve is steep and the failure modes are non-obvious.
- A managed PaaS (Heroku, Render, Railway, Fly.io) already covers your deployment needs at a fraction of the complexity.
- You are building a local development environment and do not need to simulate production K8s behavior; Docker Compose is simpler.
- Your workload runs on a single machine and horizontal scaling is not a requirement.

## References

- [Kubernetes official documentation](https://kubernetes.io/docs/home/)
- Lukša, Marko. *Kubernetes in Action*. Manning, 2018.
- [CNCF Kubernetes project page](https://www.cncf.io/projects/kubernetes/)
