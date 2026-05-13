# Jaeger

> An open-source distributed tracing system that tracks the full path of a request across microservices, enabling engineers to visualize latency, identify bottlenecks, and pinpoint failures in a flame graph.

---

## What is it?

Jaeger is an open-source, end-to-end distributed tracing system originally developed by Uber and now a CNCF graduated project. It records the flow of requests across microservices as a tree of **spans**, stores them in a queryable backend, and presents them in a UI that shows every service involved in a request, every hop between them, and the time spent at each step.

## Why does it matter?

In a microservices system, a single user-facing request may touch ten or more services before returning a response. When something is slow or fails, individual service logs reveal what happened within one service, but not how the request flowed through the entire system. Finding the root cause requires correlating logs across multiple services by timestamp — a tedious and error-prone process.

Jaeger solves this by attaching a single **trace ID** to a request at its entry point and propagating it through every downstream call. The result is a complete, structured record of the request's path: every service, every database query, every external call, with exact durations. This turns a multi-service investigation that could take an hour into a matter of seconds in the Jaeger UI.

## How it works

Services are instrumented — via the OpenTelemetry SDK or the Jaeger client libraries — to emit **spans**. A span represents a unit of work: it has a service name, operation name, start timestamp, duration, status, and a set of key-value attributes. Spans belonging to the same request share a **trace ID**. The parent-child relationship between spans (e.g. service A called service B, which called the database) is captured as a span hierarchy, forming a **trace tree**.

Trace context (the trace ID and parent span ID) is propagated across service boundaries in HTTP headers (W3C `traceparent` or Jaeger's own `uber-trace-id` header) or in message metadata.

Spans are sent from services to the **Jaeger Collector**, which validates and writes them to a storage backend. Supported backends include Cassandra, Elasticsearch, and Badger (embedded, for local development). The **Jaeger Query** service exposes an HTTP API and the **Jaeger UI**, where engineers search traces by service, operation, duration range, or tag value, and view them as a flame graph.

```
Request → Service A
             ↓ (trace context propagated)
          Service B
             ↓
          Service C (calls DB)

Jaeger trace view:
├── [A] handle-request         0ms ──────────────── 150ms
│   ├── [B] process-order     5ms ─────────── 130ms
│   │   └── [C] query-db     80ms ─── 120ms
│   └── [A] send-response   140ms ─ 150ms
```

## Getting Started

Run the Jaeger all-in-one image locally:

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

- **UI:** [http://localhost:16686](http://localhost:16686)
- **OTLP gRPC endpoint:** `localhost:4317`
- **OTLP HTTP endpoint:** `localhost:4318`

Configure your OTel Collector (or SDK directly) to export traces to `http://localhost:4318/v1/traces`, then search for traces in the Jaeger UI.

Official quickstart: [https://www.jaegertracing.io/docs/latest/getting-started/](https://www.jaegertracing.io/docs/latest/getting-started/)

## Examples

Start Jaeger locally using the all-in-one Docker image (includes collector, query service, and UI on port 16686):

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

OTel Collector configuration that exports traces to the local Jaeger instance:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:

exporters:
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger]
```

Once traces are flowing, open `http://localhost:16686` in the Jaeger UI. Use the search form to filter traces by service name, operation name, minimum duration, or tag values (e.g. `http.status_code=500`). Click any trace to open the flame graph view.

## When to use

- Microservices architectures where latency analysis or error root-cause investigation across multiple services is required.
- When you need to understand inter-service dependencies at runtime (which services call which, and how often).
- When services are already instrumented with OpenTelemetry and you need a trace storage and query backend.
- During performance optimization work, to identify which part of a request path contributes the most latency.

## When NOT to use

- Monolithic applications: a single process has a single call stack, which is easier to profile with a language profiler than to trace with Jaeger.
- Simple two-service setups where structured logs with a shared request ID are sufficient for debugging.
- When you need long-term trace retention at very high ingestion rates without provisioning a proper storage backend (Cassandra or Elasticsearch). The all-in-one image uses in-memory storage by default and is not suitable for production.

## References

- [Jaeger official docs](https://www.jaegertracing.io/docs/)
- [CNCF Jaeger project](https://www.cncf.io/projects/jaeger/)
