# Installing Dart

> How to install the Dart SDK on your machine and manage multiple versions using `asdf`.

---

## Prerequisites

- Terminal access (macOS, Linux, or WSL on Windows)
- `curl` available
- (Optional) [`asdf`](https://asdf-vm.com/) for version management

---

## Steps

### 1. Install the Dart SDK

The Dart SDK includes the `dart` CLI, the VM, and the compiler.

**macOS (via Homebrew):**

```bash
brew tap dart-lang/dart
brew install dart
```

**Linux (Debian/Ubuntu):**

```bash
sudo apt-get update
sudo apt-get install apt-transport-https
wget -qO- https://dl-ssl.google.com/linux/linux_signing_key.pub \
  | sudo gpg --dearmor -o /usr/share/keyrings/dart.gpg
echo 'deb [signed-by=/usr/share/keyrings/dart.gpg arch=amd64] https://storage.googleapis.com/download.dartlang.org/linux/debian stable main' \
  | sudo tee /etc/apt/sources.list.d/dart_stable.list
sudo apt-get update
sudo apt-get install dart
```

**Windows:**

Download the `.exe` installer from [dart.dev/get-dart](https://dart.dev/get-dart) and run it.

---

### 2. Add Dart to your PATH

After a manual installation, add the SDK `bin` directory to `PATH`. Add to `~/.zshrc` or `~/.bashrc`:

```bash
export PATH="$PATH:/usr/lib/dart/bin"
```

Homebrew installs set `PATH` automatically.

---

### 3. Manage multiple versions with asdf

`asdf` lets you switch Dart SDK versions per project via a `.tool-versions` file — useful when different projects target different SDK constraints.

**Install the Dart plugin:**

```bash
asdf plugin add dart https://github.com/asdf-community/asdf-dart.git
```

**Install a specific version:**

```bash
asdf install dart 3.4.0
asdf install dart 3.3.4
```

**Set the global default:**

```bash
asdf global dart 3.4.0
```

**Set a per-project version (creates `.tool-versions` in the current directory):**

```bash
asdf local dart 3.3.4
```

When you `cd` into that directory, `asdf` automatically activates the specified version.

---

## Verification

```bash
dart --version      # Dart SDK version: 3.4.0 (stable)
dart pub --version  # Dart pub 3.4.0
```

Write a minimal program to confirm the toolchain works end-to-end:

```bash
mkdir /tmp/hello_dart && cd /tmp/hello_dart
dart create .
dart run             # Hello world!
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `dart: command not found` | SDK not on `PATH` | Add the Dart `bin` dir to `PATH` and reload the shell |
| `pub get` fails with SSL error | System clock out of sync | Sync the clock: `sudo ntpdate pool.ntp.org` |
| Wrong version after `asdf local` | Shims not refreshed | Run `asdf reshim dart` |
| Homebrew installs an older stable version | Formula lag | Run `brew upgrade dart` |

---

## References

- [Get the Dart SDK — dart.dev](https://dart.dev/get-dart)
- [asdf-dart plugin — GitHub](https://github.com/asdf-community/asdf-dart)
- [asdf version manager — official site](https://asdf-vm.com/)
