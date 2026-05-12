# VIPER

> Five strictly separated roles — View, Interactor, Presenter, Entity, Router — each with a single responsibility and no direct knowledge of the others' implementations.

Popularized in the iOS community by Mutual Mobile (2014) as a way to apply Clean Architecture and SOLID principles to UIKit apps at scale.

---

## What is it?

VIPER names five roles, each mapped to a layer:

- **View** — displays data, forwards user events to the Presenter. Passive; contains no logic.
- **Interactor** — contains business logic and use cases. Fetches and transforms data. Has no knowledge of the UI.
- **Presenter** — mediates between View and Interactor. Formats data for display; responds to View events by calling the Interactor.
- **Entity** — plain data objects (structs). Used by the Interactor; never crossed the boundary to the View.
- **Router** — owns navigation. Creates and connects VIPER modules; manages transitions between screens.

```
┌──────────┐  events   ┌───────────────┐  calls   ┌──────────────┐
│          │ ────────► │               │ ───────► │              │
│   View   │           │   Presenter   │          │  Interactor  │
│          │ ◄──────── │               │ ◄─────── │              │
└──────────┘  display  └───────┬───────┘  data    └──────┬───────┘
                               │                         │
                        navigates via                  uses
                               │                         │
                        ┌──────▼───────┐         ┌───────▼──────┐
                        │    Router    │         │    Entity    │
                        └──────────────┘         └──────────────┘
```

Each arrow in the diagram crosses an interface boundary — no component holds a concrete reference to another. They communicate through protocols (Swift) or interfaces (Kotlin/Java).

---

## Why does it matter?

VIPER is an extreme application of the Single Responsibility Principle to iOS. In a large team, different engineers can own different layers of the same feature without stepping on each other. The Router's existence is particularly significant: in MVC and MVVM, navigation logic tends to leak into View Controllers. VIPER makes navigation an explicit first-class responsibility.

---

## How it works

1. User taps a button in the **View**.
2. The **View** calls `presenter.onOrderTapped(orderId)`.
3. The **Presenter** calls `interactor.fetchOrderDetails(orderId)`.
4. The **Interactor** retrieves the **Entity** from a data source, transforms it, and returns a result.
5. The **Presenter** formats the result into display data and calls `view.displayOrder(...)`.
6. If navigation is needed, the **Presenter** calls `router.navigateToOrderConfirmation(orderId)`.
7. The **Router** instantiates the next VIPER module and performs the transition.

---

## Examples

### Swift (UIKit)

```swift
// Entity — plain data, no logic
struct Order {
    let orderId: String
    let total: Double
    let status: String
    let items: [String]
}

// View protocol
protocol OrderDetailView: AnyObject {
    func displayOrder(title: String, totalLabel: String, items: [String])
    func showError(_ message: String)
}

// Interactor output protocol
protocol OrderDetailInteractorOutput: AnyObject {
    func orderFetched(_ order: Order)
    func fetchFailed(_ error: String)
}

// Interactor — business logic, no UI
class OrderDetailInteractor {
    weak var output: OrderDetailInteractorOutput?
    private let orderRepository: OrderRepository

    init(orderRepository: OrderRepository) { self.orderRepository = orderRepository }

    func fetchOrderDetails(orderId: String) {
        do {
            let order = try orderRepository.findById(orderId)
            output?.orderFetched(order)
        } catch {
            output?.fetchFailed(error.localizedDescription)
        }
    }
}

// Presenter — formatting and coordination
class OrderDetailPresenter: OrderDetailInteractorOutput {
    weak var view: OrderDetailView?
    private let interactor: OrderDetailInteractor
    private let router: OrderDetailRouter

    init(interactor: OrderDetailInteractor, router: OrderDetailRouter) {
        self.interactor = interactor
        self.router = router
    }

    func onViewLoaded(orderId: String) { interactor.fetchOrderDetails(orderId: orderId) }
    func onConfirmTapped(orderId: String) { router.navigateToConfirmation(orderId: orderId) }

    func orderFetched(_ order: Order) {
        view?.displayOrder(
            title: "Order #\(order.orderId)",
            totalLabel: String(format: "Total: $%.2f", order.total),
            items: order.items
        )
    }

    func fetchFailed(_ error: String) { view?.showError(error) }
}

// Router — navigation and module assembly
class OrderDetailRouter {
    weak var viewController: UIViewController?

    func navigateToConfirmation(orderId: String) {
        let next = OrderConfirmationModule.build(orderId: orderId)
        viewController?.navigationController?.pushViewController(next, animated: true)
    }

    static func build(orderId: String) -> UIViewController {
        let router = OrderDetailRouter()
        let interactor = OrderDetailInteractor(orderRepository: OrderRepository())
        let presenter = OrderDetailPresenter(interactor: interactor, router: router)
        let vc = OrderDetailViewController()
        vc.presenter = presenter
        presenter.view = vc
        interactor.output = presenter
        router.viewController = vc
        return vc
    }
}
```

