> GitLab CI is GitLab's built-in continuous integration and delivery system, configured through a single YAML file and executed by GitLab Runner on any machine you control.

## What is it?

GitLab CI is the CI/CD engine embedded inside GitLab. It is configured via a `.gitlab-ci.yml` file at the root of the repository. Pipelines run on **GitLab Runner**, a lightweight agent that can be installed on any server, VM, or container — including your own hardware — making the entire platform fully self-hostable.

## Why does it matter?

GitLab provides a single platform for source control, CI/CD, container registry, package registry, and security scanning. Because GitLab Runner can be installed and executed locally or on private servers, teams in regulated or air-gapped environments can run their entire software delivery pipeline without sending code to a third-party cloud. The deep integration with merge requests — auto-blocking merges on failed pipelines, showing test results and coverage inline — reduces context switching.

## How it works

`.gitlab-ci.yml` defines **stages** (ordered groups) and **jobs** assigned to those stages. All jobs in a stage run in parallel; stages run sequentially. Jobs are dispatched to a GitLab Runner, which supports multiple **executors**:

- `docker` — runs each job in a fresh container (most common)
- `shell` — runs directly on the runner host
- `kubernetes` — schedules jobs as Kubernetes pods

The Runner polls the GitLab API for pending jobs, executes them, and streams logs back. Pipelines can be triggered by pushes, merge requests, schedules, or API calls. To test a job locally, install `gitlab-runner` and run:

```bash
gitlab-runner exec docker <job-name>
```

```
.gitlab-ci.yml
│
├── stages: [build, test, deploy]
│
├── build job  ──► stage: build  ──► runs in golang:1.22 container
├── test job   ──► stage: test   ──► runs in golang:1.22 container
└── deploy job ──► stage: deploy ──► runs on main branch only
```

## Getting Started

No installation needed for GitLab.com. For a self-hosted setup, install GitLab Runner:

```bash
# macOS
brew install gitlab-runner
gitlab-runner install
gitlab-runner start
```

Add a `.gitlab-ci.yml` to the root of your repository:

```yaml
stages:
  - test

test:
  stage: test
  image: alpine
  script:
    - echo "Hello from GitLab CI"
```

Push to GitLab and open **CI/CD > Pipelines** in your project to see the run.

Official quickstart: [https://docs.gitlab.com/ee/ci/quick_start/](https://docs.gitlab.com/ee/ci/quick_start/)

## Examples

A minimal Go pipeline:

```yaml
stages:
  - build
  - test
  - deploy

build:
  stage: build
  image: golang:1.22
  script:
    - go build ./...

test:
  stage: test
  image: golang:1.22
  script:
    - go test ./...

deploy:
  stage: deploy
  script:
    - ./deploy.sh
  only:
    - main
```

Passing a secret from GitLab CI/CD variables:

```yaml
deploy:
  stage: deploy
  script:
    - ./deploy.sh
  environment:
    name: production
  variables:
    DEPLOY_TOKEN: $DEPLOY_TOKEN
  only:
    - main
```

## When to use

- Teams self-hosting their Git platform and needing full on-premises CI/CD.
- Environments where the CI runner must execute on company-owned machines.
- Enterprise teams using GitLab's full DevSecOps platform (SAST, DAST, dependency scanning).
- When a single platform for SCM, CI, and container/package registry reduces operational overhead.

## When NOT to use

- Projects already fully on GitHub, where cross-platform mirroring adds friction.
- Small teams where GitLab's full platform is more infrastructure than the project warrants.
- When the primary need is local pipeline testing — for GitHub Actions specifically, Act is a simpler solution.
- Teams without the capacity to manage a self-hosted GitLab instance and its runners.

## References

- [GitLab CI/CD documentation](https://docs.gitlab.com/ee/ci/)
- [GitLab Runner installation](https://docs.gitlab.com/runner/install/)
