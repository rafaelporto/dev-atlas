# Clean Architecture (Mobile)

> Organize the app into concentric layers where the dependency rule is absolute: inner layers know nothing about outer layers — not the UI framework, not the network library, not the database.

Introduced by Robert C. Martin ("Uncle Bob") in 2012. In mobile, the pattern translates into three layers: Presentation, Domain, and Data.

---

## What is it?

Clean Architecture for mobile defines three layers with a strict dependency direction:

- **Presentation** — UI components and their state holders (ViewModel, Presenter). Knows the Domain layer. Knows nothing about Data sources.
- **Domain** — Use Cases and Entities. Pure business logic. No import of any platform SDK, UI framework, or third-party library. The most stable layer.
- **Data** — Repository implementations, API clients, local databases. Implements interfaces defined by Domain.

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation                                               │
│  (ViewModel / Presenter + UI)                               │
│                                                             │
│    calls ▼                                                  │
├─────────────────────────────────────────────────────────────┤
│  Domain                                                     │
│  (Use Cases + Entities + Repository Interfaces)             │
│                                                             │
│    defines interfaces ▼        ◄── implemented by ──┐      │
├─────────────────────────────────────────────────────────────┤
│  Data                                                       │
│  (Repository Implementations + API Clients + Local DB)      │
└─────────────────────────────────────────────────────────────┘
```

**The Dependency Rule:** arrows always point inward. Data depends on Domain. Presentation depends on Domain. Domain depends on nothing.

---

## Why does it matter?

Without this structure, business logic leaks into ViewModels or ViewControllers, and networking code gets copied across features. When the API changes, you touch the ViewModel. When a design system changes, you rewrite tests that had nothing to do with UI.

Clean Architecture creates a firewall around Domain. You can swap the network library, migrate from REST to GraphQL, or replace the local database — without modifying a single Use Case.

---

## How it works

### Domain layer — no external dependencies

The Domain layer contains two types:

- **Entities** — core business objects. Plain data classes or structs.
- **Use Cases** — one class per action. Each Use Case calls a Repository interface (defined in Domain, implemented in Data) and returns a result.

### Presentation layer — calls Use Cases

The ViewModel (or Presenter) calls a Use Case. It holds no repository, makes no network call, and knows no HTTP or database type. The only import from outside Domain is the UI framework it needs to hold state.

### Data layer — implements Domain's interfaces

Repository implementations in Data call APIs, databases, or caches. They translate raw responses into Domain Entities. The Presentation layer never sees the raw HTTP response.

---

## Examples

### Swift

```swift
// ── DOMAIN LAYER ──────────────────────────────────────────────
// No UIKit, no Combine, no networking libraries

struct UserProfile {
    let userId: String
    let displayName: String
    let avatarUrl: String
    let followerCount: Int
}

protocol UserProfileRepository {
    func getProfile(userId: String) async throws -> UserProfile
}

class GetUserProfileUseCase {
    private let repository: UserProfileRepository

    init(repository: UserProfileRepository) { self.repository = repository }

    func execute(userId: String) async throws -> UserProfile {
        guard !userId.isEmpty else { throw ProfileError.emptyUserId }
        return try await repository.getProfile(userId: userId)
    }
}


// ── PRESENTATION LAYER ─────────────────────────────────────────
// Knows Domain; knows nothing about how data is fetched

struct ProfileUiState {
    var displayName: String = ""
    var followerLabel: String = ""
    var avatarUrl: String = ""
    var isLoading: Bool = false
    var error: String? = nil
}

@Observable
class ProfileViewModel {
    private(set) var state = ProfileUiState()
    private let useCase: GetUserProfileUseCase

    init(useCase: GetUserProfileUseCase) { self.useCase = useCase }

    func load(userId: String) {
        state.isLoading = true
        Task {
            do {
                let profile = try await useCase.execute(userId: userId)
                state = ProfileUiState(
                    displayName: profile.displayName,
                    followerLabel: "\(profile.followerCount) followers",
                    avatarUrl: profile.avatarUrl
                )
            } catch {
                state = ProfileUiState(error: error.localizedDescription)
            }
        }
    }
}


// ── DATA LAYER ────────────────────────────────────────────────
// Implements Domain interfaces; knows about URLSession, caching

class RemoteUserProfileRepository: UserProfileRepository {
    private let session: URLSession
    private let cache: ProfileCache

    init(session: URLSession = .shared, cache: ProfileCache) {
        self.session = session
        self.cache = cache
    }

    func getProfile(userId: String) async throws -> UserProfile {
        if let cached = cache.get(userId) { return cached }
        let url = URL(string: "/v1/users/\(userId)")!
        let (data, _) = try await session.data(from: url)
        let response = try JSONDecoder().decode(UserResponse.self, from: data)
        let profile = UserProfile(
            userId: response.id,
            displayName: response.name,
            avatarUrl: response.avatar,
            followerCount: response.followers
        )
        cache.set(userId, profile)
        return profile
    }
}
```

### Kotlin

```kotlin
// ── DOMAIN LAYER ──────────────────────────────────────────────
// No Android SDK, no Retrofit, no Room

