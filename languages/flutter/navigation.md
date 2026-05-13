# Navigation in Flutter

> Flutter's Navigator manages a stack of routes; GoRouter builds on top of it to add URL-based routing, deep links, and declarative route definitions.

---

## What is it?

**Navigation** in Flutter means moving between screens (routes). Flutter ships with a built-in `Navigator` widget that manages a stack of `Route` objects. For most apps, using **GoRouter** — Flutter's recommended routing package — is preferable to the raw Navigator API because it adds URL synchronisation, deep link support, nested navigation, and type-safe route parameters.

---

## Why does it matter?

Navigation is central to every multi-screen app. Getting it wrong leads to broken back-stack behaviour, broken deep links, and hard-to-maintain routing logic scattered across the widget tree. A consistent routing strategy makes navigation predictable, testable, and easy to extend.

---

## How it works

### Imperative navigation (Navigator API)

The `Navigator` manages a stack. Push to go forward; pop to go back:

```dart
// Push a named route
Navigator.of(context).push(
  MaterialPageRoute(builder: (_) => const ProfileScreen()),
);

// Push and wait for a result
final confirmed = await Navigator.of(context).push<bool>(
  MaterialPageRoute(builder: (_) => const ConfirmationScreen()),
);

// Pop with a result
Navigator.of(context).pop(true);

// Replace the current route
Navigator.of(context).pushReplacement(
  MaterialPageRoute(builder: (_) => const HomeScreen()),
);

// Pop all routes and push a new one (e.g., after login)
Navigator.of(context).pushAndRemoveUntil(
  MaterialPageRoute(builder: (_) => const HomeScreen()),
  (route) => false,
);
```

### GoRouter (recommended)

GoRouter provides a URL-based, declarative routing system. Routes are defined once; navigation happens by pushing a path or a typed route.

**Setup:**

```dart
final router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/profile/:userId',
      builder: (context, state) {
        final userId = state.pathParameters['userId']!;
        return ProfileScreen(userId: userId);
      },
    ),
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
      routes: [
        GoRoute(
          path: 'notifications',
          builder: (context, state) => const NotificationsScreen(),
        ),
      ],
    ),
  ],
);

void main() {
  runApp(MaterialApp.router(routerConfig: router));
}
```

**Navigating:**

```dart
// Go to a path (replaces the current location in the URL sense)
context.go('/profile/42');

// Push (adds to the back stack)
context.push('/settings');

// Go back
context.pop();

// Pass extra data (not reflected in the URL)
context.push('/confirmation', extra: order);
```

**Route guards (redirect):**

```dart
final router = GoRouter(
  redirect: (context, state) {
    final isLoggedIn = authService.isAuthenticated;
    final isLoginRoute = state.matchedLocation == '/login';

    if (!isLoggedIn && !isLoginRoute) return '/login';
    if (isLoggedIn && isLoginRoute) return '/';
    return null; // no redirect
  },
  routes: [...],
);
```

### Deep links

GoRouter handles deep links automatically when the host platform is configured:

- **Android**: add `<intent-filter>` entries in `AndroidManifest.xml`.
- **iOS**: configure `Associated Domains` in Xcode and `apple-app-site-association` on your server.

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW"/>
  <category android:name="android.intent.category.DEFAULT"/>
  <category android:name="android.intent.category.BROWSABLE"/>
  <data android:scheme="https" android:host="example.com"/>
</intent-filter>
```

### Bottom navigation + ShellRoute

For apps with a persistent bottom navigation bar, `ShellRoute` preserves the navigation stack of each tab:

```dart
GoRoute(
  path: '/',
  builder: (context, state) => const ScaffoldWithNavBar(child: HomeScreen()),
)

// ShellRoute wraps child routes inside a persistent shell widget
ShellRoute(
  builder: (context, state, child) => ScaffoldWithNavBar(child: child),
  routes: [
    GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/search', builder: (_, __) => const SearchScreen()),
    GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
  ],
)
```

---

## When to use

- Use GoRouter for any multi-screen app — it handles deep links, web URLs, and nested navigation out of the box.
- Use `context.go` when the destination replaces the current logical location (tab switches, post-login redirects).
- Use `context.push` when the user expects to be able to go back (detail screens, modals).
- Use `redirect` in GoRouter for authentication guards and permission checks.

---

## When NOT to use

- Do not use raw `Navigator.push` with anonymous routes in apps that require deep linking — they have no URL representation.
- Do not store the `BuildContext` to use for navigation later — it may have been disposed. Use a global router reference or a navigation service instead.
- Do not nest GoRouters — use `ShellRoute` for tab-based navigation instead.

---

## References

- [Navigation and routing — docs.flutter.dev](https://docs.flutter.dev/ui/navigation)
- [GoRouter — pub.dev](https://pub.dev/packages/go_router)
- [GoRouter documentation — pub.dev](https://pub.dev/documentation/go_router/latest/)
- [Deep linking — docs.flutter.dev](https://docs.flutter.dev/ui/navigation/deep-linking)
