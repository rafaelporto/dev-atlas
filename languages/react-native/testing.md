---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - testing
related:
  - languages/react-native/dependency-injection
  - languages/react-native/architecture
  - languages/react-native/toolchain
  - languages/react/testing
  - languages/flutter/testing
  - software-engineering/concepts/tdd
language: "react-native"
---
# Testing

> Jest runs the tests, React Native Testing Library renders components the way a user sees them, and Maestro drives the real app. Most of your coverage should come from the cheapest of the three.

---

## What is it?

Testing a React Native app happens at three levels:

| Level | Tools | Runs on |
|---|---|---|
| **Unit** | Jest | Node — milliseconds |
| **Component** | Jest + `@testing-library/react-native` | Node, with a test renderer |
| **End-to-end** | Maestro or Detox | A real simulator or device |

Expo projects use the **`jest-expo`** preset, which configures the transform and mocks the native side of the Expo SDK.

---

## Why does it matter?

Manual testing on mobile is slow: build, install, navigate to the screen, reproduce the state. Doing that for both platforms on every change is not sustainable.

There is also a structural point. The code that is hard to test is usually the code that is badly factored — a component that fetches and renders can only be tested by mocking the module system. Tests push you toward the structure described in [Application Architecture](architecture.md), and that is a large part of their value.

---

## How it works

### Setting up

```bash
npx expo install jest-expo jest @types/jest
npm install --save-dev @testing-library/react-native
```

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterEnv": ["<rootDir>/jest-setup.ts"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
    ]
  }
}
```

That `transformIgnorePatterns` line exists because React Native packages ship untranspiled ES modules. Jest skips `node_modules` by default, and without this exception you get `SyntaxError: Cannot use import statement outside a module` — the single most common setup failure.

Use **`@testing-library/react-native`**, not `react-test-renderer`, which is deprecated and does not support React 19 or later.

### The pyramid

```
           ╱╲          E2E — a handful of critical journeys
          ╱  ╲         Slow, brittle, highest confidence
         ╱────╲
        ╱      ╲       Component — screens and interactions
       ╱        ╲      Fast, no device
      ╱──────────╲
     ╱            ╲    Unit — domain rules, reducers, hooks
    ╱______________╲   Milliseconds, run on every save
```

Most value sits at the bottom. Domain rules are where bugs cost the most and tests cost the least.

### Unit tests

Pure functions need no setup at all:

```ts
import { discountFor } from "../model/pricing";

describe("discountFor", () => {
  it("gives 10% above 500", () => {
    expect(discountFor({ total: 600, items: [] })).toBe(60);
  });

  it("gives 5% for more than 10 items", () => {
    expect(discountFor({ total: 100, items: new Array(11).fill({}) })).toBe(5);
  });

  it("gives nothing otherwise", () => {
    expect(discountFor({ total: 100, items: [] })).toBe(0);
  });
});
```

Reducers are equally direct, which is one of MVI's practical advantages:

```ts
it("moves from loading to ready", () => {
  expect(reducer({ status: "loading" }, { type: "loaded", posts: [] }))
    .toEqual({ status: "ready", posts: [], query: "" });
});
```

### Component tests

Query the way a user perceives the screen — by text, by label, by role — not by test IDs:

```tsx
import { render, screen, userEvent } from "@testing-library/react-native";
import { Button } from "@/shared/ui/Button";

it("calls onPress when tapped", async () => {
  const onPress = jest.fn();
  const user = userEvent.setup();

  render(<Button title="Save" onPress={onPress} />);
  await user.press(screen.getByRole("button", { name: "Save" }));

  expect(onPress).toHaveBeenCalledTimes(1);
});
```

Query priority, most to least preferred:

1. `getByRole` with a name — closest to what assistive technology reports.
2. `getByLabelText` — the accessibility label.
3. `getByText` — visible content.
4. `getByPlaceholderText` / `getByDisplayValue` — inputs.
5. `getByTestId` — last resort, when nothing user-visible identifies the element.

A test that can only find an element by test ID is often telling you the element is not accessible.

### Testing hooks

```tsx
import { renderHook, waitFor } from "@testing-library/react-native";

