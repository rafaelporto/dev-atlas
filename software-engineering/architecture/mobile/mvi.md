# MVI — Model-View-Intent (Mobile)

> A single, immutable state object flows in one direction through the system — user actions produce new states, never mutate existing ones.

MVI applies the Unidirectional Data Flow (UDF) principle to mobile UIs. It is the conceptual foundation behind Jetpack Compose's state model and SwiftUI's data flow.

---

## What is it?

MVI defines three roles and a strict cycle:

- **Intent** — a user action or system event (button tap, data loaded, error received). Intents are value objects; they describe *what happened*, not *what to do*.
- **Model** — the complete, immutable UI state at a given moment. A single source of truth for everything the View needs to render.
- **View** — a pure function of the Model. Given a state, it renders exactly that state. It produces Intents; it never mutates state directly.

```
                     ┌──────────┐
          ┌──────────►  Intent  │
          │          └────┬─────┘
          │               │
   user   │               ▼
  action  │         ┌───────────┐
          │         │  Reducer  │  pure function: (State, Intent) → State
          │         └─────┬─────┘
          │               │
          │               ▼
          │         ┌───────────┐
          └─────────┤   State   │  immutable snapshot
                    └─────┬─────┘
                          │
                          ▼
                    ┌───────────┐
                    │   View    │  renders state, emits intents
                    └───────────┘
```

The cycle is closed and unidirectional: State → View → Intent → Reducer → State.

---

## Why does it matter?

In [MVVM](mvvm.md), state is typically scattered across multiple `@Published` or `LiveData` properties. A screen with a list, a loading flag, and an error message has three separate streams that can briefly be out of sync — for example, `isLoading = true` while `error` still holds a stale value from the previous attempt.

MVI replaces multiple streams with a single sealed state type. The entire UI is always consistent because it always renders one atomic snapshot. Bugs caused by partial state updates disappear.

---

## How it works

1. The View emits an Intent in response to a user action.
2. The Reducer receives the current State and the Intent.
3. The Reducer returns a new State — it never mutates the existing one.
4. The View observes the State stream and re-renders completely.

The Reducer is a **pure function**: given the same State and Intent, it always produces the same new State. This makes it trivially testable.

---

## Examples

### Swift (SwiftUI + @Observable)

```swift
// State — complete, immutable UI snapshot
struct SearchState: Equatable {
    var query: String = ""
    var results: [String] = []
    var isLoading: Bool = false
    var error: String? = nil
}

// Intents — sealed enum of what the user or system can trigger
enum SearchIntent {
    case queryChanged(String)
    case searchSubmitted
    case resultsLoaded([String])
    case searchFailed(String)
}

// Reducer — pure function: (State, Intent) → State
func reduce(state: SearchState, intent: SearchIntent) -> SearchState {
    var next = state
    switch intent {
    case .queryChanged(let q):
        next.query = q; next.error = nil
    case .searchSubmitted:
        next.isLoading = true; next.results = []; next.error = nil
    case .resultsLoaded(let r):
        next.isLoading = false; next.results = r
    case .searchFailed(let e):
        next.isLoading = false; next.error = e
    }
    return next
}

// ViewModel — processes intents, dispatches async effects
@Observable
class SearchViewModel {
    private(set) var state = SearchState()
    private let searchService: SearchService

    init(searchService: SearchService) { self.searchService = searchService }

    func process(_ intent: SearchIntent) {
        state = reduce(state: state, intent: intent)
        if case .searchSubmitted = intent { executeSearch(query: state.query) }
    }

    private func executeSearch(query: String) {
        Task {
            do {
                let results = try await searchService.search(query)
                process(.resultsLoaded(results))
            } catch {
                process(.searchFailed(error.localizedDescription))
            }
        }
    }
}

// View — renders state, emits intents
struct SearchView: View {
    @State private var viewModel = SearchViewModel(searchService: RemoteSearchService())

    var body: some View {
        VStack {
            TextField("Search", text: Binding(
                get: { viewModel.state.query },
                set: { viewModel.process(.queryChanged($0)) }
            ))
            Button("Search") { viewModel.process(.searchSubmitted) }
            if viewModel.state.isLoading { ProgressView() }
            else if let error = viewModel.state.error { Text("Error: \(error)") }
            else { List(viewModel.state.results, id: \.self) { Text($0) } }
        }
    }
}
```

