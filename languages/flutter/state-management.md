# State Management in Flutter

> Flutter has no single official state management solution — the ecosystem offers Provider, Riverpod, and Bloc/Cubit, each with different trade-offs in complexity, testability, and scalability.

---

## What is it?

**State management** in Flutter refers to the strategies for holding, updating, and sharing application state across the widget tree. `StatefulWidget` covers local, widget-scoped state. For state that is shared across screens or decoupled from the UI, Flutter developers use dedicated packages: **Provider**, **Riverpod**, or **Bloc/Cubit** are the most widely adopted.

---

## Why does it matter?

As an app grows, `StatefulWidget` and `setState` become unwieldy — state scattered across widgets, business logic mixed into `build` methods, and hard-to-test UI code. A state management solution externalises state so it can be read, modified, and tested independently of the widget tree.

---

## How it works

### Provider

Provider is the simplest and most widely adopted solution. It uses `InheritedWidget` under the hood to propagate objects down the widget tree and rebuild consumers when data changes.

```dart
// 1. Define a ChangeNotifier
class CartNotifier extends ChangeNotifier {
  final List<Product> _items = [];
  List<Product> get items => List.unmodifiable(_items);

  void add(Product product) {
    _items.add(product);
    notifyListeners();
  }
}

// 2. Provide it at the root or nearest ancestor
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => CartNotifier(),
      child: const MyApp(),
    ),
  );
}

// 3. Consume it in a widget
class CartBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final count = context.watch<CartNotifier>().items.length;
    return Badge(label: Text('$count'));
  }
}
```

Use `context.watch<T>()` to rebuild on changes. Use `context.read<T>()` to access without subscribing (e.g., inside a button callback).

### Riverpod

Riverpod is a compile-safe, testable, and `BuildContext`-independent evolution of Provider. State is declared as global `Provider` objects; widgets read them via a `ref`:

```dart
// 1. Define a provider
final cartProvider = StateNotifierProvider<CartNotifier, List<Product>>(
  (ref) => CartNotifier(),
);

class CartNotifier extends StateNotifier<List<Product>> {
  CartNotifier() : super([]);

  void add(Product product) => state = [...state, product];
}

// 2. Consume in a ConsumerWidget
class CartBadge extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(cartProvider).length;
    return Badge(label: Text('$count'));
  }
}

// 3. Read without listening (e.g., in a callback)
class AddToCartButton extends ConsumerWidget {
  final Product product;
  const AddToCartButton(this.product, {super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ElevatedButton(
      onPressed: () => ref.read(cartProvider.notifier).add(product),
      child: const Text('Add to cart'),
    );
  }
}
```

Riverpod providers are declared at the top level — no `BuildContext` needed to create or read them. This makes them trivially testable.

### Bloc / Cubit

Bloc is a pattern that enforces a strict separation between UI events and state transitions. Every state change is driven by an explicit event; state is represented as immutable sealed classes. **Cubit** is a simplified Bloc variant without events.

**Cubit (simpler):**

```dart
class CartCubit extends Cubit<List<Product>> {
  CartCubit() : super([]);

  void add(Product product) => emit([...state, product]);
  void remove(Product product) => emit(state.where((p) => p != product).toList());
}
```

**Bloc (explicit events):**

```dart
// Events
sealed class CartEvent {}
class AddProduct extends CartEvent { final Product product; AddProduct(this.product); }
class RemoveProduct extends CartEvent { final Product product; RemoveProduct(this.product); }

// States
sealed class CartState {}
class CartLoaded extends CartState { final List<Product> items; CartLoaded(this.items); }

// Bloc
class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc() : super(CartLoaded([])) {
    on<AddProduct>((event, emit) {
      final current = (state as CartLoaded).items;
      emit(CartLoaded([...current, event.product]));
    });
    on<RemoveProduct>((event, emit) {
      final current = (state as CartLoaded).items;
      emit(CartLoaded(current.where((p) => p != event.product).toList()));
    });
  }
}

// UI
BlocBuilder<CartBloc, CartState>(
  builder: (context, state) => switch (state) {
    CartLoaded(:final items) => CartList(items: items),
  },
)
```

---

## Comparison

| | Provider | Riverpod | Bloc/Cubit |
|---|---|---|---|
| **Complexity** | Low | Medium | Medium–High |
| **Boilerplate** | Low | Low–Medium | Medium–High |
| **Testability** | Good | Excellent | Excellent |
| **Type safety** | Moderate | Strong | Strong |
| **`BuildContext` dependency** | Yes | No | No |
| **Learning curve** | Low | Medium | Medium |
| **Best for** | Small–medium apps | Any app size | Large apps with complex state flows |

---

## When to use

- **Provider**: straightforward apps, or when onboarding a team unfamiliar with Riverpod or Bloc.
- **Riverpod**: recommended for new projects; cleaner API, better testability, no BuildContext dependency.
- **Bloc**: when you need a strict, auditable event log of state changes (useful in regulated domains or complex flows with many state transitions).
- **setState / StatefulWidget**: local, widget-scoped state (a toggle, an animation controller, a text field focus).

---

## When NOT to use

- Do not use `setState` for state shared across multiple screens — propagating it through the tree creates prop-drilling.
- Do not mix multiple state management solutions in the same app without a clear boundary between them.
- Do not reach for Bloc when a Cubit is sufficient — events add value only when multiple transitions lead to the same state.

---

## References

- [State management — docs.flutter.dev](https://docs.flutter.dev/data-and-backend/state-mgmt/intro)
- [Provider — pub.dev](https://pub.dev/packages/provider)
- [Riverpod — riverpod.dev](https://riverpod.dev)
- [flutter_bloc — pub.dev](https://pub.dev/packages/flutter_bloc)
- [Bloc documentation — bloclibrary.dev](https://bloclibrary.dev)
