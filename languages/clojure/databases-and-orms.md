---
type: concept
tags:
  - language
  - clojure
  - database
  - backend
related:
  - languages/clojure/data-structures-and-immutability
  - languages/clojure/error-handling
language: "clojure"
---
# Databases and the "No ORM" Philosophy in Clojure

> Clojure talks to databases with thin, data-first libraries — `next.jdbc` for SQL, HoneySQL to build queries as data, Datomic for immutable time — and deliberately skips the object-relational mapper.

---

## What is it?

Database access in Clojure is built on the idea that a query result is just **data** — a vector of maps — and a query is either a SQL string with parameters or a query expressed *as data*. The core tools are:

- **next.jdbc** — a modern, low-level wrapper over JDBC that returns rows as Clojure maps.
- **HoneySQL** — builds SQL statements from Clojure data structures (maps and vectors), so queries are composable and injection-safe.
- **Datomic** — an immutable, temporal database whose query language (Datalog) and data model are Clojure-native.

Conspicuously absent is an **ORM** (Object-Relational Mapper) like Java's Hibernate. Clojure has no idiomatic ORM, and that is by design.

---

## Why does it matter?

An ORM exists to bridge two mismatched worlds: mutable objects with identity and behavior on one side, and relational tables on the other. It maps rows to class instances, tracks their dirty state, and translates method calls into SQL. That bridge is complex — lazy-loading surprises, N+1 queries, session lifecycles, and cache invalidation are all ORM-specific hazards.

Clojure does not have that mismatch. A database row is naturally a map; a result set is naturally a sequence of maps; and those are exactly the data structures the rest of a Clojure program already manipulates. There is nothing to map *to*, so the ORM layer simply disappears. You work with SQL (or Datalog) directly and get plain data back — no entity classes, no session, no hidden mutation.

---

## How it works

### next.jdbc — SQL as strings, rows as maps

`next.jdbc` gives you a datasource, then executes parameterized SQL. `execute!` returns a vector of maps with namespace-qualified keys (`:table/column`); `execute-one!` returns a single map; `plan` streams results with minimal allocation for reductions.

```clojure
(require '[next.jdbc :as jdbc]
         '[next.jdbc.sql :as sql])

(def ds (jdbc/get-datasource
          {:dbtype "postgresql" :dbname "app"
           :host "localhost" :user "app" :password "secret"}))

;; Parameterized query — the vector's tail values are bound safely (no injection)
(jdbc/execute! ds ["select id, name from users where active = ?" true])
;; => [{:users/id 1, :users/name "Ada"} ...]

;; A single row
(jdbc/execute-one! ds ["select * from users where id = ?" 1])

;; Streaming reduction with plan — no intermediate realized vector
(reduce (fn [acc row] (+ acc (:orders/total row)))
        0
        (jdbc/plan ds ["select total from orders where paid = ?" true]))

;; Convenience helpers in next.jdbc.sql
(sql/insert! ds :users {:name "Grace" :active true})
(sql/query   ds ["select * from users where id = ?" 1])
```

Dependency coordinate: `com.github.seancorfield/next.jdbc`.

### Transactions

`with-transaction` runs a body atomically; any exception rolls it back:

```clojure
(jdbc/with-transaction [tx ds]
  (sql/update! tx :accounts {:balance 70} {:id 1})
  (sql/update! tx :accounts {:balance 30} {:id 2}))
```

### HoneySQL — queries as data

Writing SQL as strings is fine for fixed queries but awkward when clauses are conditional. HoneySQL represents a query as a Clojure map, composes it with ordinary `assoc`/`merge`, and formats it to a `[sql & params]` vector that `next.jdbc` executes.

```clojure
(require '[honey.sql :as hsql])

(def base
  {:select [:id :email]
   :from   [:users]
   :where  [:= :active true]})

;; Compose conditionally — it's just data
(def q (cond-> base
         true (assoc :order-by [[:created-at :desc]])
         true (assoc :limit 20)))

(hsql/format q)
;; => ["SELECT id, email FROM users WHERE active = ? ORDER BY created_at DESC LIMIT ?" true 20]

(jdbc/execute! ds (hsql/format q))
```

Because a query is data, you can build, store, diff, and transform it with the same functions you use on any other map.

### Datomic — immutable, temporal database

Datomic takes Clojure's philosophy all the way into the database: data is immutable, every change is an addition (facts are never overwritten), and you can query the database *as of* any past point in time. Queries use **Datalog**, written as Clojure data.

```clojure
;; Datalog query: find the name of the user with id 1 (query is a data structure)
(require '[datomic.api :as d])

(d/q '[:find ?name
       :in $ ?id
       :where
       [?e :user/id ?id]
       [?e :user/name ?name]]
     db 1)
;; => #{["Ada"]}

;; Time travel: query the database as it was yesterday
(d/q query (d/as-of db yesterday))
```

Datomic's model — immutable facts, built-in history, Datalog — aligns tightly with Clojure's values, but it is a specialized system with its own operational model. XTDB is a comparable open-source, temporal, Datalog-style database.

### Migrations

Clojure has no built-in migration system; teams typically use `migratus` or `ragtime`, which run ordered SQL (or EDN) migration files against the database.

---

## Examples

```clojure
;; A repository namespace: thin functions over next.jdbc, returning plain data
(ns my.app.users
  (:require [next.jdbc :as jdbc]
            [next.jdbc.sql :as sql]
            [honey.sql :as hsql]))

(defn find-by-id [ds id]
  (sql/get-by-id ds :users id))

(defn active-users [ds {:keys [limit] :or {limit 50}}]
  (jdbc/execute! ds (hsql/format {:select [:*]
                                  :from   [:users]
                                  :where  [:= :active true]
                                  :limit  limit})))

(defn create! [ds user]
  (sql/insert! ds :users user))
```

---

## When to use

- Use **next.jdbc** as the default for any relational database (PostgreSQL, MySQL, SQLite, SQL Server).
- Use **HoneySQL** when queries are built conditionally or composed from parts.
- Use `plan` for large result sets you reduce over, to avoid realizing the whole set.
- Use `with-transaction` whenever multiple statements must succeed or fail together.
- Consider **Datomic** or **XTDB** when immutability, auditability, and time-travel queries are first-class requirements.

## When NOT to use

- Do not go looking for a Hibernate-style ORM — the data model does not need one; use SQL + maps.
- Do not build SQL by string concatenation with user input — always use parameterized queries or HoneySQL to prevent injection.
- Do not hold a `plan` result open outside its reduction — it is tied to an open connection/cursor.
- Do not reach for Datomic just to avoid writing SQL — it is a different operational and licensing model, justified by its temporal features, not as a default relational store.

---

## References

- [next.jdbc — GitHub](https://github.com/seancorfield/next-jdbc)
- [next.jdbc — Getting Started](https://cljdoc.org/d/com.github.seancorfield/next.jdbc/CURRENT/doc/getting-started)
- [HoneySQL — GitHub](https://github.com/seancorfield/honeysql)
- [Datomic — official documentation](https://docs.datomic.com/)
- [XTDB — official site](https://xtdb.com/)
