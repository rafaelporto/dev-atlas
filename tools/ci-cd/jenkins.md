> Jenkins is an open-source, self-hosted automation server that orchestrates CI/CD pipelines through a Groovy-based pipeline-as-code model and a plugin ecosystem of over 1,800 integrations.

## What is it?

Jenkins is one of the oldest and most widely adopted CI/CD tools. It is a self-hosted automation server written in Java that runs entirely on your own infrastructure. Pipelines are defined in a `Jenkinsfile` using a Groovy DSL, and virtually any language, tool, or deployment target can be integrated through its extensive plugin ecosystem.

## Why does it matter?

Jenkins has no cloud dependency — every execution happens on infrastructure you control. Its plugin ecosystem covers integrations with Git, Docker, Kubernetes, Slack, SonarQube, Artifactory, and hundreds of other tools, making it adaptable to almost any tech stack. For large organizations with complex, multi-stage pipelines and existing on-premises infrastructure, Jenkins remains the most flexible option. Jenkinsfile enables pipeline-as-code, version-controlling the pipeline definition alongside the source code.

## How it works

Jenkins runs as a web application on a **controller** node that manages the UI, job configuration, plugin state, and job scheduling. Work is delegated to **agent** nodes (or the controller itself for simple setups). Pipelines are defined in a `Jenkinsfile` placed at the root of the repository.

Jenkins supports two pipeline syntaxes:

- **Declarative** — structured, opinionated, easier to read; preferred for most use cases.
- **Scripted** — full Groovy scripting for advanced control flow.

Plugins extend the core with SCM polling, Docker image management, cloud provider integrations, notification systems, and more.

```
Jenkins Controller
│
├── Manages: web UI, plugin config, job scheduling
│
└── Delegates to Agent nodes
    ├── Agent 1: build job
    ├── Agent 2: test job
    └── Agent 3: deploy job
```

## Getting Started

Run Jenkins locally with Docker:

```bash
docker run -d --name jenkins \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  jenkins/jenkins:lts
```

Retrieve the initial admin password:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Open [http://localhost:8080](http://localhost:8080), complete the setup wizard, and install suggested plugins.

Create a new **Pipeline** job, paste a `Jenkinsfile`, and click **Build Now**.

Official quickstart: [https://www.jenkins.io/doc/pipeline/tour/getting-started/](https://www.jenkins.io/doc/pipeline/tour/getting-started/)

## Examples

A minimal declarative `Jenkinsfile` for a Go project:

```groovy
pipeline {
  agent any
  stages {
    stage('Build') {
      steps { sh 'go build ./...' }
    }
    stage('Test') {
      steps { sh 'go test ./...' }
    }
    stage('Docker Build') {
      steps { sh 'docker build -t myapp:${BUILD_NUMBER} .' }
    }
  }
}
```

A pipeline with environment variables and post-step notifications:

```groovy
pipeline {
  agent any
  environment {
    REGISTRY = 'registry.example.com'
  }
  stages {
    stage('Build') {
      steps { sh 'go build ./...' }
    }
    stage('Test') {
      steps { sh 'go test -v ./...' }
    }
    stage('Push') {
      steps {
        sh 'docker build -t ${REGISTRY}/myapp:${BUILD_NUMBER} .'
        sh 'docker push ${REGISTRY}/myapp:${BUILD_NUMBER}'
      }
    }
  }
  post {
    failure {
      slackSend channel: '#ci', message: "Build failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
    }
  }
}
```

## When to use

- Large organizations that require full on-premises CI/CD with no external cloud dependency.
- Complex pipelines that need custom integrations not available on hosted platforms.
- Teams with existing Jenkins infrastructure and established Groovy pipeline libraries.
- Environments where fine-grained control over agent topology, resource allocation, and plugin configuration is required.

## When NOT to use

- Small teams or greenfield projects — GitHub Actions or GitLab CI are significantly simpler to set up and maintain.
- Teams without dedicated ops capacity to manage the Jenkins server, its Java runtime, and plugin version compatibility.
- When pipeline security and auditability are critical — Jenkins' large plugin ecosystem increases the attack surface and plugin update management burden.
- When the team's Git platform already provides a well-integrated CI/CD solution.

## References

- [Jenkins official documentation](https://www.jenkins.io/doc/)
- [Jenkins Pipeline syntax reference](https://www.jenkins.io/doc/book/pipeline/syntax/)
