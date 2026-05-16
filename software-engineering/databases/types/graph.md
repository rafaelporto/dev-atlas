# Graph Databases

> Data is stored as nodes connected by edges, both carrying properties. The queries are traversals: starting from a node, walk the connections.

---

## What is it?

A graph database stores data as a network: **nodes** (also called vertices) represent entities, and **edges** (also called relationships) connect them. Both nodes and edges can carry **properties** — arbitrary key-value attributes.

There are two main flavours:

- **Property graphs** (Neo4j, JanusGraph, ArangoDB, Memgraph): nodes and edges are first-class objects with labels and properties. Queried with **Cypher**, **Gremlin**, or **GQL** (the upcoming ISO standard).
- **RDF triple stores** (Apache Jena, Stardog, Blazegraph): data is stored as `(subject, predicate, object)` triples. Queried with **SPARQL**. More common in semantic-web and knowledge-graph contexts.

The defining feature of a graph database is that **relationships are stored as first-class data**, not as foreign keys computed at query time. Following an edge is a pointer dereference, not a hash-join.

## Why does it matter?

Graph databases solve one specific problem that no other database solves well: **multi-hop traversal of highly connected data**.

- **"Friends of friends"** in a social network is one hop in graph; in SQL it is a self-join. Three hops is three joins. Six hops is unusable.
- **Fraud rings, money flows, supply chains** — domains where the *pattern of connections* is the query.
- **Recommendations** based on shared connections, similar interests, or paths between users and items.
- **Knowledge graphs** where the same entity appears in many relationships of many types.

When the question you are asking is shaped like "starting here, walk the connections looking for…", you want a graph database. When it isn't, you almost certainly don't.

## How it works

Property graphs are usually stored with **index-free adjacency**: each node carries direct pointers to its edges, and each edge carries direct pointers to its endpoints. Traversing an edge is O(1), regardless of database size.

```
                    [knows]                    [works_at]
   (Alice)─────────────────────▶(Bob)─────────────────────▶(Acme)
      │                          │                            ▲
      │                          │ [works_at]                 │
      │ [follows]                ▼                            │
      ▼                       (Acme)                          │
   (Carol)                                                    │
      │  [works_at since:2024]                                │
      └────────────────────────────────────────────────────────┘

   Nodes:  Alice, Bob, Carol, Acme
   Edges:  knows, follows, works_at (with properties)
```

Query languages are designed around **pattern matching**: you draw a small graph in the query, and the engine finds every subgraph in the data that matches it.

The contrast with SQL is sharp: in a relational database, joining N tables is O(rows × joins) in the worst case. In a property graph, traversing N edges from a starting node is O(edges traversed) — independent of total graph size.

## Examples

A query in **Cypher** (the de facto property-graph language) — "find friends of friends of Alice who do not already know Alice":

```cypher
MATCH (alice:Person {name: 'Alice'})-[:KNOWS]->(friend)-[:KNOWS]->(fof)
WHERE NOT (alice)-[:KNOWS]->(fof)
  AND alice <> fof
RETURN DISTINCT fof.name;
```

The same question in SQL on a `person(id, name)` + `knows(a_id, b_id)` schema — already getting awkward at two hops:

```sql
SELECT DISTINCT p3.name
FROM   person  p1
JOIN   knows   k1 ON k1.a_id = p1.id
JOIN   person  p2 ON p2.id   = k1.b_id
JOIN   knows   k2 ON k2.a_id = p2.id
JOIN   person  p3 ON p3.id   = k2.b_id
WHERE  p1.name = 'Alice'
  AND  p3.id  <> p1.id
  AND  NOT EXISTS (
         SELECT 1 FROM knows k0
         WHERE  k0.a_id = p1.id AND k0.b_id = p3.id
       );
```

At three hops the SQL doubles in length; at five hops it becomes infeasible. The Cypher version simply grows the pattern.

Detecting a cycle (e.g., a fraud ring) — trivial in graph, painful in SQL:

```cypher
MATCH path = (a:Account)-[:TRANSFERRED*3..6]->(a)
RETURN path;
```

## When to use

- **Highly connected data** where the questions are about the connections themselves: social graphs, organizational hierarchies, supply chains, dependencies.
- **Multi-hop queries** that would require many joins: friend-of-friend, shortest-path, common-neighbor, reachability.
- **Pattern matching** over relationships: fraud detection, anti-money-laundering, recommendation engines.
- **Knowledge graphs** combining heterogeneous entities and many relationship types.
- **The graph itself is the value**: you would draw a picture to explain the domain on a whiteboard, and the picture is mostly arrows.

## When NOT to use

- **Mostly tabular data** with the occasional reference: a [relational database](relational.md) handles this perfectly well and with broader tooling.
- **Bulk analytical aggregations** over all rows (`SUM`, `GROUP BY`): [OLAP columnar](olap-columnar.md) engines are an order of magnitude faster.
- **Massive write throughput** is the dominant requirement: most graph databases optimize for traversal, not for ingest. Use [wide-column](wide-column.md) or [time-series](time-series.md).
- **Simple lookup by ID** is the only access pattern: a [key-value](key-value.md) store is simpler and cheaper.
- **Your team has no graph-query experience**: Cypher and Gremlin have steep learning curves, and the operational story (especially clustering) is less mature than SQL ecosystems.

## References

- [*Graph Databases*, Ian Robinson, Jim Webber, Emil Eifrem](https://neo4j.com/graph-databases-book/) — the classic introduction
- [Neo4j Cypher Manual](https://neo4j.com/docs/cypher-manual/current/)
- [openCypher Specification](https://opencypher.org/)
- [SPARQL 1.1 Query Language](https://www.w3.org/TR/sparql11-query/) — for RDF triple stores
