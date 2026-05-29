---
type: concept
tags: []
related: []
language: "swift"
---
# SwiftData

> SwiftData is Apple's modern persistence framework — a Swift-first wrapper over Core Data that integrates natively with SwiftUI.

---

## What is it?

SwiftData (introduced in 2023, iOS 17 / macOS 14) is a persistence framework built on top of Core Data's mature storage engine but exposed through Swift macros and types instead of `.xcdatamodel` files and `NSManagedObject` subclasses.

You declare your model as an `@Model` Swift class. SwiftData handles schema, migration, persistence, undo, and CloudKit sync.

For projects that need to support iOS 16 or earlier, **Core Data** remains the supported choice.

---

## Why does it matter?

Before SwiftData, persistence on Apple platforms meant:

- A graphical `.xcdatamodel` editor that didn't review well in PRs
- `NSManagedObject` subclasses with KVC-style accessors
- Manual integration with SwiftUI through `@FetchRequest` and `@Environment(\.managedObjectContext)`
- Hand-rolled migration code

SwiftData replaces all of that with:

- A Swift class annotated `@Model`
- A `@Query` property wrapper that fetches data reactively in SwiftUI
- A `ModelContainer` and `ModelContext` for setup and writes
- Lightweight migration via versioned schemas

The engine underneath is still Core Data — battle-tested for two decades — but the developer experience is finally Swift-native.

---

## How it works

### Define a model

```swift
import SwiftData

@Model
final class Todo {
    var title: String
    var isCompleted: Bool
    var createdAt: Date

    init(title: String, isCompleted: Bool = false, createdAt: Date = .now) {
        self.title = title
        self.isCompleted = isCompleted
        self.createdAt = createdAt
    }
}
```

`@Model` transforms the class: stored properties become persisted attributes, and the macro generates the bridging code with Core Data.

### Set up the container

```swift
@main
struct TodoApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: Todo.self)
    }
}
```

`modelContainer(for:)` provisions storage on disk and injects the `ModelContext` into the environment.

### Query reactively in SwiftUI

```swift
struct TodoList: View {
    @Query(sort: \Todo.createdAt, order: .reverse) private var todos: [Todo]
    @Environment(\.modelContext) private var context

    var body: some View {
        List {
            ForEach(todos) { todo in
                Text(todo.title)
            }
            .onDelete { indexSet in
                indexSet.map { todos[$0] }.forEach(context.delete)
            }
        }
    }
}
```

`@Query` re-runs whenever underlying data changes — the view updates automatically.

### Insert and save

```swift
struct AddTodoView: View {
    @Environment(\.modelContext) private var context
    @State private var title = ""

    var body: some View {
        Form {
            TextField("Title", text: $title)
            Button("Add") {
                context.insert(Todo(title: title))
                // SwiftData autosaves periodically; you can also call try? context.save()
                title = ""
            }
        }
    }
}
```

### Relationships

```swift
@Model
final class Project {
    var name: String
    @Relationship(deleteRule: .cascade) var todos: [Todo] = []

    init(name: String) { self.name = name }
}

@Model
final class Todo {
    var title: String
    var project: Project?

    init(title: String, project: Project? = nil) {
        self.title = title
        self.project = project
    }
}
```

`@Relationship` declares the rule for what happens when one side is deleted (`.cascade`, `.nullify`, `.deny`, `.noAction`).

### Predicates

`@Query` accepts a `#Predicate` for filtering:

```swift
@Query(filter: #Predicate<Todo> { !$0.isCompleted }, sort: \.createdAt)
private var pending: [Todo]
```

`#Predicate` is a macro that compiles to the underlying NSPredicate, but with type-checked Swift expressions.

### Migration

When you change a model, declare a versioned schema:

```swift
enum SchemaV1: VersionedSchema {
    static var versionIdentifier = Schema.Version(1, 0, 0)
    static var models: [any PersistentModel.Type] = [Todo.self]
}

enum SchemaV2: VersionedSchema {
    static var versionIdentifier = Schema.Version(2, 0, 0)
    static var models: [any PersistentModel.Type] = [Todo.self, Project.self]
}

enum TodoMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] = [SchemaV1.self, SchemaV2.self]
    static var stages: [MigrationStage] = [
        .lightweight(fromVersion: SchemaV1.self, toVersion: SchemaV2.self)
    ]
}
```

Lightweight migrations cover field additions and renames; custom migrations let you transform data programmatically.

### iCloud sync

