# OpenTelemetry

> A vendor-neutral, open standard for instrumenting applications to produce traces, metrics, and logs, allowing telemetry data to be exported to any compatible backend without changing instrumentation code.

---

## What is it?

OpenTelemetry is a CNCF project that provides a unified, vendor-neutral standard for instrumenting applications to produce telemetry data: traces, metrics, and logs. It was formed by merging two previously separate and incompatible projects — OpenTracing and OpenCensus — into a single specification and set of SDKs. The result is one instrumentation layer that any observability backend can consume.

## Why does it matter?

Before OpenTelemetry, instrumenting an application meant committing to a specific vendor's SDK. Switching from Datadog to Jaeger, or adding a second backend, required rewriting instrumentation code throughout the codebase.

OpenTelemetry inverts this relationship: instrument once, export anywhere. An application instrumented with the OTel SDK can send telemetry to Jaeger, Prometheus, Grafana Tempo, Datadog, New Relic, or any OTLP-compatible backend by changing a Collector configuration — not application code. This eliminates vendor lock-in at the instrumentation layer, which is the most expensive layer to change.

## How it works

OpenTelemetry defines three **signals**:

- **Traces** — a trace records the path of a request through a distributed system as a tree of **spans**. Each span captures a name, start and end timestamps, attributes (key-value pairs), and events. Spans are connected across service boundaries by a **trace context** propagated in HTTP headers or message metadata.
- **Metrics** — numerical measurements over time. The three core instrument types are counters (monotonically increasing values), gauges (point-in-time readings), and histograms (distributions of values, e.g. request latency).
- **Logs** — timestamped, structured text records. OTel defines a log data model and correlates log records with traces via trace context fields (`trace_id`, `span_id`).

The **OTel SDK** is a language-specific library added to an application. It provides a `Tracer`, a `Meter`, and a `Logger`, each producing the corresponding signal. Signals are exported over **OTLP** (OpenTelemetry Protocol), the wire format used throughout the ecosystem.

The **OTel Collector** is an optional but recommended standalone process that sits between applications and backends. It receives telemetry, applies processing (filtering, sampling, attribute enrichment), and fans out to one or more exporters.

```
Application
├── OTel SDK (Go/Java/Python/…)
│   ├── Tracer  → Spans
│   ├── Meter   → Metrics
│   └── Logger  → Logs
│         ↓ OTLP
OTel Collector
├── Receivers (OTLP, Prometheus, Jaeger…)
├── Processors (filter, sample, enrich)
└── Exporters
    ├── Jaeger  (traces)
    ├── Prometheus (metrics)
    └── Loki / Elasticsearch (logs)
```

## Getting Started

Install the OTel Collector locally with Docker:

```bash
docker run -d --name otel-collector \
  -p 4317:4317 \
  -p 4318:4318 \
  otel/opentelemetry-collector-contrib:latest
```

Add the OTel SDK to a Go project:

```bash
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
go get go.opentelemetry.io/otel/sdk/trace
```

For other languages, the SDK is available for Java, Python, JavaScript, .NET, Ruby, and more.

Official quickstart: [https://opentelemetry.io/docs/getting-started/](https://opentelemetry.io/docs/getting-started/)

## Examples

Minimal span creation using the OTel Go SDK:

```go
package main

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
)

var tracer = otel.Tracer("my-service")

func processOrder(ctx context.Context, orderID string) error {
    ctx, span := tracer.Start(ctx, "process-order")
    defer span.End()

    span.SetAttributes(attribute.String("order.id", orderID))

    // business logic here

    return nil
}
```

OTel Collector configuration with an OTLP receiver and Jaeger exporter:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true
  prometheus:
    endpoint: 0.0.0.0:8889

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
```

## When to use

- Any new service that needs observability instrumentation.
- When you want to avoid coupling application code to a specific monitoring vendor.
- Microservices architectures where distributed tracing across service boundaries is essential.
- When you need to send the same telemetry to multiple backends simultaneously (e.g. traces to Jaeger and Datadog at the same time).
- When migrating from vendor-specific instrumentation and wanting to standardize across teams.

## When NOT to use

- Simple scripts, CLI tools, or short-lived jobs where observability overhead is not worth the setup cost.
- When you are already heavily invested in a vendor-specific SDK and the instrumentation migration cost outweighs the benefit of standardization.
- Environments where adding a dependency on the OTel SDK is restricted or not feasible.

## References

- [OpenTelemetry official docs](https://opentelemetry.io/docs/)
- [CNCF OpenTelemetry project](https://www.cncf.io/projects/opentelemetry/)
