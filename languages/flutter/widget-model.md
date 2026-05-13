# The Flutter Widget Model

> In Flutter, everything on screen is a widget — an immutable description of part of the UI that the framework reconciles into a live element tree and ultimately paints through a render tree.

---

## What is it?

A **widget** in Flutter is an immutable Dart object that describes a piece of the UI — its layout, appearance, behaviour, or state. Widgets are cheap to create and discard; Flutter's framework compares successive widget trees and applies only the minimal changes needed to update the screen. Under the hood, Flutter maintains three parallel trees: the **widget tree** (descriptions), the **element tree** (live instances), and the **render tree** (layout and paint).

---

## Why does it matter?

Understanding the widget model is the foundation of all Flutter development. Rebuilds, performance issues, key usage, inherited widgets, and `BuildContext` all make sense only once you know how the three trees work and how Flutter reconciles them.

---

## How it works

### The three trees

```
Widget Tree                 Element Tree              RenderObject Tree
(immutable descriptions)    (live instances)          (layout & paint)

Scaffold                    ScaffoldElement           RenderCustomMultiChildLayout
  └── Column                  └── MultiChildElement     └── RenderFlex
        ├── Text                    ├── StatelessElement     ├── RenderParagraph
        └── ElevatedButton         └── StatefulElement      └── RenderCustomPaint
```

- **Widget tree**: rebuilt by calling `build()` on each widget. Cheap — objects are allocated and discarded frequently.
- **Element tree**: maintained by the framework. Elements are long-lived; they hold references to the current widget and the underlying render object. When a widget rebuilds, the framework updates the element in place if the widget type matches.
- **Render tree**: handles geometry — computing sizes, laying out children, and painting to the canvas. Expensive to create; the framework reuses render objects across rebuilds.

### Widget identity and reconciliation

When a parent widget rebuilds, Flutter compares the new widget against the current element's widget. The reconciliation rule:

- **Same type and key**: update the element with the new widget (cheap).
- **Different type or key**: discard the old element and create a new one (expensive — triggers full subtree rebuild).

This is why changing a widget's type mid-tree (e.g., wrapping something in a `Padding` conditionally) can destroy and recreate state. Use `Key` to preserve element identity across structural changes.

### BuildContext

`BuildContext` is a handle to the element corresponding to a widget. It exposes the widget's position in the element tree. Its most important use is **inherited widget lookup**:

```dart
// Reading a theme from the nearest ancestor
final theme = Theme.of(context);

// Reading a MediaQuery
final size = MediaQuery.sizeOf(context);

// Reading a Navigator
Navigator.of(context).push(...);
```

`BuildContext` is only valid during the build phase of the widget it was passed to. Storing it and using it after the widget has been disposed causes an error.

### Widget composition

Flutter UIs are built by composing small, focused widgets — not by extending or customising a base component:

```dart
class ProfileCard extends StatelessWidget {
  final String name;
  final String avatarUrl;

  const ProfileCard({super.key, required this.name, required this.avatarUrl});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(backgroundImage: NetworkImage(avatarUrl)),
            const SizedBox(width: 12),
            Text(name, style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      ),
    );
  }
}
```

Each widget has a single responsibility. Complex UIs emerge from composition, not inheritance.

### Inherited widgets

`InheritedWidget` propagates data down the tree efficiently. Widgets that call `of(context)` are rebuilt only when the inherited data changes:

```dart
class AppTheme extends InheritedWidget {
  final Color primaryColor;

  const AppTheme({
    super.key,
    required this.primaryColor,
    required super.child,
  });

  static AppTheme of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<AppTheme>()!;
  }

  @override
  bool updateShouldNotify(AppTheme old) => primaryColor != old.primaryColor;
}
```

`Theme`, `MediaQuery`, `Navigator`, `Scaffold`, and virtually all Flutter state management solutions (`Provider`, `Riverpod`, `Bloc`) are built on `InheritedWidget`.

---

## When to use

- Compose small, reusable widgets rather than building monolithic `build` methods.
- Use `const` constructors for widgets whose properties are compile-time constants — the framework skips rebuilding them.
- Use `Key` when the same widget type appears in multiple positions in a list, or when you need to preserve state across a structural change.

---

## When NOT to use

- Do not store `BuildContext` in a field or use it after `dispose()` — it may refer to an unmounted element.
- Do not put all UI code in a single `build` method — extract subtrees into separate widgets to limit rebuild scope.
- Do not rely on widget identity (pointer equality) — Flutter may create new widget instances on every `build` call.

---

## References

- [Introduction to widgets — docs.flutter.dev](https://docs.flutter.dev/ui/widgets-intro)
- [Flutter architectural overview — docs.flutter.dev](https://docs.flutter.dev/resources/architectural-overview)
- [BuildContext API — api.flutter.dev](https://api.flutter.dev/flutter/widgets/BuildContext-class.html)
- [InheritedWidget API — api.flutter.dev](https://api.flutter.dev/flutter/widgets/InheritedWidget-class.html)