```swift
.modelContainer(for: Todo.self, isAutosaveEnabled: true,
                isUndoEnabled: true)
```

For CloudKit sync, configure a CloudKit container in the project's capabilities — SwiftData picks it up automatically when the entitlement is set.

---

## SwiftData vs Core Data — when to choose

| | SwiftData | Core Data |
|---|---|---|
| **Min iOS** | iOS 17 | iOS 13+ |
| **Schema authoring** | Swift classes + macros | `.xcdatamodel` GUI |
| **SwiftUI integration** | `@Query` first-class | `@FetchRequest`, manual context |
| **CloudKit sync** | Same engine, simpler setup | Mature, more configuration |
| **Migration** | Versioned schemas | Lightweight + manual migration code |
| **Customization depth** | Less surface area exposed | Full NSManagedObject power |
| **Maturity** | New (since 2023) | 20+ years |

For new apps targeting iOS 17+ on Apple platforms, default to SwiftData. Reach for Core Data when you need control over `NSPersistentContainer`, multiple stores, or features SwiftData hasn't surfaced yet.

---

## Examples

### Full todo app skeleton

```swift
@Model
final class Todo {
    var title: String
    var isCompleted: Bool
    var createdAt: Date

    init(title: String, isCompleted: Bool = false, createdAt: Date = .now) {
        self.title = title
        self.isCompleted = isCompleted
        self.createdAt = createdAt
    }
}

@main
struct TodoApp: App {
    var body: some Scene {
        WindowGroup { TodoListView() }
            .modelContainer(for: Todo.self)
    }
}

struct TodoListView: View {
    @Query(sort: \Todo.createdAt, order: .reverse) private var todos: [Todo]
    @Environment(\.modelContext) private var context
    @State private var newTitle = ""

    var body: some View {
        NavigationStack {
            List {
                ForEach(todos) { todo in
                    Toggle(todo.title, isOn: Binding(
                        get: { todo.isCompleted },
                        set: { todo.isCompleted = $0 }
                    ))
                }
                .onDelete { indexSet in
                    indexSet.map { todos[$0] }.forEach(context.delete)
                }
            }
            .toolbar {
                ToolbarItem {
                    Button("Add") {
                        context.insert(Todo(title: "Untitled"))
                    }
                }
            }
        }
    }
}
```

### A filtered, sorted query

```swift
@Query(
    filter: #Predicate<Todo> { todo in
        !todo.isCompleted && todo.title.localizedStandardContains("urgent")
    },
    sort: [SortDescriptor(\Todo.createdAt, order: .reverse)]
)
private var urgentTodos: [Todo]
```

### Manual fetch (outside SwiftUI)

```swift
let descriptor = FetchDescriptor<Todo>(
    predicate: #Predicate { !$0.isCompleted },
    sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
)
let pending = try context.fetch(descriptor)
```

---

## When to use

- **New apps on iOS 17 / macOS 14+** with persistence needs.
- **Apps with simple to moderate model graphs** — todos, notes, library trackers, settings catalogs.
- **SwiftUI-first apps** where `@Query` carries most fetch needs.
- **Apps that want iCloud sync** without writing CloudKit code directly.

---

## When NOT to use

- **Targeting iOS 16 or earlier** — Core Data only.
- **Heavy raw SQL needs.** Both Core Data and SwiftData hide the SQLite layer. If you need joins, FTS, or specific SQL features, use [GRDB](https://github.com/groue/GRDB.swift) or SQLite directly.
- **Multi-context background work that needs explicit control** — Core Data still gives you finer control over contexts and merge policies.
- **Apps already heavily invested in Core Data.** Migration is possible but rarely worth it; SwiftData and Core Data can coexist in the same app via shared store URLs.

---

## References

- [SwiftData — Apple Developer](https://developer.apple.com/documentation/swiftdata)
- [Meet SwiftData — WWDC 2023](https://developer.apple.com/videos/play/wwdc2023/10187/)
- [Model your schema with SwiftData — WWDC 2023](https://developer.apple.com/videos/play/wwdc2023/10195/)
- [Build an app with SwiftData — WWDC 2023](https://developer.apple.com/videos/play/wwdc2023/10154/)
- [What's new in SwiftData — WWDC 2024](https://developer.apple.com/videos/play/wwdc2024/10137/)
- [Core Data — Apple Developer](https://developer.apple.com/documentation/coredata)
- [GRDB.swift](https://github.com/groue/GRDB.swift) — alternative for raw SQL access
