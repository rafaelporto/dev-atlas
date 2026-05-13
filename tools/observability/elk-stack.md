# ELK Stack

> A log aggregation platform composed of Elasticsearch, Logstash, and Kibana that centralizes logs from any source into a single, full-text-searchable store with rich visualization and alerting capabilities.

---

## What is it?

The ELK Stack is a log aggregation and search platform composed of three open-source tools maintained by Elastic: **Elasticsearch** (a distributed search and analytics engine), **Logstash** (a data ingestion and transformation pipeline), and **Kibana** (a web UI for search, visualization, and dashboards). It is also commonly referred to as the **Elastic Stack** when **Beats** — lightweight data shippers — are included alongside the three core components.

Together they form an end-to-end pipeline: collect logs from any source, parse and enrich them, index them for fast search, and explore them through a browser-based interface.

## Why does it matter?

Applications and infrastructure produce log data across dozens of services, hosts, and containers. Without centralization, debugging requires SSH access to individual machines and manual log grepping — slow, error-prone, and unavailable once a container restarts.

The ELK Stack centralizes every log line into a single searchable store. Engineers can perform full-text search across billions of log entries in milliseconds, filter by structured fields (service name, HTTP status code, trace ID), build dashboards for error trends, and configure alerts on anomalous patterns. Long-term log retention also satisfies audit and compliance requirements that cannot be met with ephemeral container logs.

## How it works

**Beats / Logstash** collect logs from their sources and ship them to Elasticsearch.

- **Filebeat** is a lightweight agent that tails log files or container stdout/stderr and forwards lines to Logstash or directly to Elasticsearch.
- **Logstash** receives log data, applies a processing pipeline (parsing with grok patterns, dropping fields, enriching with geo-IP lookups, renaming fields), and outputs to Elasticsearch. It supports complex transformations that Filebeat alone cannot handle.

**Elasticsearch** receives documents (log entries represented as JSON) and indexes them using an **inverted index**, enabling sub-second full-text search and aggregations across very large data sets. It is horizontally scalable: data is distributed across nodes as **shards**, and each shard can have replicas for fault tolerance. Index lifecycle management (ILM) policies automate moving old indices to cheaper storage tiers and eventually deleting them.

**Kibana** connects to Elasticsearch and provides:
- **Discover** — a time-range log search with field filtering and full-text queries.
- **Visualize / Lens** — drag-and-drop chart builder for aggregations over log data.
- **Dashboard** — combined views of multiple visualizations.
- **Alerts** — rules that evaluate Elasticsearch queries on a schedule and fire notifications.

```
Log Sources
├── App stdout/stderr
├── System logs
└── Container logs (Filebeat sidecar)
       ↓
Logstash (parse, filter, enrich)
       ↓
Elasticsearch (index, store, search)
       ↓
Kibana (search UI, dashboards, alerts)
```

## Getting Started

Run the ELK stack locally with Docker Compose. Create a `compose.yml`:

```yaml
services:
  elasticsearch:
    image: elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  kibana:
    image: kibana:8.13.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
```

Start the stack:

```bash
docker compose up -d
```

- **Kibana UI:** [http://localhost:5601](http://localhost:5601)
- **Elasticsearch API:** [http://localhost:9200](http://localhost:9200)

Index a test document and explore it in Kibana's **Discover** view.

Official quickstart: [https://www.elastic.co/guide/en/elasticsearch/reference/current/getting-started.html](https://www.elastic.co/guide/en/elasticsearch/reference/current/getting-started.html)

## Examples

Minimal Docker Compose to run the ELK stack locally (single-node, no authentication — development only):

```yaml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.13.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.13.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
```

Logstash pipeline configuration that reads from stdin, parses a simple Apache log format, and writes to Elasticsearch:

```
input {
  beats {
    port => 5044
  }
}

filter {
  grok {
    match => {
      "message" => "%{COMBINEDAPACHELOG}"
    }
  }
  date {
    match => ["timestamp", "dd/MMM/yyyy:HH:mm:ss Z"]
    target => "@timestamp"
    remove_field => ["timestamp"]
  }
  mutate {
    convert => { "response" => "integer" }
    convert => { "bytes" => "integer" }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "access-logs-%{+YYYY.MM.dd}"
  }
}
```

Once running, open Kibana at `http://localhost:5601`, create a data view pointing to the `access-logs-*` index pattern, and use the Discover tab to search and filter log entries.

## When to use

- Centralizing logs from multiple services, servers, or containers into a single searchable store.
- When you need full-text search over unstructured or semi-structured log data.
- Compliance or audit requirements that mandate long-term, tamper-evident log retention.
- Large-scale log analytics: detecting error patterns, tracking request rates, correlating events across services.
- When Logstash's transformation pipeline is needed to normalize heterogeneous log formats from many different sources.

## When NOT to use

- Metrics collection: Elasticsearch stores documents, not time-series samples. Use Prometheus for numeric metrics with a time-series query model.
- Very small setups or resource-constrained environments: Elasticsearch requires significant RAM (typically 4–8 GB per node minimum in production) and disk I/O. A much lighter alternative for log aggregation is **Loki** (by Grafana Labs), which indexes only metadata labels rather than full text.
- When all logs already feed into a fully managed logging service such as Datadog Logs, AWS CloudWatch Logs, or GCP Cloud Logging — adding the ELK Stack on top duplicates infrastructure cost without adding value.

## References

- [Elastic official docs](https://www.elastic.co/guide/index.html)
- [Elasticsearch reference](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Kibana docs](https://www.elastic.co/guide/en/kibana/current/index.html)
