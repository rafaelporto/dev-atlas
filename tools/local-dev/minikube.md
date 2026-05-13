# How to Run a Local Kubernetes Cluster with Minikube

> Set up a single-node Kubernetes cluster on your local machine using Minikube, suitable for development and testing without a cloud provider.

---

## Prerequisites

Minikube runs a local Kubernetes cluster inside a VM or container. It supports multiple drivers — Docker, VirtualBox, HyperKit, and QEMU — and ships with optional addons including an ingress controller, a web dashboard, and a metrics server.

Before starting, ensure you have:

- Docker installed and running (used as the default driver; see [Colima](colima.md) for a macOS setup without Docker Desktop)
- `kubectl` installed:
  ```bash
  brew install kubectl
  ```
- At least 2 CPUs and 4 GB of RAM available to allocate to the cluster

## Steps

### 1. Install Minikube

On macOS via Homebrew:

```bash
brew install minikube
```

On Linux, download the binary directly:

```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

### 2. Start the cluster

Start a single-node cluster using the Docker driver. The flags control the resources assigned to the node:

```bash
minikube start --driver=docker --cpus=4 --memory=8g
```

Minikube automatically updates your `~/.kube/config` and sets `minikube` as the active context, so `kubectl` commands target the local cluster immediately after this step.

### 3. Check cluster status

Confirm the cluster is running and all components are healthy:

```bash
minikube status
```

Expected output:

```
minikube
type: Control Plane
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured
```

### 4. Point kubectl at Minikube

Minikube sets the context automatically on start, but if you have switched contexts, restore it explicitly:

```bash
kubectl config use-context minikube
```

### 5. Enable the dashboard addon

The Minikube dashboard provides a web UI for inspecting cluster resources:

```bash
minikube addons enable dashboard
minikube dashboard
```

The second command opens the dashboard in your default browser. It runs in the foreground; press `Ctrl+C` to stop the proxy without stopping the cluster.

### 6. Enable the ingress addon

The ingress addon installs an NGINX ingress controller, required for routing HTTP traffic to services via `Ingress` resources:

```bash
minikube addons enable ingress
```

### 7. Load a local image into Minikube

When developing locally, pushing images to a remote registry just to pull them back is slow. Load an image directly into the Minikube node instead:

```bash
minikube image load myapp:latest
```

Pods that reference `myapp:latest` with `imagePullPolicy: Never` or `imagePullPolicy: IfNotPresent` will use this image without any registry involved.

### 8. Stop and delete the cluster

To stop the cluster while preserving its state:

```bash
minikube stop
```

To permanently delete the cluster and free all disk space it occupied:

```bash
minikube delete
```

## Verification

After starting the cluster, confirm the node is ready:

```bash
kubectl get nodes
```

Expected output:

```
NAME       STATUS   ROLES           AGE   VERSION
minikube   Ready    control-plane   1m    v1.x.x
```

A single node named `minikube` in `Ready` state means the cluster is fully operational.

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Exiting due to RSRC_INSUFFICIENT_CORES` or similar on start | Host machine does not have enough free CPUs or RAM for the requested allocation | Reduce `--cpus` and `--memory` values, or close other resource-heavy applications before starting |
| Image pull errors (`ErrImagePull`, `ImagePullBackOff`) for local images | Minikube cannot reach the image; it is only on the host, not inside the node | Use `minikube image load <image>:<tag>` and set `imagePullPolicy: Never` in the pod spec |
| `docker: Cannot connect to the Docker daemon` when starting with the Docker driver | Docker (or Colima) is not running | Start Docker Desktop or run `colima start` before running `minikube start` |
| `kubectl` commands target the wrong cluster after switching contexts | Active kubeconfig context was changed manually | Run `kubectl config use-context minikube` to restore the correct context |

## References

- [Minikube documentation](https://minikube.sigs.k8s.io/docs/)
- [kubectl cheatsheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
