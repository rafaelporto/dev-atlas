# MVC — Model-View-Controller (Mobile)

> The original architectural pattern for iOS — simple to start, notorious for accumulating logic in the Controller as apps grow.

Originated in Smalltalk-80. Apple adopted it as the default pattern for UIKit, and it remains the starting point for understanding all patterns that followed.

---

## What is it?

MVC divides an application into three roles:

- **Model** — data and business rules. Knows nothing about the UI.
- **View** — the visual layer. Displays data, captures user input. Knows nothing about business rules.
- **Controller** — the mediator. Receives user events from the View, queries the Model, and updates the View.

```
┌──────────┐   user events    ┌────────────────┐
│          │ ───────────────► │                │
│   View   │                  │   Controller   │
│          │ ◄─────────────── │                │
└──────────┘   UI updates     └───────┬────────┘
                                      │  queries /
                                      │  updates
                               ┌──────▼──────┐
                               │    Model    │
                               └─────────────┘
```

The Controller is the only component that knows both the View and the Model.

---

## Why does it matter?

MVC is the foundation of UIKit on iOS. Understanding it is necessary to understand every pattern that evolved from it — MVP, MVVM, and MVI all exist to solve specific weaknesses of MVC. Knowing those weaknesses explains why each successor makes the choices it does.

---

## How it works

1. The user interacts with the View (tap, swipe, text input).
2. The View forwards the event to the Controller.
3. The Controller applies any logic and calls the Model.
4. The Model updates its state and notifies the Controller (via delegation or callback).
5. The Controller reads the new state and tells the View what to display.

The View and Model never communicate directly.

---

## Examples

### Swift (UIKit)

```swift
// Model — pure data, no UI knowledge
struct UserProfile {
    let userId: String
    let name: String
    let bio: String
}

// View — displays data, reports events upward
class ProfileView: UIView {
    func display(name: String, bio: String) {
        nameLabel.text = name
        bioLabel.text = bio
    }
    func showLoading() { spinner.startAnimating() }
    func showError(_ message: String) { errorLabel.text = message }
}

// Controller — mediates between View and Model
class ProfileViewController: UIViewController {
    private var profileView: ProfileView { view as! ProfileView }
    private let apiClient: APIClient
    private let userId: String

    override func viewDidLoad() {
        super.viewDidLoad()
        profileView.showLoading()
        apiClient.getUser(id: userId) { [weak self] result in
            switch result {
            case .success(let profile):
                self?.profileView.display(name: profile.name, bio: profile.bio)
            case .failure(let error):
                self?.profileView.showError(error.localizedDescription)
            }
        }
    }
}
```

### Kotlin (Android)

```kotlin
// Model — pure data, no UI knowledge
data class UserProfile(val userId: String, val name: String, val bio: String)

// In Android, the Activity acts as both View and Controller in classic MVC
class ProfileActivity : AppCompatActivity() {
    private val apiClient = ApiClient()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)
        val userId = intent.getStringExtra("userId") ?: return
        showLoading()
        apiClient.getUser(userId) { result ->
            result.fold(
                onSuccess = { display(it.name, it.bio) },
                onFailure = { showError(it.message ?: "Error") }
            )
        }
    }

    private fun display(name: String, bio: String) {
        nameView.text = name
        bioView.text = bio
    }
    private fun showLoading() { spinner.visibility = View.VISIBLE }
    private fun showError(message: String) { errorView.text = message }
}
```

### Flutter (Dart)

```dart
// Model — pure data, no UI knowledge
class UserProfile {
  final String userId;
  final String name;
  final String bio;
  const UserProfile({required this.userId, required this.name, required this.bio});
}

// Controller — plain Dart class, no Flutter imports
class ProfileController {
  final ApiClient apiClient;
  ProfileController({required this.apiClient});

  Future<UserProfile> loadProfile(String userId) async {
    final data = await apiClient.getUser(userId);
    return UserProfile(userId: data['id'], name: data['name'], bio: data['bio']);
  }
}

// View — StatefulWidget delegates to Controller
class ProfileScreen extends StatefulWidget {
  final String userId;
  const ProfileScreen({required this.userId, super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final controller = ProfileController(apiClient: ApiClient());
  UserProfile? profile;
  Object? error;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    controller.loadProfile(widget.userId).then((p) {
      setState(() { profile = p; loading = false; });
    }).catchError((e) {
      setState(() { error = e; loading = false; });
    });
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const CircularProgressIndicator();
    if (error != null) return Text('Error: $error');
    return Text('${profile!.name}\n${profile!.bio}');
  }
}
```

### The Massive View Controller problem

As apps grow, the Controller accumulates responsibilities with no natural boundary:

**Swift**

```swift
class OrderViewController: UIViewController, UITableViewDataSource, UITableViewDelegate {
    override func viewDidLoad() {
        super.viewDidLoad()
        setupTableView()    // UI setup
        loadOrders()        // network call
        setupAnalytics()    // tracking
        configureRefresh()  // pull-to-refresh logic
        handleDeepLink()    // navigation
    }

    private func loadOrders() {
        // parsing, caching, error handling, retry logic — all here
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { orders.count }
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell { ... }
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) { ... }
}
```

**Kotlin**

```kotlin
class OrderActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setupRecyclerView()     // UI setup
        loadOrders()            // network call
        setupAnalytics()        // tracking
        configureSwipeRefresh() // pull-to-refresh logic
        handleDeepLink()        // navigation
    }

    private fun loadOrders() {
        // parsing, caching, error handling, retry logic — all here
    }
    // RecyclerView adapter, click listeners — also here
}
```

**Flutter**

```dart
class _OrderScreenState extends State<OrderScreen> {
  @override
  void initState() {
    super.initState();
    _setupList();       // UI setup
    _loadOrders();      // network call
    _setupAnalytics();  // tracking
    _handleDeepLink();  // navigation
  }

  void _loadOrders() {
    // parsing, caching, error handling, retry logic — all here
  }

  @override
  Widget build(BuildContext context) {
    // list rendering, click handling, pull-to-refresh — all here
    return ListView.builder(...);
  }
}
```

The Controller becomes the catch-all for anything with no other obvious home. Testing it requires a live UI context, making unit tests impractical.

---

## When to use

- Simple screens with minimal logic (a settings toggle, a static detail view).
- UIKit projects where the codebase is already MVC and extraction is not justified.
- Prototypes where architecture correctness is not the goal.

## When NOT to use

- Screens with complex state or multiple data sources — the Controller will grow.
- When unit-testing presentation logic is a requirement — the Controller is coupled to UIKit.
- New projects starting from scratch: MVVM or Clean Architecture with MVVM offer the same simplicity at small scale and hold up better as the app grows.

---

## References

- Apple. [Model-View-Controller](https://developer.apple.com/library/archive/documentation/General/Conceptual/CocoaEncyclopedia/Model-View-Controller/Model-View-Controller.html). Apple Developer Documentation.
- Fowler, Martin. [GUI Architectures](https://martinfowler.com/eaaDev/uiArchs.html). martinfowler.com, 2006.
- Khanlou, Soroush. [Slicing View Controllers](https://www.objc.io/issues/1-view-controllers/). objc.io Issue #1.
