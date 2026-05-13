# SonarQube

> An open-source platform that continuously inspects code quality by running static analysis to detect bugs, vulnerabilities, and code smells across many languages.

---

## What is it?

SonarQube is a platform for continuous inspection of code quality. It performs static analysis — examining source code without executing it — to detect bugs, code smells, security vulnerabilities, and coverage gaps. It supports over 30 programming languages and integrates with most CI/CD pipelines.

It can be self-hosted in Community, Developer, or Enterprise editions, or used as **SonarCloud**, its managed SaaS offering.

## Why does it matter?

Tests verify that code behaves correctly; SonarQube verifies that code is written safely and sustainably. It surfaces issues that tests routinely miss:

- Unreachable code paths that will never be executed
- Unsafe API usage (e.g. null dereferences, resource leaks)
- Duplicated logic that creates hidden maintenance cost
- Security hotspots and known vulnerability patterns (mapped to OWASP and CWE catalogs)
- Coverage gaps — code that is never exercised by the test suite

The central concept is the **Quality Gate**: a configurable pass/fail threshold evaluated after every analysis. If the gate fails, the CI pipeline is blocked and the code cannot be merged. This makes quality enforcement automatic rather than advisory.

## How it works

A SonarQube **server** hosts the web UI and stores all analysis history. A **SonarScanner** is invoked during CI (or locally) against the project source. The scanner collects metrics and sends them to the server via the SonarQube API. The server then computes a set of measures — bugs, vulnerabilities, code smells, test coverage percentage, code duplication ratio, and maintainability rating — and evaluates those measures against the configured Quality Gate conditions.

```
Developer pushes code
       ↓
CI Pipeline runs SonarScanner
       ↓
Scanner sends results → SonarQube Server
                                ↓
                       Quality Gate evaluated
                       ↓            ↓
                     PASS          FAIL
                  (merge ok)   (pipeline blocked)
```

Key components:

- **Project key** — unique identifier that links scanner output to the correct project on the server.
- **Quality Profile** — the set of active rules for a language (which bugs, smells, and vulnerabilities to detect).
- **Quality Gate** — the pass/fail conditions (e.g. coverage on new code > 80%, zero new critical vulnerabilities).
- **Issues** — individual findings raised by a rule, classified as Bug, Vulnerability, Security Hotspot, or Code Smell.

## Getting Started

Run SonarQube locally with Docker:

```bash
docker run -d --name sonarqube \
  -p 9000:9000 \
  sonarqube:lts-community
```

Open [http://localhost:9000](http://localhost:9000) — default credentials: `admin` / `admin`. Create a project and generate a token.

Run the scanner on your project:

```bash
# Install the scanner (macOS)
brew install sonar-scanner

sonar-scanner \
  -Dsonar.projectKey=my-project \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=YOUR_TOKEN
```

Official quickstart: [https://docs.sonarsource.com/sonarqube/latest/try-out-sonarqube/](https://docs.sonarsource.com/sonarqube/latest/try-out-sonarqube/)

## Examples

**`sonar-project.properties`** — placed at the project root, read by SonarScanner on every run:

```properties
sonar.projectKey=my-org_my-service
sonar.projectName=my-service
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.ts,**/*.spec.ts
sonar.coverage.exclusions=**/migrations/**,**/generated/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info
```

**GitHub Actions step** — runs the scanner and sends results to SonarCloud:

```yaml
- name: SonarCloud Scan
  uses: SonarSource/sonarcloud-github-action@master
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
  with:
    args: >
      -Dsonar.projectKey=my-org_my-service
      -Dsonar.organization=my-org
```

**Quality Gate example condition** — defined in the SonarQube UI or via the API:

```
Coverage on new code    is less than    80%     → FAIL
New critical issues     is greater than  0      → FAIL
Duplicated lines (new)  is greater than 3%      → FAIL
```

When any condition triggers, the gate returns `FAILED` and the pipeline step exits non-zero.

## When to use

- Teams that want automated, objective quality enforcement on every pull request.
- Codebases written in multiple languages where a single, unified quality view is valuable.
- Projects where security scanning (SAST) is a compliance or regulatory requirement (PCI DSS, SOC 2, etc.).
- Organisations onboarding developers who need a shared, visible definition of "good code".

## When NOT to use

- Solo projects or very small scripts where the operational overhead of running a server outweighs the benefit.
- Codebases that already have mature, language-specific linters configured in CI that cover the same categories of checks (e.g. ESLint + TypeScript strict mode + a dedicated security scanner).
- Teams that have not yet defined quality standards — SonarQube amplifies and enforces existing standards; it does not create them. Deploying it before agreeing on thresholds leads to ignored gates and alert fatigue.

## References

- [SonarQube Documentation](https://docs.sonarsource.com/sonarqube/)
- [SonarCloud](https://sonarcloud.io)