### Kotlin (Android)

```kotlin
// Entity — plain data, no logic
data class Order(
    val orderId: String,
    val total: Double,
    val status: String,
    val items: List<String>
)

// View interface
interface OrderDetailView {
    fun displayOrder(title: String, totalLabel: String, items: List<String>)
    fun showError(message: String)
}

// Interactor output interface
interface OrderDetailInteractorOutput {
    fun orderFetched(order: Order)
    fun fetchFailed(error: String)
}

// Interactor — business logic, no Android SDK
class OrderDetailInteractor(
    private val output: OrderDetailInteractorOutput,
    private val orderRepository: OrderRepository
) {
    fun fetchOrderDetails(orderId: String) {
        runCatching { orderRepository.findById(orderId) }
            .onSuccess { output.orderFetched(it) }
            .onFailure { output.fetchFailed(it.message ?: "Error") }
    }
}

// Presenter — formatting and coordination
class OrderDetailPresenter(
    private val view: OrderDetailView,
    private val interactor: OrderDetailInteractor,
    private val router: OrderDetailRouter
) : OrderDetailInteractorOutput {

    fun onViewLoaded(orderId: String) = interactor.fetchOrderDetails(orderId)
    fun onConfirmTapped(orderId: String) = router.navigateToConfirmation(orderId)

    override fun orderFetched(order: Order) {
        view.displayOrder(
            title = "Order #${order.orderId}",
            totalLabel = "Total: ${"%.2f".format(order.total)}",
            items = order.items
        )
    }

    override fun fetchFailed(error: String) = view.showError(error)
}

// Router — navigation and module assembly
class OrderDetailRouter(private val navController: NavController) {
    fun navigateToConfirmation(orderId: String) {
        navController.navigate("confirmation/$orderId")
    }
}
```

### Flutter (Dart)

```dart
// Entity — plain data, no logic
class Order {
  final String orderId;
  final double total;
  final String status;
  final List<String> items;

  const Order({required this.orderId, required this.total, required this.status, required this.items});
}

// View interface
abstract class OrderDetailView {
  void displayOrder({required String title, required String totalLabel, required List<String> items});
  void showError(String message);
}

// Interactor output interface
abstract class OrderDetailInteractorOutput {
  void orderFetched(Order order);
  void fetchFailed(String error);
}

// Interactor — business logic, no Flutter imports
class OrderDetailInteractor {
  final OrderDetailInteractorOutput output;
  final OrderRepository orderRepository;

  OrderDetailInteractor({required this.output, required this.orderRepository});

  Future<void> fetchOrderDetails(String orderId) async {
    try {
      final order = await orderRepository.findById(orderId);
      output.orderFetched(order);
    } catch (e) {
      output.fetchFailed(e.toString());
    }
  }
}

// Presenter — formatting and coordination
class OrderDetailPresenter implements OrderDetailInteractorOutput {
  final OrderDetailView view;
  final OrderDetailInteractor interactor;
  final OrderDetailRouter router;

  OrderDetailPresenter({required this.view, required this.interactor, required this.router});

  void onViewLoaded(String orderId) => interactor.fetchOrderDetails(orderId);
  void onConfirmTapped(String orderId) => router.navigateToConfirmation(orderId);

  @override
  void orderFetched(Order order) {
    view.displayOrder(
      title: 'Order #${order.orderId}',
      totalLabel: 'Total: \$${order.total.toStringAsFixed(2)}',
      items: order.items,
    );
  }

  @override
  void fetchFailed(String error) => view.showError(error);
}
```

### Testing the Presenter without any real UI or network

**Swift**