data class UserProfile(
    val userId: String,
    val displayName: String,
    val avatarUrl: String,
    val followerCount: Int
)

interface UserProfileRepository {
    suspend fun getProfile(userId: String): UserProfile
}

class GetUserProfileUseCase(private val repository: UserProfileRepository) {
    suspend fun execute(userId: String): UserProfile {
        require(userId.isNotBlank()) { "userId must not be empty" }
        return repository.getProfile(userId)
    }
}


// ── PRESENTATION LAYER ─────────────────────────────────────────
// Knows Domain; knows nothing about how data is fetched

data class ProfileUiState(
    val displayName: String = "",
    val followerLabel: String = "",
    val avatarUrl: String = "",
    val isLoading: Boolean = false,
    val error: String? = null
)

class ProfileViewModel(private val getUserProfile: GetUserProfileUseCase) : ViewModel() {
    private val _state = MutableStateFlow(ProfileUiState())
    val state: StateFlow<ProfileUiState> = _state.asStateFlow()

    fun load(userId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            runCatching { getUserProfile.execute(userId) }
                .onSuccess { profile ->
                    _state.update {
                        ProfileUiState(
                            displayName = profile.displayName,
                            followerLabel = "${profile.followerCount} followers",
                            avatarUrl = profile.avatarUrl
                        )
                    }
                }
                .onFailure { _state.update { ProfileUiState(error = it.message) } }
        }
    }
}


// ── DATA LAYER ────────────────────────────────────────────────
// Implements Domain interfaces; knows about Retrofit, Room, cache

class RemoteUserProfileRepository(
    private val apiService: ApiService,
    private val cache: ProfileCache
) : UserProfileRepository {

    override suspend fun getProfile(userId: String): UserProfile {
        cache.get(userId)?.let { return it }
        val response = apiService.getUser(userId)
        return UserProfile(
            userId = response.id,
            displayName = response.name,
            avatarUrl = response.avatar,
            followerCount = response.followers
        ).also { cache.set(userId, it) }
    }
}
```

### Flutter (Dart)

```dart
// ── DOMAIN LAYER ──────────────────────────────────────────────
// No Flutter imports, no http, no sqflite

class UserProfile {
  final String userId;
  final String displayName;
  final String avatarUrl;
  final int followerCount;

  const UserProfile({
    required this.userId,
    required this.displayName,
    required this.avatarUrl,
    required this.followerCount,
  });
}

abstract class UserProfileRepository {
  Future<UserProfile> getProfile(String userId);
}

class GetUserProfileUseCase {
  final UserProfileRepository repository;
  GetUserProfileUseCase({required this.repository});

  Future<UserProfile> execute(String userId) {
    if (userId.isEmpty) throw ArgumentError('userId must not be empty');
    return repository.getProfile(userId);
  }
}


// ── PRESENTATION LAYER ─────────────────────────────────────────
// Knows Domain; knows nothing about how data is fetched

class ProfileUiState {
  final String displayName;
  final String followerLabel;
  final String avatarUrl;
  final bool isLoading;
  final String? error;

  const ProfileUiState({
    this.displayName = '',
    this.followerLabel = '',
    this.avatarUrl = '',
    this.isLoading = false,
    this.error,
  });
}

class ProfileViewModel extends ChangeNotifier {
  final GetUserProfileUseCase useCase;
  ProfileUiState state = const ProfileUiState();

  ProfileViewModel({required this.useCase});

  Future<void> load(String userId) async {
    state = const ProfileUiState(isLoading: true);
    notifyListeners();
    try {
      final profile = await useCase.execute(userId);
      state = ProfileUiState(
        displayName: profile.displayName,
        followerLabel: '${profile.followerCount} followers',
        avatarUrl: profile.avatarUrl,
      );
    } catch (e) {
      state = ProfileUiState(error: e.toString());
    }
    notifyListeners();
  }
}


// ── DATA LAYER ────────────────────────────────────────────────
// Implements Domain interfaces; knows about http, local storage

class RemoteUserProfileRepository implements UserProfileRepository {
  final HttpClient httpClient;
  final ProfileCache cache;

  RemoteUserProfileRepository({required this.httpClient, required this.cache});

  @override
  Future<UserProfile> getProfile(String userId) async {
    final cached = cache.get(userId);
    if (cached != null) return cached;
    final response = await httpClient.get('/v1/users/$userId');
    final profile = UserProfile(
      userId: response['id'],
      displayName: response['name'],
      avatarUrl: response['avatar'],
      followerCount: response['followers'],
    );
    cache.set(userId, profile);
    return profile;
  }
}
```

### Testing the Use Case with an in-memory repository

The Domain layer is tested with zero platform setup — no HTTP mock, no Android instrumentation, no Flutter widget tree.

**Swift**

```swift
class InMemoryUserProfileRepository: UserProfileRepository {
    private let profiles: [String: UserProfile]
    init(profiles: [String: UserProfile]) { self.profiles = profiles }