it("returns posts from the repository", async () => {
  const { result } = renderHook(() => usePosts(), { wrapper });
  await waitFor(() => expect(result.current.data).toHaveLength(2));
});
```

The `wrapper` supplies the providers — `QueryClientProvider` and the DI container. See [Dependency Injection](dependency-injection.md) for the full setup, which is what lets this run without touching the network.

### Mocking native modules

Native modules do not exist in Node. `jest-expo` mocks most of the Expo SDK; anything else you mock yourself, usually once in setup:

```ts
// jest-setup.ts
import "@testing-library/react-native/extend-expect";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock("react-native-mmkv", () => {
  const store = new Map<string, string>();
  return {
    MMKV: jest.fn(() => ({
      set: (k: string, v: string) => store.set(k, v),
      getString: (k: string) => store.get(k),
      delete: (k: string) => store.delete(k),
    })),
  };
});

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);
```

Modules behind an adapter (see [React Native Patterns](react-native-patterns.md)) need no mock at all — the test supplies a different implementation. That is the better outcome, and a good reason to use adapters.

### Testing routes

Expo Router ships its own utilities, which render the real router against an in-memory file tree:

```tsx
import { renderRouter, screen } from "expo-router/testing-library";

it("navigates to the post screen", async () => {
  renderRouter({
    index: () => <FeedScreen />,
    "posts/[id]": () => <PostScreen />,
  });

  await userEvent.press(screen.getByText("First post"));
  expect(screen).toHavePathname("/posts/1");
});
```

### End-to-end

Maestro drives the installed app with declarative YAML:

```yaml
appId: com.acme.myapp
---
- launchApp
- tapOn: "Sign in"
- inputText: "ada"
- tapOn:
    id: "password"
- inputText: "correct horse"
- tapOn: "Continue"
- assertVisible: "Your feed"
```

Detox is the alternative, written in JavaScript with tighter synchronisation and a heavier setup.

Keep E2E to the few journeys where failure is unacceptable — sign-in, checkout, the core action. Each one is slow and will occasionally fail for reasons unrelated to your code.

---

## Examples

A screen test that exercises loading, success, and error without a network:

```tsx
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContainerProvider, type Container } from "@/shared/di/container";
import { fakePostRepository } from "@/features/posts/test/fakePostRepository";
import FeedScreen from "@/app/(tabs)/feed";

function renderWith(container: Container) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ContainerProvider value={container}>
        <FeedScreen />
      </ContainerProvider>
    </QueryClientProvider>,
  );
}

describe("FeedScreen", () => {
  it("shows posts once loaded", async () => {
    renderWith({
      posts: fakePostRepository([{ id: "1", title: "Hello", body: "…" }]),
      battery: { level: () => 1, charging: async () => false },
    });

    expect(await screen.findByText("Hello")).toBeOnTheScreen();
  });

  it("offers a retry when loading fails", async () => {
    const failing = {
      ...fakePostRepository(),
      list: jest.fn().mockRejectedValue(new Error("offline")),
    };

    renderWith({ posts: failing, battery: { level: () => 1, charging: async () => false } });

    const retry = await screen.findByRole("button", { name: "Try again" });
    await userEvent.press(retry);

    await waitFor(() => expect(failing.list).toHaveBeenCalledTimes(2));
  });
});
```

`retry: false` on the test query client matters: without it, TanStack Query's default retries make the error test wait for several backoff delays before the error state appears.

---

## When to use

- **Unit tests for every domain rule.** Cheapest tests, highest-value code.
- **Unit tests for reducers** — a state machine is worth proving.
- **Component tests for screens** with more than one state: loading, empty, error, success.
- **`renderRouter`** for navigation behaviour, including auth redirects.
- **Fakes supplied through the DI container** rather than `jest.mock` on module paths.
- **Maestro for two or three critical journeys**, run in CI on a schedule rather than on every commit.

## When NOT to use

- Do not test implementation details — internal state, call counts on private functions, or how a component renders internally. Those tests break on refactors that change nothing for the user.
- Do not use `getByTestId` as the default query. It ties tests to markup and hides accessibility gaps.
- Do not snapshot entire screens. Large snapshots get regenerated without being read, and then assert nothing.
- Do not write E2E tests for logic a unit test covers. Seconds versus milliseconds, and far more flakiness.
- Do not use `react-test-renderer`. It is deprecated and does not support React 19+.
- Do not chase 100% coverage. Coverage of generated types and one-line components is noise.

---

## References

- [Testing — React Native](https://reactnative.dev/docs/testing-overview)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Unit testing with Jest — Expo](https://docs.expo.dev/develop/unit-testing/)
- [Testing with Expo Router](https://docs.expo.dev/router/reference/testing/)
- [Mocking native calls in Expo modules](https://docs.expo.dev/modules/mocking/)
- [Maestro — documentation](https://docs.maestro.dev/)