```swift
class MockOrderDetailView: OrderDetailView {
    var displayedTitle: String?
    var displayedTotal: String?
    var errorMessage: String?

    func displayOrder(title: String, totalLabel: String, items: [String]) {
        displayedTitle = title
        displayedTotal = totalLabel
    }
    func showError(_ message: String) { errorMessage = message }
}

func testPresenterFormatsTotalCorrectly() {
    let view = MockOrderDetailView()
    let presenter = OrderDetailPresenter(interactor: FakeInteractor(), router: MockRouter())
    presenter.view = view

    presenter.orderFetched(Order(orderId: "42", total: 149.90, status: "PLACED", items: ["Book"]))

    XCTAssertEqual(view.displayedTitle, "Order #42")
    XCTAssertEqual(view.displayedTotal, "Total: $149.90")
}

func testPresenterShowsErrorOnFetchFailure() {
    let view = MockOrderDetailView()
    let presenter = OrderDetailPresenter(interactor: FakeInteractor(), router: MockRouter())
    presenter.view = view

    presenter.fetchFailed("Network timeout")

    XCTAssertEqual(view.errorMessage, "Network timeout")
}
```

**Kotlin**

```kotlin
class FakeOrderDetailView : OrderDetailView {
    var displayedTitle: String? = null
    var displayedTotal: String? = null
    var errorMessage: String? = null

    override fun displayOrder(title: String, totalLabel: String, items: List<String>) {
        displayedTitle = title
        displayedTotal = totalLabel
    }
    override fun showError(message: String) { errorMessage = message }
}

@Test
fun `presenter formats total correctly`() {
    val view = FakeOrderDetailView()
    val presenter = OrderDetailPresenter(view, FakeInteractor(), FakeRouter())

    presenter.orderFetched(Order("42", total = 149.90, status = "PLACED", items = listOf("Book")))

    assertEquals("Order #42", view.displayedTitle)
    assertEquals("Total: 149.90", view.displayedTotal)
}

@Test
fun `presenter shows error on fetch failure`() {
    val view = FakeOrderDetailView()
    val presenter = OrderDetailPresenter(view, FakeInteractor(), FakeRouter())

    presenter.fetchFailed("Network timeout")

    assertEquals("Network timeout", view.errorMessage)
}
```

**Flutter**

```dart
class FakeOrderDetailView implements OrderDetailView {
  String? displayedTitle;
  String? displayedTotal;
  String? errorMessage;

  @override
  void displayOrder({required String title, required String totalLabel, required List<String> items}) {
    displayedTitle = title;
    displayedTotal = totalLabel;
  }

  @override
  void showError(String message) => errorMessage = message;
}

void main() {
  test('presenter formats total correctly', () {
    final view = FakeOrderDetailView();
    final presenter = OrderDetailPresenter(
      view: view,
      interactor: FakeInteractor(),
      router: FakeRouter(),
    );

    presenter.orderFetched(Order(orderId: '42', total: 149.90, status: 'PLACED', items: ['Book']));

    expect(view.displayedTitle, 'Order #42');
    expect(view.displayedTotal, 'Total: \$149.90');
  });

  test('presenter shows error on fetch failure', () {
    final view = FakeOrderDetailView();
    final presenter = OrderDetailPresenter(view: view, interactor: FakeInteractor(), router: FakeRouter());

    presenter.fetchFailed('Network timeout');

    expect(view.errorMessage, 'Network timeout');
  });
}
```

---

## When to use

- Large iOS apps with multiple teams owning separate features.
- Features with complex navigation flows (the Router makes those flows explicit and testable).
- When unit-testing every layer independently is a hard requirement.

## When NOT to use

- Apps with small teams or simple feature set — VIPER produces 5+ files per screen, which is overhead that rarely pays off below a certain team and complexity size.
- SwiftUI apps — VIPER's imperative View protocol conflicts with SwiftUI's declarative rendering. MVVM or [MVI](mvi.md) are better fits.
- Early-stage projects where domain boundaries are not yet clear — VIPER's rigid structure makes refactoring boundaries expensive.

---

## References

- Mutual Mobile. [Brigade's Experience Using an MVC Alternative](https://www.objc.io/issues/13-architecture/viper/). objc.io Issue #13, 2014.
- Reinder de Vries. [VIPER Architecture for iOS](https://www.appypie.com/viper-architecture). appypie.com.
- Martin, Robert C. *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.
