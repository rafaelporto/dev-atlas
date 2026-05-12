# Modular Architecture (Mobile)

> Split the app into independently compilable modules — one per feature or concern — so that teams work in parallel, builds stay fast, and ownership is explicit.

Adopted at scale by companies like Spotify, Airbnb, and Uber as their mobile apps grew beyond what a single-module codebase could sustain.

---

## What is it?

A modular architecture replaces a single app module with a graph of smaller modules, each with a clearly bounded responsibility:

- **`:app`** — the entry point. Wires modules together; contains almost no logic.
- **`:feature:*`** — one module per vertical feature (e.g., `:feature:checkout`, `:feature:profile`). Features do not depend on each other.
- **`:core:*`** — shared horizontal concerns (`:core:network`, `:core:analytics`, `:core:auth`). Features depend on core modules, never the other way.
- **`:shared-ui`** (or `:design-system`) — common UI components, themes, and typography. Depended on by feature modules.

```
              ┌──────────┐
              │   :app   │
              └────┬─────┘
         ┌─────────┼──────────┐
         ▼         ▼          ▼
  ┌──────────┐ ┌────────┐ ┌────────────┐
  │:feature: │ │:feature│ │  :feature: │
  │ checkout │ │:profile│ │    feed    │
  └────┬─────┘ └───┬────┘ └──────┬─────┘
       │            │             │
       └────────────┼─────────────┘
                    ▼
         ┌──────────────────────┐
         │   :core:network      │
         │   :core:analytics    │
         │   :core:auth         │
         │   :shared-ui         │
         └──────────────────────┘
```

**Key rule:** features never depend on other features. Cross-feature communication happens through the `:app` module or a dedicated `:core:navigation` abstraction.

---

## Why does it matter?

In a single-module app, the compiler builds everything every time any file changes. At 200k lines of code, a clean build takes minutes. With modular architecture, changing a file in `:feature:checkout` only rebuilds that module and `:app` — everything else is cached.

Beyond build performance, modules enforce ownership. When `:feature:profile` is a hard boundary, the team that owns it controls its public API. No other team can accidentally call internal functions or introduce a hidden dependency.

---

## How it works

### Module types and their rules

| Module type | Depends on | Can be depended on by |
|---|---|---|
| `:app` | all modules | nothing |
| `:feature:*` | `:core:*`, `:shared-ui` | `:app` only |
| `:core:*` | other `:core:*` | `:feature:*`, `:app` |
| `:shared-ui` | `:core:design-tokens` | `:feature:*`, `:app` |

### Public API boundaries

