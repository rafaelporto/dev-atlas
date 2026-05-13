# Grafana

> An open-source visualization and analytics platform that connects to any observability data source and renders metrics, logs, and traces as interactive dashboards in a single unified interface.

---

## What is it?

Grafana is an open-source visualization and analytics platform that turns time-series data from any source into interactive dashboards, graphs, and alerts. It connects to dozens of data sources via plugins — including Prometheus, Elasticsearch, Loki, Jaeger, InfluxDB, and SQL databases — and renders the results as configurable panels. Grafana does not store data itself; it is purely a query and visualization layer.

## Why does it matter?

In a mature observability setup, metrics live in Prometheus, logs live in Loki or Elasticsearch, and traces live in Jaeger or Tempo. Without a unified UI, engineers must switch between separate tools to investigate an incident. Grafana provides a **single pane of glass**: the same dashboard can show a Prometheus graph of error rate, a Loki log stream filtered to the same time window, and a Jaeger trace for a failing request — all linked and time-synchronized.

Beyond incident response, Grafana dashboards are JSON documents that can be stored in Git, reviewed in pull requests, and deployed through CI pipelines, making dashboard-as-code a practical reality.

## How it works

Grafana connects to **data sources** through a plugin system. Each plugin knows how to translate Grafana's internal query model into the native query language of the backend (PromQL, Lucene, SQL, TraceQL, etc.). Results are returned as time-series, table, log, or trace data and rendered as **panels**.

A **panel** is a single visualization unit: a graph, bar chart, stat counter, heatmap, table, or log viewer. Panels are arranged on a **dashboard** and share a time range picker. Panels can be linked to each other: clicking a spike on a metrics graph can open a Loki log search for the same time window.

**Dashboard definitions are JSON documents.** They can be exported, imported, version-controlled, and provisioned automatically from files at Grafana startup. The community maintains thousands of pre-built dashboards on grafana.com/dashboards.

**Alerting** in Grafana evaluates queries on a schedule and fires notifications through contact points (Slack, PagerDuty, email, webhook). Alert rules are defined alongside dashboards and can use any connected data source.

**Grafana Cloud** is the managed SaaS option, bundling Grafana, Mimir (Prometheus-compatible), Loki, and Tempo under a single subscription.

```
Data Sources               Grafana
├── Prometheus    ──────→  ├── Dashboards
├── Loki          ──────→  │   ├── Panel (graph)
├── Jaeger        ──────→  │   ├── Panel (logs)
├── Elasticsearch ──────→  │   └── Panel (traces)
└── PostgreSQL    ──────→  └── Alerts → Notification channels
```

## Getting Started

Run Grafana locally with Docker:

```bash
docker run -d --name grafana \
  -p 3000:3000 \
  grafana/grafana-oss
```

Open [http://localhost:3000](http://localhost:3000) — default credentials: `admin` / `admin`.

Add a data source:
1. Go to **Connections > Data sources > Add new data source**.
2. Select **Prometheus** and set the URL to `http://host.docker.internal:9090`.
3. Click **Save & test**.

Then go to **Dashboards > New > Import** and enter dashboard ID `1860` (Node Exporter Full) from Grafana.com to get a pre-built dashboard.

Official quickstart: [https://grafana.com/docs/grafana/latest/getting-started/build-first-dashboard/](https://grafana.com/docs/grafana/latest/getting-started/build-first-dashboard/)

## Examples

Docker Compose snippet to run Grafana alongside Prometheus locally:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  grafana-data:
```

After starting the stack, open `http://localhost:3000`, add Prometheus as a data source pointing to `http://prometheus:9090`, and create a panel with the following PromQL query to graph HTTP request rate:

```promql
sum(rate(http_requests_total[5m])) by (handler)
```

The **Explore** view (accessible from the sidebar) provides an ad-hoc query interface for any data source — useful for investigating incidents without building a full dashboard. Switch between the Prometheus, Loki, and Jaeger data sources in the same Explore view to correlate signals during an investigation.

## When to use

- Visualizing Prometheus metrics with rich graphs, heatmaps, and stat panels.
- Correlating metrics with logs and traces during incident investigation.
- Building operational dashboards for on-call teams that need a shared, always-on view of system health.
- When you need a single observability UI across multiple backends (e.g. Prometheus for metrics and Loki for logs).
- When dashboard definitions need to live in Git and be deployed as code.

## When NOT to use

- As a data store: Grafana queries data, it does not store it. It provides no value without a backend data source.
- When your team only needs simple uptime checks and status pages — lighter tools such as UptimeRobot or Freshping are more appropriate.
- When all monitoring data already lives in a proprietary APM (Datadog, New Relic) that has its own visualization layer and the duplication adds no benefit.

## References

- [Grafana official docs](https://grafana.com/docs/grafana/latest/)
- [Grafana Dashboard gallery](https://grafana.com/grafana/dashboards/)
