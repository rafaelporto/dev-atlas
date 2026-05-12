# MVP — Model-View-Presenter (Mobile)

> Extract all presentation logic into a Presenter that has no dependency on the UI framework, making it fully testable without a device or emulator.

Popularized in mobile development as a direct response to the Massive View Controller problem. Widely adopted in Android before Jetpack, and used in iOS as an alternative to vanilla MVC.

---

## What is it?

MVP replaces the Controller with a **Presenter** and changes the role of the View:

- **Model** — same as in MVC: data, business rules, data-fetching.
- **View** — becomes **passive**. It only displays what it is told and forwards events upward. It exposes an interface (protocol/interface) rather than being accessed directly.
- **Presenter** — contains all presentation logic. Decides what the View displays. Has zero dependency on UIKit, Android SDK, or any UI framework.

```
┌──────────────────┐   events (tap, input)    ┌───────────────────┐
│                  │ ───────────────────────► │                   │
│   View           │                          │   Presenter       │
│   (passive)      │ ◄─────────────────────── │   (pure logic)    │
│                  │   commands (show, hide)   │                   │
└──────────────────┘                          └────────┬──────────┘
         ▲                                             │  calls
         │ implements                                  ▼
  ┌──────────────┐                           ┌─────────────────┐
  │  View        │                           │     Model       │
  │  Interface   │                           │  (data layer)   │
  └──────────────┘                           └─────────────────┘
```

The Presenter knows the View only through its interface — never through a concrete class. This is what makes the Presenter testable: in tests, the interface is replaced by a fake.

---

## Why does it matter?

In MVC, the Controller holds a direct reference to the View (a concrete `UIViewController` or `Activity`). Testing the Controller requires instantiating the full UI stack — slow, fragile, and often impossible without a device.

In MVP, the Presenter depends on a `ViewInterface`, not a concrete screen. A test can pass in a fake implementation of that interface, exercising the Presenter's logic without touching any UI framework.

---

## How it works

1. The View receives a user event (button tap, text change).
2. The View calls a method on the Presenter: `presenter.onLoginTapped(email, password)`.
3. The Presenter applies logic, calls the Model, and then calls a method on the View interface: `view.showError("Invalid password")`.
4. The concrete View (the real screen) implements the interface and performs the actual UI update.

The key constraint: the Presenter never creates or reads UI components. It only calls the view interface.

---

## Examples

### Swift (UIKit)

```swift
// View protocol — defines what the concrete View can do
protocol LoginViewProtocol: AnyObject {
    func showLoading()
    func hideLoading()
    func showError(_ message: String)
    func navigateToHome()
}

// Model
class AuthService {
    func login(email: String, password: String, completion: @escaping (Result<Void, Error>) -> Void) { ... }
}

// Presenter — no UIKit imports, depends only on the protocol
class LoginPresenter {
    weak var view: LoginViewProtocol?
    private let authService: AuthService

    init(authService: AuthService) { self.authService = authService }

    func onLoginTapped(email: String, password: String) {
        guard !email.isEmpty, !password.isEmpty else {
            view?.showError("Email and password are required.")
            return
        }
        view?.showLoading()
        authService.login(email: email, password: password) { [weak self] result in
            self?.view?.hideLoading()
            switch result {
            case .success: self?.view?.navigateToHome()
            case .failure: self?.view?.showError("Invalid credentials.")
            }
        }
    }
}

// Concrete View — UIViewController implements the protocol
class LoginViewController: UIViewController, LoginViewProtocol {
    var presenter: LoginPresenter!

    func showLoading() { spinner.startAnimating() }
    func hideLoading() { spinner.stopAnimating() }
    func showError(_ message: String) { errorLabel.text = message }
    func navigateToHome() { navigationController?.pushViewController(HomeViewController(), animated: true) }

    @IBAction func loginTapped() {
        presenter.onLoginTapped(email: emailField.text ?? "", password: passwordField.text ?? "")
    }
}
```

### Kotlin (Android)

```kotlin
// View interface — defines what the concrete View can do
interface LoginView {
    fun showLoading()
    fun hideLoading()
    fun showError(message: String)
    fun navigateToHome()
}

// Model
class AuthService {
    fun login(email: String, password: String, callback: (Result<Unit>) -> Unit) { ... }
}

// Presenter — no Android SDK imports, depends only on the interface
class LoginPresenter(private val view: LoginView, private val authService: AuthService) {
    fun onLoginTapped(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            view.showError("Email and password are required.")
            return
        }
        view.showLoading()
        authService.login(email, password) { result ->
            view.hideLoading()
            result.fold(
                onSuccess = { view.navigateToHome() },
                onFailure = { view.showError("Invalid credentials.") }
            )
        }
    }
}

// Concrete View — Activity implements the interface
class LoginActivity : AppCompatActivity(), LoginView {
    private lateinit var presenter: LoginPresenter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)
        presenter = LoginPresenter(this, AuthService())
        loginButton.setOnClickListener {
            presenter.onLoginTapped(emailField.text.toString(), passwordField.text.toString())
        }
    }

    override fun showLoading() { spinner.visibility = View.VISIBLE }
    override fun hideLoading() { spinner.visibility = View.GONE }
    override fun showError(message: String) { errorView.text = message }
    override fun navigateToHome() { startActivity(Intent(this, HomeActivity::class.java)) }
}
```

### Flutter (Dart)