Each module exposes only what is explicitly declared public. Internal classes stay internal to the module. This is enforced by the module system (Gradle's `internal` visibility in Kotlin, Swift Package Manager access control).

### Cross-feature navigation

Features never import each other. Navigation between features is declared in `:app` or a `:core:navigation` module that defines routes as data:

**Swift (Swift Package Manager)**

```swift
// In CoreNavigation package — a shared contract, no feature dependency
protocol Route {}

struct ProfileRoute: Route { let userId: String }
struct CheckoutRoute: Route { let cartId: String }

// In :app — wires routes to actual screens
class AppRouter {
    private let navigationController: UINavigationController

    func navigate(to route: Route) {
        switch route {
        case let r as ProfileRoute:
            navigationController.pushViewController(ProfileViewController(userId: r.userId), animated: true)
        case let r as CheckoutRoute:
            navigationController.pushViewController(CheckoutViewController(cartId: r.cartId), animated: true)
        default: break
        }
    }
}
```

**Kotlin (Android)**

```kotlin
// In :core:navigation — a shared contract, no feature dependency
sealed interface Route
data class ProfileRoute(val userId: String) : Route
data class CheckoutRoute(val cartId: String) : Route

// In :app — wires routes to actual screens
class AppRouter(private val navController: NavController) {
    fun navigate(route: Route) {
        when (route) {
            is ProfileRoute -> navController.navigate("profile/${route.userId}")
            is CheckoutRoute -> navController.navigate("checkout/${route.cartId}")
        }
    }
}
```

**Flutter (Dart)**

```dart
// In a shared navigation package — a shared contract, no feature dependency
sealed class AppRoute {}
class ProfileRoute extends AppRoute { final String userId; ProfileRoute(this.userId); }
class CheckoutRoute extends AppRoute { final String cartId; CheckoutRoute(this.cartId); }

// In app — wires routes to actual screens
class AppRouter {
  final NavigatorState navigator;
  AppRouter({required this.navigator});

  void navigate(AppRoute route) {
    if (route is ProfileRoute) {
      navigator.push(MaterialPageRoute(builder: (_) => ProfileScreen(userId: route.userId)));
    } else if (route is CheckoutRoute) {
      navigator.push(MaterialPageRoute(builder: (_) => CheckoutScreen(cartId: route.cartId)));
    }
  }
}
```

`:feature:feed` can trigger `ProfileRoute(userId: uid)` without importing `:feature:profile`.

---

## Examples

### Module structure (Android multi-module project)

```
my-app/
├── app/
│   ├── build.gradle.kts
│   └── src/main/kotlin/com/example/app/
│       └── AppRouter.kt
├── feature/
│   ├── checkout/
│   │   ├── build.gradle.kts
│   │   └── src/main/kotlin/com/example/feature/checkout/
│   │       ├── CheckoutScreen.kt          (public)
│   │       ├── CheckoutViewModel.kt       (internal)
│   │       └── CheckoutRepository.kt      (internal)
│   └── profile/
│       ├── build.gradle.kts
│       └── src/main/kotlin/com/example/feature/profile/
│           ├── ProfileScreen.kt           (public)
│           └── ProfileViewModel.kt        (internal)
└── core/
    ├── network/
    │   └── src/main/kotlin/com/example/core/network/
    │       └── HttpClient.kt
    └── analytics/
        └── src/main/kotlin/com/example/core/analytics/
            └── AnalyticsTracker.kt
```

### Dependency declaration

**Android (Gradle Kotlin DSL)**

```kotlin
// feature/checkout/build.gradle.kts
dependencies {
    implementation(project(":core:network"))
    implementation(project(":core:analytics"))
    implementation(project(":shared-ui"))
    // NOT project(":feature:profile") — features never depend on features
}

// app/build.gradle.kts
dependencies {
    implementation(project(":feature:checkout"))
    implementation(project(":feature:profile"))
    implementation(project(":feature:feed"))
    implementation(project(":core:navigation"))
}
```

**iOS (Package.swift)**

```swift
// Package.swift for FeatureCheckout
.target(
    name: "FeatureCheckout",
    dependencies: [
        .product(name: "CoreNetwork", package: "CorePackage"),
        .product(name: "CoreAnalytics", package: "CorePackage"),
        .product(name: "SharedUI", package: "SharedUI"),
        // NOT "FeatureProfile" — features never depend on features
    ]
)
```

**Flutter (pubspec.yaml)**

```yaml
# feature_checkout/pubspec.yaml
dependencies:
  core_network:
    path: ../../core/network
  core_analytics:
    path: ../../core/analytics
  shared_ui:
    path: ../../shared/ui
  # NOT feature_profile — features never depend on features
```

### Detecting illegal dependencies

A dependency check run in CI prevents regressions.

**Swift**

```swift
struct ModuleDependencyRule {
    static let forbidden: Set<[String]> = [
        [":feature:checkout", ":feature:profile"],
        [":feature:profile", ":feature:feed"],
        [":core:network", ":feature:checkout"],
    ]

    func validate(dependencyGraph: [String: [String]]) -> [String] {
        var violations: [String] = []
        for (source, targets) in dependencyGraph {
            for target in targets where Self.forbidden.contains([source, target]) {
                violations.append("\(source) → \(target) is not allowed")
            }
        }
        return violations
    }
}
```

**Kotlin**

```kotlin
object ModuleDependencyRule {
    private val forbidden = setOf(
        ":feature:checkout" to ":feature:profile",
        ":feature:profile" to ":feature:feed",
        ":core:network" to ":feature:checkout"
    )

    fun validate(dependencyGraph: Map<String, List<String>>): List<String> =
        dependencyGraph.flatMap { (source, targets) ->
            targets
                .filter { (source to it) in forbidden }
                .map { "$source → $it is not allowed" }
        }
}
```

**Flutter (Dart)**

```dart
class ModuleDependencyRule {
  static const _forbidden = {
    (':feature:checkout', ':feature:profile'),
    (':feature:profile', ':feature:feed'),
    (':core:network', ':feature:checkout'),
  };

  List<String> validate(Map<String, List<String>> dependencyGraph) {
    final violations = <String>[];
    for (final entry in dependencyGraph.entries) {
      for (final target in entry.value) {
        if (_forbidden.contains((entry.key, target))) {
          violations.add('${entry.key} → $target is not allowed');
        }
      }
    }
    return violations;
  }
}
```

---

## When to use

- Apps with more than one team — module boundaries make ownership explicit and prevent accidental cross-team coupling.
- Projects where build time has become a bottleneck — modular builds enable incremental compilation and build caching.
- Apps that ship features independently (dynamic feature delivery on Android, on-demand resources on iOS).
- Large codebases where a "you can change anything" culture has led to tangled dependencies.

## When NOT to use

- Small apps with one team — the configuration overhead of multi-module projects (build scripts, dependency graphs, API surface decisions) is not worth it until the team or codebase grows.
- Early-stage projects — module boundaries are hard to define before the domain is understood. Premature modularization creates wrong boundaries that are expensive to undo.
- Projects where the team lacks experience with the module system — dependency cycles and visibility misconfigurations create more problems than they solve if introduced without a clear plan.

---

## References

- NowInAndroid (Google). [Architecture: Modularization](https://github.com/android/nowinandroid/blob/main/docs/ModularizationLearningJourney.md). github.com/android/nowinandroid.
- Spotify Engineering. [Modular Architecture on iOS](https://engineering.atspotify.com/2023/09/modular-architecture-on-ios/). engineering.atspotify.com, 2023.
- Apple. [Organizing Your Code with Local Packages](https://developer.apple.com/documentation/xcode/organizing-your-code-with-local-packages). Apple Developer Documentation.
- Iyer, Aditya. [Scaling Android at Airbnb](https://medium.com/airbnb-engineering/developing-faster-with-swift-packages-at-airbnb-2a4cfc56afc7). medium.com/airbnb-engineering.
