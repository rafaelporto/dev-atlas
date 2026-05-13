# Prometheus

> An open-source monitoring system that collects metrics by scraping HTTP endpoints on a schedule and stores them in a time-series database, providing a powerful query language and alerting engine.

---

## What is it?

Prometheus is an open-source monitoring and alerting system that collects metrics by **scraping** HTTP endpoints at configurable intervals and stores them in a local time-series database (TSDB). It was originally built at SoundCloud and is now a CNCF graduated project. Prometheus defines its own text-based exposition format for metrics and its own query language, PromQL, for querying and aggregating time-series data.

## Why does it matter?

Prometheus has become the de facto standard for metrics collection in Kubernetes and cloud-native environments. Several properties make it well-suited to this context:

- The **pull model** means Prometheus controls the scrape schedule. Adding a new monitoring target requires only a configuration change in Prometheus — the target does not need to know where it is sending data.
- **PromQL** is expressive enough to answer complex operational questions: rate of increase, percentile distributions, per-instance vs. aggregate comparisons, and multi-dimensional label filtering.
- The ecosystem of **exporters** translates the metrics of any system (PostgreSQL, Redis, Linux hosts, Kubernetes nodes) into the Prometheus format, making it possible to monitor the full stack from a single Prometheus server.
- It integrates naturally with Grafana for visualization and with Alertmanager for notification routing.

## How it works

Applications expose metrics at a `/metrics` HTTP endpoint in the **Prometheus exposition format**: plain text lines of the form `metric_name{label="value"} numeric_value`. Prometheus **scrapes** these endpoints on a schedule defined in `prometheus.yml`.

Scraped data is stored in the local **TSDB**. The PromQL engine queries the TSDB to evaluate graphs and alerting rules. When an alerting rule condition is true for a configured duration, Prometheus fires an alert to **Alertmanager**, which deduplicates, groups, silences, and routes notifications to receivers such as Slack, email, or PagerDuty.

**Exporters** are processes that sit alongside systems that do not natively expose Prometheus metrics (e.g. Node Exporter for host metrics, mysqld_exporter for MySQL). They translate internal metrics into the exposition format.

```
Targets
├── App /metrics
├── Node Exporter /metrics  (host metrics)
└── Postgres Exporter /metrics

    ↑ Prometheus scrapes (pull model)

Prometheus Server
├── TSDB (local storage)
├── PromQL (query engine)
└── Alerting rules → Alertmanager
                         ↓
                  Slack / Email / PagerDuty

Prometheus HTTP API → Grafana
```

## Getting Started

Run Prometheus locally with Docker:

```bash
# Create a minimal config
cat > prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]
EOF

docker run -d --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

Open [http://localhost:9090](http://localhost:9090) to access the Prometheus UI and run PromQL queries.

Official quickstart: [https://prometheus.io/docs/prometheus/latest/getting_started/](https://prometheus.io/docs/prometheus/latest/getting_started/)

## Examples

Minimal `prometheus.yml` with a scrape configuration:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "my-service"
    static_configs:
      - targets: ["my-service:8080"]

  - job_name: "node"
    static_configs:
      - targets: ["node-exporter:9100"]

rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ["alertmanager:9093"]
```

PromQL query for the per-second HTTP request rate over the last 5 minutes, broken down by status code:

```promql
sum(rate(http_requests_total[5m])) by (status_code)
```

PromQL query for the 99th-percentile request latency:

```promql
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

Alerting rule that fires when error rate exceeds 5%:

```yaml
groups:
  - name: my-service
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m]))
          > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "Error rate is {{ $value | humanizePercentage }}"
```

## When to use

- Kubernetes-based workloads, where Prometheus is the native metrics standard.
- When you need a flexible time-series query language for dashboards, alerting, and ad-hoc analysis.
- When the pull model fits your infrastructure: targets are reachable from the Prometheus server and scrape schedules are sufficient.
- When you want to monitor the full infrastructure stack using exporters (hosts, databases, message queues).

## When NOT to use

- High-cardinality metrics at very large scale: Prometheus local storage has practical limits. For long-term retention or federation across many clusters, pair it with Thanos or Cortex rather than expecting Prometheus alone to handle it.
- When you need centralized **push-based** metrics collection from agents that cannot be scraped — use Graphite or InfluxDB instead.
- For log aggregation: Prometheus stores numeric metrics, not log lines. Use the ELK stack or Loki for log aggregation.
- When your organization already has a fully managed APM (Datadog, New Relic) and the duplication of instrumentation provides no benefit.

## References

- [Prometheus official docs](https://prometheus.io/docs/)
- [PromQL basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Awesome Prometheus](https://github.com/roaldnefs/awesome-prometheus)
