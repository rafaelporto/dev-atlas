# MVVM — Model-View-ViewModel (Mobile)

> The ViewModel exposes observable state; the View subscribes and re-renders automatically — no explicit commands, no View interface to maintain.

Introduced by Microsoft (2005) for WPF. Became the dominant mobile pattern with Android Jetpack (ViewModel + LiveData/StateFlow) and SwiftUI (`@ObservableObject` / `@Observable`).

---

## What is it?

MVVM introduces the **ViewModel** as the intermediary between data and UI:

- **Model** — data sources: APIs, databases, repositories. Returns raw data.
- **ViewModel** — holds and exposes **UI state** as observable streams. Contains presentation logic. Has no reference to the View and no import of any UI framework.
- **View** — observes the ViewModel's state and re-renders whenever it changes. The View reacts; it never calls methods on the ViewModel to request data directly.

```
┌────────────────┐    observes state     ┌──────────────────┐
│                │ ◄─────────────────── │                  │
│     View       │                       │   ViewModel      │
│                │ ──── user events ───► │                  │
└────────────────┘                       └────────┬─────────┘
                                                  │  calls
                                         ┌────────▼─────────┐
                                         │      Model       │
                                         │  (repositories,  │
                                         │   data sources)  │
                                         └──────────────────┘
```

The critical difference from [MVP](mvp.md): in MVP the Presenter calls methods on the View interface. In MVVM, the ViewModel never calls the View at all — the View subscribes and is notified by the state stream.

---

## Why does it matter?

MVVM eliminates the explicit View interface of MVP. The ViewModel doesn't need to know the View exists. This makes the ViewModel even more isolated: it can be tested without a fake View, only by asserting on the state it emits.

Data binding also removes boilerplate. Instead of calling a setter after every state change, the View is wired to the state stream once, and updates happen automatically.

---

## How it works

1. The View subscribes to the ViewModel's state stream on initialization.
2. The user interacts with the View (tap, input).
3. The View calls an action on the ViewModel: `viewModel.loadPosts()`.
4. The ViewModel calls the Model (repository, service).
5. The ViewModel updates its state.
6. The state stream emits the new value.
7. The View receives the update and re-renders — without any further call from the ViewModel.

---

## Examples

### Swift (SwiftUI + @Observable)

```swift
// UI State — immutable value type
struct PostsUiState {
    var posts: [Post] = []
    var isLoading: Bool = false
    var error: String? = nil
}

// ViewModel — @Observable, no SwiftUI imports in this file
@Observable
class PostsViewModel {
    private(set) var state = PostsUiState()
    private let repository: PostRepository

    init(repository: PostRepository) { self.repository = repository }

    func loadPosts() {
        state.isLoading = true
        state.error = nil
        Task {
            do {
                let posts = try await repository.getAll()
                state = PostsUiState(posts: posts)
            } catch {
                state = PostsUiState(error: error.localizedDescription)
            }
        }
    }
}

// View — reads state, calls actions
struct PostsView: View {
    @State private var viewModel = PostsViewModel(repository: RemotePostRepository())

    var body: some View {
        Group {
            if viewModel.state.isLoading {
                ProgressView()
            } else if let error = viewModel.state.error {
                Text("Error: \(error)")
            } else {
                List(viewModel.state.posts) { Text($0.title) }
            }
        }
        .onAppear { viewModel.loadPosts() }
    }
}
```

### Kotlin (ViewModel + StateFlow + Compose)

```kotlin
// UI State — immutable data class
data class PostsUiState(
    val posts: List<Post> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

// ViewModel — Android ViewModel, exposes StateFlow
class PostsViewModel(private val repository: PostRepository) : ViewModel() {
    private val _state = MutableStateFlow(PostsUiState())
    val state: StateFlow<PostsUiState> = _state.asStateFlow()

    fun loadPosts() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            runCatching { repository.getAll() }
                .onSuccess { posts -> _state.update { PostsUiState(posts = posts) } }
                .onFailure { error -> _state.update { PostsUiState(error = error.message) } }
        }
    }
}

// View — Composable collects state
@Composable
fun PostsScreen(viewModel: PostsViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.loadPosts() }

    when {
        state.isLoading -> CircularProgressIndicator()
        state.error != null -> Text("Error: ${state.error}")
        else -> LazyColumn { items(state.posts) { post -> Text(post.title) } }
    }
}
```

### Flutter (Dart — ChangeNotifier)