### Kotlin (ViewModel + StateFlow + Compose)

```kotlin
// State — complete, immutable UI snapshot
data class SearchState(
    val query: String = "",
    val results: List<String> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

// Intents — sealed hierarchy of what the user or system can trigger
sealed interface SearchIntent {
    data class QueryChanged(val query: String) : SearchIntent
    data object SearchSubmitted : SearchIntent
    data class ResultsLoaded(val results: List<String>) : SearchIntent
    data class SearchFailed(val error: String) : SearchIntent
}

// Reducer — pure function: (State, Intent) → State
fun reduce(state: SearchState, intent: SearchIntent): SearchState = when (intent) {
    is SearchIntent.QueryChanged -> state.copy(query = intent.query, error = null)
    is SearchIntent.SearchSubmitted -> state.copy(isLoading = true, results = emptyList(), error = null)
    is SearchIntent.ResultsLoaded -> state.copy(isLoading = false, results = intent.results)
    is SearchIntent.SearchFailed -> state.copy(isLoading = false, error = intent.error)
}

// ViewModel — processes intents, dispatches async effects
class SearchViewModel(private val searchService: SearchService) : ViewModel() {
    private val _state = MutableStateFlow(SearchState())
    val state: StateFlow<SearchState> = _state.asStateFlow()

    fun process(intent: SearchIntent) {
        _state.update { reduce(it, intent) }
        if (intent is SearchIntent.SearchSubmitted) executeSearch(_state.value.query)
    }

    private fun executeSearch(query: String) {
        viewModelScope.launch {
            runCatching { searchService.search(query) }
                .onSuccess { process(SearchIntent.ResultsLoaded(it)) }
                .onFailure { process(SearchIntent.SearchFailed(it.message ?: "Error")) }
        }
    }
}

// View — Composable renders state and emits intents
@Composable
fun SearchScreen(viewModel: SearchViewModel = viewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column {
        TextField(
            value = state.query,
            onValueChange = { viewModel.process(SearchIntent.QueryChanged(it)) },
            label = { Text("Search") }
        )
        Button(onClick = { viewModel.process(SearchIntent.SearchSubmitted) }) { Text("Search") }
        when {
            state.isLoading -> CircularProgressIndicator()
            state.error != null -> Text("Error: ${state.error}")
            else -> LazyColumn { items(state.results) { Text(it) } }
        }
    }
}
```

### Flutter (Dart)

```dart
// State — complete, immutable UI snapshot
class SearchState {
  final String query;
  final List<String> results;
  final bool isLoading;
  final String? error;

  const SearchState({this.query = '', this.results = const [], this.isLoading = false, this.error});

  SearchState copyWith({String? query, List<String>? results, bool? isLoading, String? error}) =>
      SearchState(
        query: query ?? this.query,
        results: results ?? this.results,
        isLoading: isLoading ?? this.isLoading,
        error: error ?? this.error,
      );
}

// Intents — sealed classes for what the user or system can trigger
sealed class SearchIntent {}
class QueryChanged extends SearchIntent { final String query; QueryChanged(this.query); }
class SearchSubmitted extends SearchIntent {}
class ResultsLoaded extends SearchIntent { final List<String> results; ResultsLoaded(this.results); }
class SearchFailed extends SearchIntent { final String error; SearchFailed(this.error); }

// Reducer — pure function: (State, Intent) → State
SearchState reduce(SearchState state, SearchIntent intent) {
  if (intent is QueryChanged) return state.copyWith(query: intent.query, error: null);
  if (intent is SearchSubmitted) return state.copyWith(isLoading: true, results: [], error: null);
  if (intent is ResultsLoaded) return state.copyWith(isLoading: false, results: intent.results);
  if (intent is SearchFailed) return state.copyWith(isLoading: false, error: intent.error);
  return state;
}

// ViewModel — processes intents, dispatches async effects
class SearchViewModel extends ChangeNotifier {
  final SearchService searchService;
  SearchState state = const SearchState();

  SearchViewModel({required this.searchService});

  Future<void> process(SearchIntent intent) async {
    state = reduce(state, intent);
    notifyListeners();
    if (intent is SearchSubmitted) await _executeSearch(state.query);
  }

  Future<void> _executeSearch(String query) async {
    try {
      final results = await searchService.search(query);
      await process(ResultsLoaded(results));
    } catch (e) {
      await process(SearchFailed(e.toString()));
    }
  }
}
```