```dart
// View interface — abstract class defines the contract
abstract class LoginView {
  void showLoading();
  void hideLoading();
  void showError(String message);
  void navigateToHome();
}

// Model
class AuthService {
  Future<void> login(String email, String password) async { ... }
}

// Presenter — no Flutter imports, depends only on the interface
class LoginPresenter {
  final LoginView view;
  final AuthService authService;

  LoginPresenter({required this.view, required this.authService});

  Future<void> onLoginTapped(String email, String password) async {
    if (email.isEmpty || password.isEmpty) {
      view.showError('Email and password are required.');
      return;
    }
    view.showLoading();
    try {
      await authService.login(email, password);
      view.hideLoading();
      view.navigateToHome();
    } catch (_) {
      view.hideLoading();
      view.showError('Invalid credentials.');
    }
  }
}

// Concrete View — StatefulWidget implements the interface
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> implements LoginView {
  late final LoginPresenter presenter;
  bool loading = false;
  String? error;

  @override
  void initState() {
    super.initState();
    presenter = LoginPresenter(view: this, authService: AuthService());
  }

  @override void showLoading() => setState(() => loading = true);
  @override void hideLoading() => setState(() => loading = false);
  @override void showError(String message) => setState(() => error = message);
  @override void navigateToHome() => Navigator.pushReplacementNamed(context, '/home');

  @override
  Widget build(BuildContext context) { ... }
}
```

### Testing the Presenter without any UI

**Swift**

```swift
class MockLoginView: LoginViewProtocol {
    var loadingShown = false
    var errorShown: String?
    var navigatedToHome = false

    func showLoading() { loadingShown = true }
    func hideLoading() { loadingShown = false }
    func showError(_ message: String) { errorShown = message }
    func navigateToHome() { navigatedToHome = true }
}

func testLoginNavigatesToHomeOnSuccess() {
    let view = MockLoginView()
    let presenter = LoginPresenter(authService: SucceedingAuthService())
    presenter.view = view
    presenter.onLoginTapped(email: "user@example.com", password: "secret")

    XCTAssertTrue(view.navigatedToHome)
    XCTAssertNil(view.errorShown)
}

func testLoginShowsErrorOnEmptyEmail() {
    let view = MockLoginView()
    let presenter = LoginPresenter(authService: SucceedingAuthService())
    presenter.view = view
    presenter.onLoginTapped(email: "", password: "secret")

    XCTAssertEqual(view.errorShown, "Email and password are required.")
    XCTAssertFalse(view.navigatedToHome)
}
```

**Kotlin**

```kotlin
class FakeLoginView : LoginView {
    var loadingShown = false
    var errorShown: String? = null
    var navigatedToHome = false

    override fun showLoading() { loadingShown = true }
    override fun hideLoading() { loadingShown = false }
    override fun showError(message: String) { errorShown = message }
    override fun navigateToHome() { navigatedToHome = true }
}

@Test
fun `login navigates to home on success`() {
    val view = FakeLoginView()
    val presenter = LoginPresenter(view, SucceedingAuthService())
    presenter.onLoginTapped("user@example.com", "secret")

    assertTrue(view.navigatedToHome)
    assertNull(view.errorShown)
}

@Test
fun `login shows error when email is empty`() {
    val view = FakeLoginView()
    val presenter = LoginPresenter(view, SucceedingAuthService())
    presenter.onLoginTapped("", "secret")

    assertEquals("Email and password are required.", view.errorShown)
    assertFalse(view.navigatedToHome)
}
```

**Flutter**

```dart
class FakeLoginView implements LoginView {
  bool loadingShown = false;
  String? errorShown;
  bool navigatedToHome = false;

  @override void showLoading() => loadingShown = true;
  @override void hideLoading() => loadingShown = false;
  @override void showError(String message) => errorShown = message;
  @override void navigateToHome() => navigatedToHome = true;
}

void main() {
  test('login navigates to home on success', () async {
    final view = FakeLoginView();
    final presenter = LoginPresenter(view: view, authService: SucceedingAuthService());
    await presenter.onLoginTapped('user@example.com', 'secret');

    expect(view.navigatedToHome, isTrue);
    expect(view.errorShown, isNull);
  });

  test('login shows error when email is empty', () async {
    final view = FakeLoginView();
    final presenter = LoginPresenter(view: view, authService: SucceedingAuthService());
    await presenter.onLoginTapped('', 'secret');

    expect(view.errorShown, 'Email and password are required.');
    expect(view.navigatedToHome, isFalse);
  });
}
```

The Presenter runs entirely without a device, emulator, or UI framework.

---

## When to use

- When testing presentation logic in isolation is a priority.
- UIKit codebases that want testability without adopting reactive frameworks.
- Teams already familiar with the pattern, where the boilerplate cost is known.

## When NOT to use

- SwiftUI or Jetpack Compose — their declarative, reactive nature makes the passive-View contract awkward and verbose.
- Simple screens where the View interface adds ceremony without benefit.
- When the team is adopting MVVM or MVI: MVP's explicit View interface is superseded by data binding or state observation.

---

## References

- Fowler, Martin. [GUI Architectures — Supervising Controller / Passive View](https://martinfowler.com/eaaDev/uiArchs.html). martinfowler.com, 2006.
- Android Blueprints. [todo-mvp](https://github.com/android/architecture-samples/tree/todo-mvp). github.com/android.
- Orta Therox. [Artsy's MVP](https://artsy.github.io/blog/2015/09/24/mvvm-in-swift/). artsy.github.io.