```dart
// UI State — immutable value class
class PostsUiState {
  final List<Post> posts;
  final bool isLoading;
  final String? error;

  const PostsUiState({this.posts = const [], this.isLoading = false, this.error});

  PostsUiState copyWith({List<Post>? posts, bool? isLoading, String? error}) =>
      PostsUiState(
        posts: posts ?? this.posts,
        isLoading: isLoading ?? this.isLoading,
        error: error ?? this.error,
      );
}

// ViewModel — ChangeNotifier, no Flutter UI imports
class PostsViewModel extends ChangeNotifier {
  final PostRepository repository;
  PostsUiState state = const PostsUiState();

  PostsViewModel({required this.repository});

  Future<void> loadPosts() async {
    state = state.copyWith(isLoading: true, error: null);
    notifyListeners();
    try {
      final posts = await repository.getAll();
      state = PostsUiState(posts: posts);
    } catch (e) {
      state = PostsUiState(error: e.toString());
    }
    notifyListeners();
  }
}

// View — Consumer listens to ViewModel
class PostsScreen extends StatelessWidget {
  const PostsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => PostsViewModel(repository: RemotePostRepository())..loadPosts(),
      child: Consumer<PostsViewModel>(
        builder: (_, vm, __) {
          if (vm.state.isLoading) return const CircularProgressIndicator();
          if (vm.state.error != null) return Text('Error: ${vm.state.error}');
          return ListView(children: vm.state.posts.map((p) => Text(p.title)).toList());
        },
      ),
    );
  }
}
```

### Testing the ViewModel without any View

**Swift**

```swift
func testLoadPostsEmitsSuccessState() async {
    let repo = FakePostRepository(posts: [Post(id: "1", title: "Hello"), Post(id: "2", title: "World")])
    let vm = PostsViewModel(repository: repo)

    await vm.loadPosts()

    XCTAssertFalse(vm.state.isLoading)
    XCTAssertEqual(vm.state.posts.count, 2)
    XCTAssertNil(vm.state.error)
}

func testLoadPostsEmitsErrorOnFailure() async {
    let vm = PostsViewModel(repository: FailingPostRepository())

    await vm.loadPosts()

    XCTAssertNotNil(vm.state.error)
}
```

**Kotlin**

```kotlin
@Test
fun `loadPosts emits loading then success`() = runTest {
    val repo = FakePostRepository(posts = listOf(Post("1", "Hello"), Post("2", "World")))
    val vm = PostsViewModel(repo)

    vm.loadPosts()
    advanceUntilIdle()

    with(vm.state.value) {
        assertFalse(isLoading)
        assertEquals(2, posts.size)
        assertNull(error)
    }
}

@Test
fun `loadPosts emits error on failure`() = runTest {
    val vm = PostsViewModel(FailingPostRepository())

    vm.loadPosts()
    advanceUntilIdle()

    assertNotNull(vm.state.value.error)
}
```

**Flutter**

```dart
void main() {
  test('loadPosts emits success state', () async {
    final repo = FakePostRepository(posts: [Post('1', 'Hello'), Post('2', 'World')]);
    final vm = PostsViewModel(repository: repo);

    await vm.loadPosts();

    expect(vm.state.isLoading, isFalse);
    expect(vm.state.posts, hasLength(2));
    expect(vm.state.error, isNull);
  });

  test('loadPosts emits error on failure', () async {
    final vm = PostsViewModel(repository: FailingPostRepository());

    await vm.loadPosts();

    expect(vm.state.error, isNotNull);
  });
}
```

No fake View needed — each test asserts on the state directly.

---

## When to use

- Any Android app using Jetpack — ViewModel is part of the framework and handles lifecycle automatically.
- SwiftUI apps — the reactive model is a natural fit.
- When you want a testable presentation layer without the ceremony of explicit View interfaces.

## When NOT to use

- UIKit apps without a reactive framework (RxSwift, Combine) — data binding must be wired manually, which reduces the advantage over MVP.
- Very simple screens where the ViewModel would hold a single string and one boolean — the overhead is not justified.

---

## References

- Google. [ViewModel Overview](https://developer.android.com/topic/libraries/architecture/viewmodel). Android Developers Documentation.
- Apple. [Managing model data in your app](https://developer.apple.com/documentation/swiftui/managing-model-data-in-your-app). Apple Developer Documentation.
- Fowler, Martin. [Presentation Model](https://martinfowler.com/eaaDev/PresentationModel.html). martinfowler.com, 2004.
