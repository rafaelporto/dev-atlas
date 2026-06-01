---
type: concept
tags:
  - language
  - swift
  - mobile
  - state-management
related: []
language: "swift"
---
# SwiftUI and Observation

> SwiftUI is Apple's declarative UI framework across all platforms; the Observation framework is the modern reactivity layer that drives it.

---

## What is it?

**SwiftUI** is a declarative UI framework introduced in 2019. You describe what the UI should look like for a given state, and SwiftUI figures out the diff. It targets iOS, iPadOS, macOS, watchOS, tvOS, and visionOS from one codebase.

**Observation** is a Swift macro-based framework introduced in 2023 (iOS 17 / macOS 14) that replaces `ObservableObject` + `@Published` from Combine. Mark a class with `@Observable` and SwiftUI tracks fine-grained property reads automatically — no manual `@Published` annotations, no `objectWillChange.send()`.

---

## Why does it matter?

SwiftUI is the strategic UI direction across all Apple platforms. New features land there first (iOS 17+ widgets, Vision Pro spatial UI, watchOS complications). It removes thousands of lines of UIKit boilerplate and produces UIs that update correctly on state changes by construction.

The Observation framework removes the last major source of friction in SwiftUI state: needing to declare every observable property explicitly with `@Published`, and the over-invalidation of `ObservableObject` (any change re-evaluates every view that observes it). With `@Observable`, only views that read a specific property re-evaluate when *that* property changes.

For new code targeting iOS 17+ and aligned Apple OS versions, `@Observable` is the recommended path.

---

## How it works

### A SwiftUI view is a value

```swift
struct ContentView: View {
    var body: some View {
        VStack {
            Text("Hello, world!")
            Button("Tap me") { print("tapped") }
        }
    }
}
```

`View` is a protocol. `body` returns `some View` — an opaque type. Each render produces a new value tree; SwiftUI diffs against the previous tree.

### State sources

| Property wrapper | Purpose |
|---|---|
| `@State` | View-local mutable state (value types) |
| `@Binding` | A two-way connection to state owned elsewhere |
| `@Environment` | Read values injected from ancestors (e.g., color scheme, locale) |
| `@Bindable` | Create a binding from any `@Observable` object property |
| `@StateObject` (legacy, `ObservableObject`) | Owns the lifecycle of a reference-type model |
| `@ObservedObject` (legacy) | A reference-type model owned elsewhere |
| `@EnvironmentObject` (legacy) | Inject a reference-type model from an ancestor |
| `@FocusState`, `@SceneStorage`, `@AppStorage` | Specialized state sources |

With `@Observable`, the legacy `@StateObject`/`@ObservedObject`/`@EnvironmentObject` become unnecessary.

### The Observation framework

```swift
import Observation

@Observable
final class Counter {
    var value = 0
    func increment() { value += 1 }
}
```

The `@Observable` macro generates the machinery that tells SwiftUI when each property is read. SwiftUI then re-evaluates only the views that read changed properties.

### Connecting `@Observable` to views

```swift
struct CounterView: View {
    @State private var counter = Counter()

    var body: some View {
        VStack {
            Text("Value: \(counter.value)")
            Button("Add") { counter.increment() }
        }
    }
}
```

`@State` works for `@Observable` reference types — SwiftUI owns the instance for the view's lifetime.

### `@Bindable` for two-way bindings to observable properties

```swift
struct EditView: View {
    @Bindable var user: User    // User is @Observable

    var body: some View {
        TextField("Name", text: $user.name)
    }
}
```

`@Bindable` lets you construct a `Binding<T>` from any property of an `@Observable` object.

### Passing observable models down the hierarchy

```swift
@Observable
final class Session {
    var current: User?
}

@main
struct MyApp: App {
    @State private var session = Session()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(session)
        }
    }
}

struct RootView: View {
    @Environment(Session.self) private var session

    var body: some View {
        if let user = session.current {
            HomeView(user: user)
        } else {
            LoginView()
        }
    }
}
```

`environment(_:)` injects; `@Environment(Type.self)` reads. This replaces `@EnvironmentObject` for new code.

### Layout primitives

| Container | Use |
|---|---|
| `VStack` / `HStack` / `ZStack` | Linear and overlapping layouts |
| `Grid` | Two-dimensional grids with alignment per cell |
| `LazyVStack` / `LazyHStack` / `LazyVGrid` / `LazyHGrid` | Defer layout until visible — for long lists |
| `List` / `ScrollView` | Vertical lists; ScrollView for arbitrary content |
| `NavigationStack` / `NavigationSplitView` | Modern navigation (iOS 16+) |
| `TabView` | Tab-based navigation |
| `Form` | Settings-style grouped controls |

### Modifiers

Modifiers transform a view by returning a new wrapped view:

```swift
Text("Hello")
    .font(.title)
    .foregroundStyle(.primary)
    .padding()
    .background(.regularMaterial)
    .clipShape(.rect(cornerRadius: 12))
```