    func getProfile(userId: String) async throws -> UserProfile {
        guard let profile = profiles[userId] else { throw ProfileError.notFound }
        return profile
    }
}

func testUseCaseReturnsProfile() async throws {
    let profile = UserProfile(userId: "u1", displayName: "Alice", avatarUrl: "https://example.com/alice.png", followerCount: 120)
    let repo = InMemoryUserProfileRepository(profiles: ["u1": profile])
    let useCase = GetUserProfileUseCase(repository: repo)

    let result = try await useCase.execute(userId: "u1")

    XCTAssertEqual(result.displayName, "Alice")
    XCTAssertEqual(result.followerCount, 120)
}

func testUseCaseThrowsOnEmptyId() async {
    let useCase = GetUserProfileUseCase(repository: InMemoryUserProfileRepository(profiles: [:]))

    do {
        _ = try await useCase.execute(userId: "")
        XCTFail("Expected error")
    } catch ProfileError.emptyUserId { }
}
```

**Kotlin**

```kotlin
class InMemoryUserProfileRepository(
    private val profiles: Map<String, UserProfile>
) : UserProfileRepository {
    override suspend fun getProfile(userId: String): UserProfile =
        profiles[userId] ?: throw NoSuchElementException("Profile not found")
}

@Test
fun `use case returns profile`() = runTest {
    val profile = UserProfile("u1", "Alice", "https://example.com/alice.png", 120)
    val repo = InMemoryUserProfileRepository(mapOf("u1" to profile))
    val useCase = GetUserProfileUseCase(repo)

    val result = useCase.execute("u1")

    assertEquals("Alice", result.displayName)
    assertEquals(120, result.followerCount)
}

@Test
fun `use case throws on empty id`() = runTest {
    val useCase = GetUserProfileUseCase(InMemoryUserProfileRepository(emptyMap()))

    assertFailsWith<IllegalArgumentException> { useCase.execute("") }
}
```

**Flutter**

```dart
class InMemoryUserProfileRepository implements UserProfileRepository {
  final Map<String, UserProfile> profiles;
  InMemoryUserProfileRepository(this.profiles);

  @override
  Future<UserProfile> getProfile(String userId) async {
    final profile = profiles[userId];
    if (profile == null) throw Exception('Profile not found');
    return profile;
  }
}

void main() {
  test('use case returns profile', () async {
    final profile = UserProfile(userId: 'u1', displayName: 'Alice', avatarUrl: 'https://example.com/alice.png', followerCount: 120);
    final repo = InMemoryUserProfileRepository({'u1': profile});
    final useCase = GetUserProfileUseCase(repository: repo);

    final result = await useCase.execute('u1');

    expect(result.displayName, 'Alice');
    expect(result.followerCount, 120);
  });

  test('use case throws on empty id', () {
    final useCase = GetUserProfileUseCase(repository: InMemoryUserProfileRepository({}));

    expect(() => useCase.execute(''), throwsArgumentError);
  });
}
```

---

## Relationship with other patterns

Clean Architecture defines **layers and their boundaries**. It does not specify how the Presentation layer is internally organized. MVVM and MVI are presentation-layer patterns — they slot inside the Presentation layer:

```
Presentation layer
└── ProfileViewModel  (MVVM)   or
└── ProfileStore      (MVI)
        └── calls GetUserProfileUseCase  (Domain)
                └── calls UserProfileRepository interface  (Domain)
                        └── implemented by RemoteUserProfileRepository  (Data)
```

[VIPER](viper.md) maps closely to Clean Architecture: the Interactor is the Use Case layer, the Entity maps directly, and the Router lives at the boundary between modules.

---

## When to use

- Apps with real business logic that must survive UI framework migrations (UIKit → SwiftUI, XML Views → Compose).
- Multiple data sources (remote API + local cache + offline mode) that must be coordinated transparently.
- Teams that need to test business rules without a device or emulator.
- Apps expected to grow over multiple years and engineering teams.

## When NOT to use

- Simple display apps (news reader, settings screen) where the "business logic" is just one API call.
- Prototypes — the layer structure adds overhead at the start when requirements change constantly.
- Very small teams where the cost of maintaining interfaces across layers outweighs the benefit.

---

## References

- Martin, Robert C. *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.
- Martin, Robert C. [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html). blog.cleancoder.com, 2012.
- Google. [Recommended App Architecture](https://developer.android.com/topic/architecture). Android Developers Documentation.
- Khanlou, Soroush. [8 Patterns to Help You Destroy Massive View Controllers](https://khanlou.com/2014/09/8-patterns-to-help-you-destroy-massive-view-controller/). khanlou.com.
