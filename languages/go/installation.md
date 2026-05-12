# Installing Go

> How to install Go on your machine and manage multiple versions using `asdf`.

---

## Prerequisites

- Terminal access (macOS, Linux, or WSL on Windows)
- `curl` or `wget` available
- (Optional) [`asdf`](https://asdf-vm.com/) for version management

---

## Steps

### 1. Install Go directly from the official site

Download the latest stable release from [go.dev/dl](https://go.dev/dl/) and follow the platform instructions.

**macOS (via Homebrew):**

```bash
brew install go
```

**Linux:**

```bash
# Download and extract the tarball (replace 1.22.x with the current version)
curl -OL https://go.dev/dl/go1.22.4.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.22.4.linux-amd64.tar.gz
```

**Windows:**

Download the `.msi` installer from [go.dev/dl](https://go.dev/dl/) and run it. The installer sets `PATH` automatically.

---

### 2. Add Go to your PATH

After installation, the Go binary must be on `$PATH`. Add the following to your shell profile (`~/.zshrc`, `~/.bashrc`, or equivalent):

```bash
export PATH=$PATH:/usr/local/go/bin
```

Reload the shell:

```bash
source ~/.zshrc   # or ~/.bashrc
```

---

### 3. Set GOPATH (optional but recommended)

`GOPATH` is the workspace root for Go tools and installed binaries. The default is `~/go`. Add its `bin` directory to `PATH` so that tools installed with `go install` are available everywhere:

```bash
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
```

---

### 4. Manage multiple versions with asdf

`asdf` lets you switch Go versions per project using a `.tool-versions` file — useful when different projects require different Go releases.

**Install the Go plugin:**

```bash
asdf plugin add golang https://github.com/asdf-community/asdf-golang.git
```

**Install a specific version:**

```bash
asdf install golang 1.22.4
asdf install golang 1.21.9
```

**Set the global default:**

```bash
asdf global golang 1.22.4
```

**Set a per-project version (creates `.tool-versions` in the current directory):**

```bash
asdf local golang 1.21.9
```

When you `cd` into that directory, `asdf` automatically activates the specified version.

---

## Verification

```bash
go version          # go version go1.22.4 darwin/arm64
go env GOPATH       # /Users/you/go
go env GOROOT       # /usr/local/go  (or the asdf-managed path)
```

Write a minimal program to confirm the toolchain works end-to-end:

```bash
mkdir /tmp/hello && cd /tmp/hello
go mod init hello
cat > main.go << 'EOF'
package main

import "fmt"

func main() {
    fmt.Println("Go is working.")
}
EOF
go run .            # prints: Go is working.
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `go: command not found` | Go binary not on `PATH` | Add `/usr/local/go/bin` to `PATH` and reload shell |
| `go install`-ed tools not found | `$GOPATH/bin` not on `PATH` | Add `$GOPATH/bin` to `PATH` |
| Wrong version shown after `asdf local` | Shell not reloaded or `asdf` shims not initialised | Run `source ~/.zshrc` and verify `asdf reshim golang` |
| `permission denied` during tarball extraction | Missing `sudo` | Re-run `tar` with `sudo` |
| Homebrew installs an older version | Homebrew formula lags behind | Use `brew upgrade go` or switch to the tarball method |

---

## References

- [Download and install — go.dev](https://go.dev/doc/install)
- [asdf-golang plugin — GitHub](https://github.com/asdf-community/asdf-golang)
- [asdf version manager — official site](https://asdf-vm.com/)
- [Go environment variables — go.dev](https://pkg.go.dev/cmd/go#hdr-Environment_variables)
