# Ansible

> Ansible is an open-source, agentless automation tool that enforces the desired state of systems — packages, files, services, users — by connecting over SSH and executing declarative YAML playbooks.

---

## What is it?

Ansible is an IT automation tool by Red Hat. You describe the desired state of one or more machines in a **playbook** — a YAML file that reads like a checklist — and Ansible connects to those machines over SSH to enforce that state. It installs packages, writes configuration files, starts services, creates users, and performs any other system administration task you can express as a step.

The defining property that separates Ansible from older automation tools is that it requires no agent software on the managed machines. SSH (or WinRM for Windows) is the only requirement. If you can SSH into a server, Ansible can manage it.

## Why does it matter?

Configuration management without automation has the same problems as infrastructure management without IaC: machines drift from their intended state, and no one knows exactly what is installed or configured where. Ansible addresses this through several properties:

- **Agentless**: no daemon to install, update, or secure on managed nodes. This dramatically lowers the barrier to adoption and reduces the attack surface.
- **Idempotent by design**: running a playbook twice against the same machine produces the same result as running it once. Modules check current state before acting — if `nginx` is already installed and running, the task reports `ok` instead of reinstalling it.
- **Self-documenting**: YAML playbooks are human-readable. A new team member can read a playbook and understand what a server is supposed to look like without deciphering shell scripts.
- **Broad scope**: the same tool handles configuration management, application deployment, rolling updates, and ad-hoc operational tasks.

## How it works

The **control node** is the machine where Ansible runs — your laptop, a CI runner, or a bastion host. No Ansible software runs on the **managed nodes** (the servers being configured).

An **inventory** file lists the managed hosts, either by IP address or hostname, and can group them (e.g., `[webservers]`, `[databases]`). Ansible connects to each host via SSH, copies a small Python script, executes it, and reports the result. The host needs Python installed; nothing else.

A **playbook** is a YAML file containing one or more **plays**. Each play maps a set of hosts (or groups) to a list of **tasks**. Each task calls a **module** — a self-contained unit that knows how to perform one type of action:

| Module | What it does |
|---|---|
| `apt` / `yum` | Install or remove packages |
| `copy` / `template` | Write files to the managed node |
| `service` | Start, stop, enable, or disable a service |
| `user` | Create or manage OS users |
| `command` / `shell` | Run an arbitrary command |

**Templates** use Jinja2 syntax and let you generate configuration files with values interpolated from **variables**. Variables can be defined in the inventory, in separate `vars` files, or passed at runtime via `--extra-vars`.

**Roles** are a standard directory layout for packaging a reusable set of tasks, templates, variables, and handlers. A role called `webserver` might install nginx, write its configuration from a template, and enable the service. Roles are shareable and reusable across projects.

```
Control Node
├── inventory.ini   (list of hosts)
├── playbook.yml    (what to do)
└── roles/
    └── webserver/
        ├── tasks/main.yml
        └── templates/nginx.conf.j2

Ansible connects via SSH (no agent on targets)
     ↓           ↓           ↓
host1         host2         host3
```

**Handlers** are tasks that run only when notified by another task. A common pattern: restart nginx only if its configuration file changed.

## Getting Started

Install Ansible:

```bash
# macOS
brew install ansible

# Verify
ansible --version
```

Create a minimal inventory and playbook:

```bash
# inventory.ini
[local]
localhost ansible_connection=local
```

```yaml
# playbook.yml
- hosts: local
  tasks:
    - name: Print a message
      debug:
        msg: "Hello from Ansible"
```

Run the playbook:

```bash
ansible-playbook -i inventory.ini playbook.yml
```

Official quickstart: [https://docs.ansible.com/ansible/latest/getting_started/index.html](https://docs.ansible.com/ansible/latest/getting_started/index.html)

## Examples

An inventory file:

```ini
# inventory.ini

[webservers]
web-01 ansible_host=10.0.1.10
web-02 ansible_host=10.0.1.11

[databases]
db-01 ansible_host=10.0.2.10

[all:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=~/.ssh/id_rsa
```

A playbook that installs and starts nginx on all web servers:

```yaml
# playbook.yml

- name: Configure web servers
  hosts: webservers
  become: true          # run tasks as root via sudo

  vars:
    http_port: 80

  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true

    - name: Write nginx configuration
      ansible.builtin.template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        owner: root
        group: root
        mode: "0644"
      notify: Restart nginx

    - name: Ensure nginx is started and enabled
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true

  handlers:
    - name: Restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted
```

A Jinja2 template for the nginx configuration:

```nginx
# templates/nginx.conf.j2

events {}

http {
    server {
        listen {{ http_port }};
        server_name {{ inventory_hostname }};

        location / {
            root /var/www/html;
            index index.html;
        }
    }
}
```

The standard directory layout for a role:

```
roles/
└── webserver/
    ├── tasks/
    │   └── main.yml       # task list
    ├── handlers/
    │   └── main.yml       # handlers (e.g., restart service)
    ├── templates/
    │   └── nginx.conf.j2  # Jinja2 templates
    ├── files/
    │   └── index.html     # static files to copy as-is
    ├── vars/
    │   └── main.yml       # role-level variables
    └── defaults/
        └── main.yml       # default values (lowest precedence)
```

Running the playbook:

```bash
# Run the full playbook
ansible-playbook -i inventory.ini playbook.yml

# Dry run — show what would change without applying
ansible-playbook -i inventory.ini playbook.yml --check

# Target only a specific group
ansible-playbook -i inventory.ini playbook.yml --limit webservers

# Override a variable at runtime
ansible-playbook -i inventory.ini playbook.yml --extra-vars "http_port=8080"
```

## When to use

- Configuring servers after they have been provisioned — the natural step after `terraform apply`.
- Deploying application versions across a fleet of servers: stopping a service, writing a new binary or artifact, restarting.
- Enforcing consistent system state across many machines: ensuring the same packages are installed, the same users exist, the same configuration files are present.
- One-off operational tasks across groups of servers: patching, certificate rotation, log collection.

## When NOT to use

- Provisioning cloud resources (VPCs, databases, load balancers) — that is Terraform's job. Ansible has modules for cloud APIs, but they are harder to manage and lack Terraform's state-diffing model.
- Container-based workloads where the application environment is baked into an image at build time. If you are running Docker containers or Kubernetes pods, the image is the unit of configuration, and Ansible adds little value.
- When the overhead of writing and maintaining playbooks exceeds the benefit — a single server that is rarely changed may be faster to configure manually than to automate, especially if the playbook will never be reused.
- Very complex orchestration logic that would be better expressed in a general-purpose language. For those cases, a Python script or a tool like Fabric may be clearer than deeply nested Ansible YAML.

## References

- [Ansible Documentation](https://docs.ansible.com)
- [Ansible Galaxy — community roles registry](https://galaxy.ansible.com)
- Geerling, Jeff. *Ansible for DevOps*. Leanpub.
