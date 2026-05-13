# How to Run Docker on macOS with Colima

> Set up Colima as a lightweight, free alternative to Docker Desktop on macOS, providing a Docker-compatible socket without requiring a Docker Desktop license.

---

## Prerequisites

Colima is a macOS tool that runs a Linux VM (using Lima) with a container runtime — Docker or containerd — inside it. It exposes a Docker-compatible socket that existing Docker CLI and Docker Compose workflows use without any changes.

Before starting, ensure you have:

- macOS (Intel or Apple Silicon)
- [Homebrew](https://brew.sh) installed
- Docker CLI installed (provides the `docker` command; does not include a runtime on its own):
  ```bash
  brew install docker
  ```

## Steps

### 1. Install Colima

Colima is distributed via Homebrew.

```bash
brew install colima
```

### 2. Start Colima with sensible defaults

Start the VM and allocate resources. The flags control what the Linux VM is given:

```bash
colima start --cpu 4 --memory 8 --disk 60
```

- `--cpu 4` — number of virtual CPUs assigned to the VM
- `--memory 8` — RAM in gigabytes assigned to the VM
- `--disk 60` — disk image size in gigabytes (used for container layers, volumes, and images)

Adjust these values to your machine's capacity. For most development workloads, 4 CPUs, 8 GB RAM, and 60 GB disk is a reasonable starting point.

### 3. Verify the Docker context

Colima registers itself as a Docker context. Confirm it appears in the list:

```bash
docker context ls
```

Expected output includes a `colima` row:

```
NAME       DESCRIPTION                               DOCKER ENDPOINT
colima *   colima                                    unix:///.../.colima/default/docker.sock
default    Current DOCKER_HOST based configuration   unix:///var/run/docker.sock
```

### 4. Set Colima as the default Docker context

Tell the Docker CLI to use the Colima socket by default so you do not need to pass `--context colima` on every command:

```bash
docker context use colima
```

### 5. Configure auto-start on login (optional)

To have Colima start automatically when you log in to macOS:

```bash
brew services start colima
```

This registers Colima as a launchd service. It will start in the background on login using whatever resource configuration was last used with `colima start`.

## Verification

Run the Docker hello-world image to confirm the socket is reachable and the runtime is functional:

```bash
docker run hello-world
```

A successful run prints a message beginning with `Hello from Docker!` and exits with code 0.

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `Error response from daemon: dial unix ...docker.sock: no such file or directory` on start | Another process (e.g. Docker Desktop) is already holding the default socket | Stop Docker Desktop, then run `docker context use colima` |
| Colima fails to start with a port conflict error | A port the Lima VM needs is already in use on the host | Identify the conflicting process with `lsof -i :<port>` and stop it before restarting Colima |
| Noticeably slow container performance on Apple Silicon | Colima defaults to the `qemu` virtualisation type, which emulates x86 | Restart with `colima start --arch aarch64 --vm-type vz` to use Apple's Virtualization framework instead |
| `no space left on device` inside containers | The disk image allocated at start is full | Run `colima delete` to remove the VM, then `colima start --disk 100` (or larger) to recreate it with more space |

## References

- [Colima on GitHub](https://github.com/abiosoft/colima)
- [Lima project](https://lima-vm.io)
