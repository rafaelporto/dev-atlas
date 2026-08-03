---
type: concept
tags:
  - operating-system
  - macos
  - cli
related:
  - operating-systems/macos/overview
  - operating-systems/macos/shell
  - operating-systems/linux/commands
language: null
---

# macOS Commands

> A reference to the terminal commands that matter on macOS — the standard Unix toolkit plus the macOS-specific utilities that have no Linux equivalent.

---

## What is it?

Because macOS is a Unix system, the everyday file, text, and process commands (`ls`, `cd`, `grep`, `find`, `ps`, `kill`, `chmod`) work as they do on any Unix. This article focuses on what is **different or unique** on macOS: the utilities Apple ships for controlling the GUI, the filesystem, preferences, services, and packaging.

One important detail: macOS ships the **BSD** versions of core utilities, not the GNU ones. So `sed`, `date`, `ls`, and friends take slightly different flags than on Linux.

---

## Why does it matter?

Knowing the macOS-specific commands turns the terminal into a control panel for the whole machine — opening apps, reading/writing preferences, managing services, copying to the clipboard, and scripting installs. And knowing that the tools are **BSD, not GNU**, saves hours of debugging when a Linux one-liner (e.g. `sed -i`) behaves differently on a Mac.

---

## How it works

**Clipboard, files, and the GUI**

| Command | What it does |
|---|---|
| `open <path>` | Open a file/URL/app the way a double-click would (`open .` opens Finder here) |
| `pbcopy` / `pbpaste` | Pipe stdin to the clipboard / paste the clipboard to stdout |
| `mdfind <query>` | Command-line Spotlight search (indexed, fast) |
| `mdls <file>` | Show a file's Spotlight metadata |
| `say <text>` | Text-to-speech |
| `screencapture out.png` | Take a screenshot from the terminal |
| `caffeinate` | Prevent the Mac from sleeping while a command runs |

**System, preferences, and services**

| Command | What it does |
|---|---|
| `sw_vers` / `uname -a` | OS version / kernel info |
| `system_profiler` | Detailed hardware & software report |
| `defaults read/write <domain> <key>` | Read/write app & system preferences (plist) |
| `launchctl` | Load/unload/list `launchd` services (the systemd/cron equivalent) |
| `diskutil` | List, mount, format, and manage APFS/HFS volumes |
| `softwareupdate` | Command-line OS/software updates |
| `sudo purge` | Flush inactive memory / disk cache |

**Package management** (not built in — the ecosystem standard is Homebrew):

| Command | What it does |
|---|---|
| `brew install <pkg>` | Install a CLI package |
| `brew install --cask <app>` | Install a GUI app |
| `brew upgrade` / `brew update` | Upgrade packages / refresh formula index |
| `xcode-select --install` | Install the Command Line Developer Tools (git, clang, make) |

---

## Examples

Everyday macOS-specific one-liners:

```bash
# Copy the output of a command to the clipboard, then paste it elsewhere
git rev-parse HEAD | pbcopy
pbpaste

# Open the current directory in Finder, and a URL in the default browser
open .
open https://developer.apple.com

# Spotlight search from the shell: find PDFs modified recently
mdfind "kind:pdf" | head

# Read and change a system preference: show hidden files in Finder
defaults write com.apple.finder AppleShowAllFiles -bool true
killall Finder   # apply the change

# Keep the machine awake for the duration of a long build
caffeinate -i ./long-build.sh

# List running launchd services
launchctl list | grep -i com.apple
```

BSD vs GNU gotcha — in-place `sed` needs an explicit backup suffix on macOS:

```bash
# macOS (BSD sed): the '' is a required (empty) backup suffix
sed -i '' 's/foo/bar/g' file.txt

# GNU sed (Linux) would instead be:
# sed -i 's/foo/bar/g' file.txt

# Prefer GNU tools? Install and use the 'g'-prefixed versions:
brew install coreutils gnu-sed
gsed -i 's/foo/bar/g' file.txt
```

---

## When to use

- Automating macOS setup: preferences via `defaults`, installs via `brew`, services via `launchctl`.
- Bridging GUI and terminal: `open`, `pbcopy`/`pbpaste`, `screencapture`.
- Writing scripts that must run on a stock Mac — target the BSD tool behaviour.

## When NOT to use

- Don't assume GNU flags — a Linux script using `sed -i`, `date -d`, or `readlink -f` needs adapting (or GNU coreutils installed).
- Don't script against `/System` or `/usr` paths — SIP blocks writes there; install into `/opt/homebrew` or your home.
- Don't reach for `defaults write` on preferences an app has cached in memory without also restarting that app.

---

## References

- [macOS man pages (Apple Developer)](https://developer.apple.com/documentation/os/man-pages)
- [`defaults` command reference (`man defaults`)](https://ss64.com/mac/defaults.html)
- [`launchd` info (launchd.info)](https://www.launchd.info/)
- [Homebrew](https://brew.sh/)
- [ss64 — macOS command reference](https://ss64.com/mac/)