Modifier order matters — each wraps the previous result.

### Combine vs Observation — when to use which

| | Combine | Observation |
|---|---|---|
| **Primary use** | Reactive operator chains, especially networking | SwiftUI state |
| **Granularity** | Whole-object via `@Published` | Per-property via `@Observable` |
| **Overhead** | Higher (subscription machinery) | Lower (macro-generated tracking) |
| **Availability** | iOS 13+ | iOS 17+ |
| **Best for** | Long-running pipelines with `map`/`filter`/`combineLatest` | App state that drives UI |

You can mix them — use Combine for the data pipeline, expose the latest value through an `@Observable` model.

---

## Examples

### A minimal SwiftUI app

```swift
@main
struct CounterApp: App {
    var body: some Scene {
        WindowGroup {
            CounterView()
        }
    }
}

@Observable
final class Counter {
    var value = 0
    func increment() { value += 1 }
    func reset() { value = 0 }
}

struct CounterView: View {
    @State private var counter = Counter()

    var body: some View {
        VStack(spacing: 16) {
            Text("\(counter.value)").font(.largeTitle)
            HStack {
                Button("+") { counter.increment() }
                Button("Reset") { counter.reset() }
            }
        }
        .padding()
    }
}
```

### A list with navigation

```swift
struct ContactsView: View {
    let contacts: [Contact]

    var body: some View {
        NavigationStack {
            List(contacts) { contact in
                NavigationLink(value: contact) {
                    Text(contact.name)
                }
            }
            .navigationTitle("Contacts")
            .navigationDestination(for: Contact.self) { contact in
                ContactDetailView(contact: contact)
            }
        }
    }
}
```

### Loading data with `task`

```swift
struct UserView: View {
    let id: String
    @State private var user: User?
    @State private var error: Error?

    var body: some View {
        Group {
            if let user {
                Text(user.name)
            } else if error != nil {
                Text("Failed to load")
            } else {
                ProgressView()
            }
        }
        .task(id: id) {
            do {
                user = try await api.user(id: id)
            } catch {
                self.error = error
            }
        }
    }
}
```

`.task` runs an `async` closure tied to the view's lifetime; it cancels automatically when the view disappears. With `id:`, it re-runs when `id` changes.

### Two-way binding with `@Bindable`

```swift
@Observable
final class Profile {
    var name = ""
    var bio = ""
}

struct EditProfileView: View {
    @Bindable var profile: Profile

    var body: some View {
        Form {
            TextField("Name", text: $profile.name)
            TextField("Bio", text: $profile.bio)
        }
    }
}
```

### Animations

```swift
struct ToggleView: View {
    @State private var on = false

    var body: some View {
        Circle()
            .fill(on ? .green : .red)
            .frame(width: 100, height: 100)
            .onTapGesture {
                withAnimation(.spring) { on.toggle() }
            }
    }
}
```

### Previews

```swift
#Preview {
    CounterView()
}

#Preview("Empty state") {
    ContactsView(contacts: [])
}
```

Previews render directly in Xcode without launching the simulator — major productivity multiplier.

---

## When to use

- **All new Apple-platform UI work.** SwiftUI is the strategic direction; new platform features land here first.
- **Cross-platform Apple apps.** Same view code targets iOS, iPadOS, macOS, watchOS, tvOS, and visionOS.
- **Reactive UI that mirrors state.** SwiftUI excels when UI is a pure function of state.
- **`@Observable` for any new state model** on iOS 17+.

---

## When NOT to use

- **Deep custom drawing or complex gesture systems.** UIKit/AppKit still have richer hooks. SwiftUI provides escape hatches (`UIViewRepresentable`, `Canvas`, `GeometryReader`) but at non-trivial complexity.
- **Targeting iOS 14 or earlier.** Many modern SwiftUI features (NavigationStack, `@Observable`, async `.task`) require iOS 16/17+.
- **Legacy `ObservableObject` in greenfield code.** Use `@Observable` unless platform availability blocks it.
- **Hand-rolling reactive frameworks** when Combine + Observation cover the case.

---

## References

- [SwiftUI — Apple Developer](https://developer.apple.com/documentation/swiftui)
- [Observation framework — Apple Developer](https://developer.apple.com/documentation/observation)
- [Migrating from the Observable Object protocol to the Observable macro](https://developer.apple.com/documentation/swiftui/migrating-from-the-observable-object-protocol-to-the-observable-macro)
- [Discover Observation in SwiftUI — WWDC 2023](https://developer.apple.com/videos/play/wwdc2023/10149/)
- [Data Essentials in SwiftUI — WWDC 2020](https://developer.apple.com/videos/play/wwdc2020/10040/)
- [Thinking in SwiftUI](https://www.objc.io/books/thinking-in-swiftui/) — Florian Kugler & Chris Eidhof
- [Hacking with Swift — 100 Days of SwiftUI](https://www.hackingwithswift.com/100/swiftui) — community resource
- [Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/)
