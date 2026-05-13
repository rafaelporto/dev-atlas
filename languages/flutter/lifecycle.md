# Lifecycle in Flutter

> Flutter has two overlapping lifecycle models: the app lifecycle (foreground, background, paused) and the widget lifecycle (init, build, update, dispose) — both must be understood to manage resources correctly.

---

## What is it?

**Lifecycle** in Flutter refers to the sequence of states a widget or the app itself goes through — from creation to disposal. The **app lifecycle** tracks whether the app is visible and active. The **widget lifecycle** (specifically `StatefulWidget`) defines when state is initialised, updated, and cleaned up. Getting lifecycle right prevents memory leaks, stale state, and crashes.

---

## Why does it matter?

Resources like streams, animation controllers, text editing controllers, timers, and focus nodes must be created and disposed at the right lifecycle points. A subscription not cancelled in `dispose()` keeps running after the widget is gone — draining memory and potentially triggering `setState` on a dead widget.

---

## How it works

### StatefulWidget lifecycle

```
Widget inserted into tree
         │
   createState()        ← Framework calls this once; returns the State object
         │
   initState()          ← Called once; initialise controllers, subscribe to streams
         │
   didChangeDependencies() ← Called after initState and when an InheritedWidget dep changes
         │
   build()              ← Called on every rebuild; must be pure and fast
         │
   ┌─────┴──────────────────────────────┐
   │ Parent rebuilds with new config    │
   │  didUpdateWidget(oldWidget)        │← Compare old vs new widget properties here
   │  build()                           │
   └────────────────────────────────────┘
         │
   deactivate()         ← Widget removed temporarily (e.g., page pushed on top)
         │
   dispose()            ← Widget permanently removed; cancel subscriptions, dispose controllers
```

**Example — correct resource management:**

```dart
class TimerWidget extends StatefulWidget {
  const TimerWidget({super.key});

  @override
  State<TimerWidget> createState() => _TimerWidgetState();
}

class _TimerWidgetState extends State<TimerWidget> {
  late final Timer _timer;
  int _seconds = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(
      const Duration(seconds: 1),
      (_) {
        if (mounted) {
          setState(() => _seconds++);
        }
      },
    );
  }

  @override
  void dispose() {
    _timer.cancel();  // always cancel timers in dispose
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text('Elapsed: $_seconds s');
  }
}
```

The `mounted` check guards against calling `setState` after the widget has been disposed — which would otherwise throw an exception.

### didUpdateWidget

Called when the parent rebuilds with a new widget of the same type. Use it to react to configuration changes:

```dart
@override
void didUpdateWidget(covariant MyWidget oldWidget) {
  super.didUpdateWidget(oldWidget);
  if (widget.userId != oldWidget.userId) {
    _loadUser(widget.userId);
  }
}
```

### App lifecycle — AppLifecycleState

To observe the app-level lifecycle (foreground/background transitions), use `WidgetsBindingObserver`:

```dart
class _MyScreenState extends State<MyScreen> with WidgetsBindingObserver {

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        // app is in the foreground and active
      case AppLifecycleState.inactive:
        // app is transitioning (e.g., incoming call overlay on iOS)
      case AppLifecycleState.paused:
        // app is in the background; save state here
      case AppLifecycleState.detached:
        // app process is about to be killed
      case AppLifecycleState.hidden:
        // app windows are hidden (desktop/web)
    }
  }
}
```

### Common resources and their disposal

| Resource | Created in | Disposed in |
|---|---|---|
| `AnimationController` | `initState` | `dispose` |
| `TextEditingController` | `initState` | `dispose` |
| `FocusNode` | `initState` | `dispose` |
| `ScrollController` | `initState` | `dispose` |
| `StreamSubscription` | `initState` | `dispose` (call `.cancel()`) |
| `Timer` | `initState` | `dispose` (call `.cancel()`) |
| `WidgetsBindingObserver` | `initState` (add) | `dispose` (remove) |

---

## When to use

- Use `initState` for one-time setup: subscribing to streams, starting animations, loading initial data.
- Use `didUpdateWidget` to react to changes in the parent's configuration without re-creating the entire state.
- Use `dispose` to release every resource acquired in `initState` — treat it as a mirror of `initState`.
- Use `WidgetsBindingObserver` to respond to app backgrounding (pause music, save draft, close connections).

---

## When NOT to use

- Do not call `context.dependOnInheritedWidgetOfExactType` in `initState` — use `didChangeDependencies` instead.
- Do not perform heavy async work inside `build` — trigger it in `initState` or `didUpdateWidget` and store the result in state.
- Do not skip `super.initState()`, `super.didUpdateWidget()`, or `super.dispose()` — the framework requires these calls.

---

## References

- [State API — api.flutter.dev](https://api.flutter.dev/flutter/widgets/State-class.html)
- [AppLifecycleState — api.flutter.dev](https://api.flutter.dev/flutter/dart-ui/AppLifecycleState.html)
- [WidgetsBindingObserver — api.flutter.dev](https://api.flutter.dev/flutter/widgets/WidgetsBindingObserver-class.html)
- [StatefulWidget lifecycle — docs.flutter.dev](https://docs.flutter.dev/ui/interactivity#stateful-and-stateless-widgets)
