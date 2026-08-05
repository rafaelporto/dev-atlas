# API Styles

Once you have a transport ([TCP](../transport/tcp.md)/[QUIC](../transport/quic.md)) and an application protocol ([HTTP](../http/http.md)), you still have to decide *how to shape the API itself*: what a request looks like, how the contract is defined, and how client and server stay in sync. These are the three dominant answers.

They are best understood by contrast:

- **REST** — model everything as **resources** addressed by URLs and manipulated with HTTP verbs. Loose, ubiquitous, human-friendly.
- **gRPC** — model everything as **remote procedure calls** with a strict Protobuf contract over HTTP/2. Fast, strongly typed, great for service-to-service.
- **GraphQL** — expose a **single endpoint with a typed schema** and let the client ask for exactly the fields it needs. Flexible reads, no over-/under-fetching.

---

## Articles

| Article | Description |
|---|---|
| [REST](rest.md) | Resource-oriented HTTP APIs — verbs, status codes, statelessness |
| [gRPC](grpc.md) | Contract-first RPC over HTTP/2 with Protobuf and streaming |
| [GraphQL](graphql.md) | A typed query language over a single endpoint — ask for exactly what you need |

---

> There is no universal winner. REST is the safe default for public and CRUD APIs; gRPC excels for internal, high-performance service-to-service calls; GraphQL shines when many clients need different slices of a rich data graph. See the [comparison](../comparison.md) for a side-by-side.
