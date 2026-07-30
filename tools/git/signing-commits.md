---
type: how-to
tags:
  - tool
related: []
language: null
---
# How to Sign Git Commits and Tags

> Add a cryptographic signature to commits and tags so anyone can verify they came from you and have not been altered.

---

## Prerequisites

- Git 2.34 or later for SSH signing (recommended). GPG signing works on any modern Git.
- An SSH or GPG key — for SSH signing, the same key you use to push to GitHub/GitLab works.
- For platform verification badges (GitHub's "Verified", GitLab's similar): the signing key must be registered on your account.

---

## Steps

### 1. Choose a signing method

Two options, both supported by GitHub and GitLab:

| Method | Pros | Cons |
|---|---|---|
| **SSH signing** | Reuses existing SSH key. Simple setup. Verification on common hosts works out of the box. | Requires Git ≥ 2.34. Allowed-signers file must be configured for local verification. |
| **GPG signing** | Long-standing, well-tooled. Works in any Git version. Integrates with email signing, package signing, etc. | Key management overhead (passphrases, agents, expiry). |

Below shows SSH first (the easier default), then GPG.

---

### 2A. Configure SSH signing

```bash
# Tell Git to use SSH for signing
git config --global gpg.format ssh

# Point Git at your SSH public key
git config --global user.signingkey ~/.ssh/id_ed25519.pub

# Sign every commit and tag by default
git config --global commit.gpgsign true
git config --global tag.gpgsign true
```

To verify *other people's* SSH-signed commits locally, Git needs an **allowed signers** file that maps emails to public keys:

```bash
# Create allowed-signers
cat > ~/.config/git/allowed_signers <<EOF
<your-email> ssh-ed25519 AAAA...
<teammate-email> ssh-ed25519 AAAA...
EOF

git config --global gpg.ssh.allowedSignersFile ~/.config/git/allowed_signers
```

Now `git log --show-signature` and `git verify-commit` can validate any commit by anyone in that file.

---

### 2B. Configure GPG signing

Generate a key (skip if you already have one):

```bash
gpg --full-generate-key
# Choose: RSA and RSA, 4096 bits, key does not expire (or set 1-2 years).
# Use the same email you commit with.

gpg --list-secret-keys --keyid-format=long
# /Users/you/.gnupg/pubring.kbx
# ------------------------------------
# sec   rsa4096/3AA5C34371567BD2 2026-05-25 [SC]
#       (fingerprint)
# uid                 Your Name <your-email>
```

Configure Git to use it:

```bash
git config --global user.signingkey 3AA5C34371567BD2
git config --global commit.gpgsign true
git config --global tag.gpgsign true
git config --global gpg.program $(which gpg)         # ensure Git finds your gpg binary
```

Export the public key to register with GitHub/GitLab:

```bash
gpg --armor --export 3AA5C34371567BD2
# Copy the entire -----BEGIN PGP PUBLIC KEY BLOCK----- … -----END PGP PUBLIC KEY BLOCK----- output.
```

Paste it into:
- **GitHub:** Settings → SSH and GPG keys → New GPG key.
- **GitLab:** Preferences → GPG Keys → Add new key.

For SSH-signing keys on GitHub, register them under "SSH keys" with a "Signing Key" type.

---

### 3. Make a signed commit

With `commit.gpgsign = true`, ordinary commits are signed automatically:

```bash
git commit -m "feat: add login endpoint"
# GPG/SSH agent may prompt for the key passphrase the first time.
```

To sign on demand without the global default:

```bash
git commit -S -m "feat: add login endpoint"     # GPG
# (SSH uses the same -S flag once configured)
```

Sign tags the same way:

```bash
git tag -s v1.0.0 -m "Release 1.0.0"
```

See [tags-and-releases](tags-and-releases.md) for tag-specific signing context.

---

### 4. Verify signatures

Verify the most recent commit:

```bash
git log --show-signature -1
# commit abc1234... (HEAD -> main)
# gpg: Signature made ...
# gpg: Good signature from "Your Name <your-email>"
```

Or with explicit commands:

```bash
git verify-commit HEAD
git verify-tag v1.0.0
```

Filter the log to signed commits only:

```bash
git log --pretty="format:%h %G? %s"
# G  = good signature
# B  = bad signature
# U  = good, but key is untrusted
# X  = good, but key has expired
# Y  = good, but key has expired (signing key)
# R  = good, but key has been revoked
# E  = signature cannot be checked (e.g. missing key)
# N  = no signature
```

---

### 5. Register your key with the platform

A "Verified" badge on GitHub or GitLab requires:

1. The signing key is registered on your account.
2. The committer email on the commit matches a verified email on that account.
3. The signature is valid.

For SSH signing on GitHub, the key must be added explicitly as a *signing key* (a separate slot from authentication keys, though it can be the same key registered twice).

---

## Verification

Make a test commit and inspect:

```bash
git commit --allow-empty -m "test: verify signing setup"
git log --show-signature -1

# Push and check the platform:
git push
# Open the commit on GitHub/GitLab — look for "Verified".
```

Locally verify someone else's signed commit (requires allowed-signers or their GPG public key in your keyring):

```bash
git verify-commit <hash>
# Output should say "Good signature from ..."
```

---

## Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `error: gpg failed to sign the data` on every commit | `gpg.program` points at the wrong binary, or `tty` is not set | `git config --global gpg.program $(which gpg)`; for some terminals: `export GPG_TTY=$(tty)`. |
| "No secret key" error | `user.signingkey` does not match a key in your keyring | `gpg --list-secret-keys --keyid-format=long`; set the matching key id. |
| GitHub shows "Unverified" but signature is good | Committer email on the commit is not a verified email on the GitHub account | Add and verify the email under GitHub → Settings → Emails. |
| SSH signing fails with "unknown gpg.format ssh" | Git < 2.34 | Upgrade Git. SSH signing requires 2.34+. |
| `--show-signature` says "Can't check signature: public key not found" | The signer's public key is not in your keyring (GPG) or allowed-signers file (SSH) | Import the key (`gpg --recv-keys <id>`) or add the entry to allowed-signers. |
| Pinentry hangs in IDE / non-interactive shells | GUI passphrase prompt cannot show | `export GPG_TTY=$(tty)` in your shell rc; for headless: use a long-running gpg-agent with cached passphrase. |
| Sign every commit feels too verbose | Passphrase prompts on every commit | Configure `gpg-agent` with `default-cache-ttl` and `max-cache-ttl` (e.g. 8 hours) so the passphrase is cached for the session. |

---

## References

- [Pro Git — Git Tools: Signing Your Work](https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work) — canonical reference.
- [git-scm — git-commit(1)](https://git-scm.com/docs/git-commit) — `-S` and related options.
- [GitHub Docs — About commit signature verification](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification).
- [GitHub Docs — Telling Git about your signing key](https://docs.github.com/en/authentication/managing-commit-signature-verification/telling-git-about-your-signing-key) — covers GPG, SSH, and S/MIME.
- [GitLab Docs — Sign commits and tags](https://docs.gitlab.com/ee/user/project/repository/signed_commits/).
- [SSH signing announcement (Git 2.34)](https://github.blog/2021-11-15-highlights-from-git-2-34/#tidbits) — origin of SSH-based commit signing.