### Testing the Reducer in isolation

The Reducer is a pure function — no mocks, no async, no framework. Each test is three lines.

**Swift**

```swift
func testQueryChangedUpdatesQueryAndClearsError() {
    let state = SearchState(query: "old", error: "previous error")
    let next = reduce(state: state, intent: .queryChanged("new"))

    XCTAssertEqual(next.query, "new")
    XCTAssertNil(next.error)
}

func testSearchSubmittedSetsLoading() {
    let state = SearchState(results: ["old result"])
    let next = reduce(state: state, intent: .searchSubmitted)

    XCTAssertTrue(next.isLoading)
    XCTAssertTrue(next.results.isEmpty)
}

func testResultsLoadedClearsLoading() {
    let state = SearchState(isLoading: true)
    let next = reduce(state: state, intent: .resultsLoaded(["a", "b"]))

    XCTAssertFalse(next.isLoading)
    XCTAssertEqual(next.results, ["a", "b"])
}
```

**Kotlin**

```kotlin
@Test
fun `query changed updates query and clears error`() {
    val state = SearchState(query = "old", error = "previous error")
    val next = reduce(state, SearchIntent.QueryChanged("new"))

    assertEquals("new", next.query)
    assertNull(next.error)
}

@Test
fun `search submitted sets loading`() {
    val state = SearchState(results = listOf("old result"))
    val next = reduce(state, SearchIntent.SearchSubmitted)

    assertTrue(next.isLoading)
    assertTrue(next.results.isEmpty())
}

@Test
fun `results loaded clears loading`() {
    val state = SearchState(isLoading = true)
    val next = reduce(state, SearchIntent.ResultsLoaded(listOf("a", "b")))

    assertFalse(next.isLoading)
    assertEquals(listOf("a", "b"), next.results)
}
```

**Flutter**

```dart
void main() {
  test('query changed updates query and clears error', () {
    final state = SearchState(query: 'old', error: 'previous error');
    final next = reduce(state, QueryChanged('new'));

    expect(next.query, 'new');
    expect(next.error, isNull);
  });

  test('search submitted sets loading', () {
    final state = SearchState(results: ['old result']);
    final next = reduce(state, SearchSubmitted());

    expect(next.isLoading, isTrue);
    expect(next.results, isEmpty);
  });

  test('results loaded clears loading', () {
    final state = SearchState(isLoading: true);
    final next = reduce(state, ResultsLoaded(['a', 'b']));

    expect(next.isLoading, isFalse);
    expect(next.results, ['a', 'b']);
  });
}
```

---

## When to use

- Screens with complex state that involves multiple concurrent conditions (loading, error, empty, populated).
- Jetpack Compose or SwiftUI — their rendering model is built around this pattern.
- When debugging state transitions matters: the immutable state log makes it trivial to reproduce any UI state exactly.
- Teams comfortable with functional programming concepts.

## When NOT to use

- Simple screens with one or two state variables — the sealed Intent hierarchy and Reducer add structure that is not needed.
- Teams new to functional/reactive programming — the learning curve is real and can slow initial delivery.

---

## References

- Google. [UI State Production](https://developer.android.com/topic/architecture/ui-layer/stateholders). Android Architecture Guide.
- Hannes Dorfmann. [Model-View-Intent](http://hannesdorfmann.com/android/model-view-intent/). hannesdorfmann.com, 2016.
- Apple. [State and Data Flow](https://developer.apple.com/documentation/swiftui/state-and-data-flow). Apple Developer Documentation.
