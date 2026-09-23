---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
  - dependency-injection
related:
  - languages/react-native/architecture
  - languages/react-native/testing
  - languages/react-native/best-practices
  - languages/react-native/new-architecture-and-native-modules
  - software-engineering/concepts/solid/dependency-inversion
  - languages/flutter/dependency-injection
language: "react-native"
---
# Dependency Injection

> Modules that create their own dependencies cannot be tested or replaced. Passing them in — through a parameter, a factory, or a Context — is all dependency injection means here.

---

## What is it?

Dependency injection is supplying a module's collaborators from outside instead of letting it construct them. In React Native there is no DI container and no annotations: the mechanisms are function parameters, factory functions, and React Context.

The goal is the Dependency Inversion Principle — high-level code depends on an interface, not on a concrete implementation.

---

## Why does it matter?

Consider a hook that imports a repository directly:

```ts
import { postRepository } from "../api/postRepository";

export function usePosts() {
  return useQuery({ queryKey: ["posts"], queryFn: postRepository.list });
}
```

Testing this means intercepting the module system with `jest.mock`, which couples the test to the import graph rather than to behaviour. Reusing the hook against a different source is impossible. Swapping the HTTP client means editing the repository.

None of that is fatal — plenty of apps ship this way. But the cost compounds, and the fix is small.

---

## How it works

### Depend on an interface

State what you need, not what provides it:

```ts
// src/features/posts/model/ports.ts
import type { Post } from "./post";

export interface PostRepository {
  list(): Promise<Post[]>;
  getById(id: string): Promise<Post>;
  create(input: { title: string; body: string }): Promise<Post>;
}
```

This interface lives in the **domain** layer, and the HTTP implementation in the **data** layer implements it. The arrow points inward: data depends on domain, never the reverse. That inversion is the whole point.

```ts
// src/features/posts/api/httpPostRepository.ts
import type { PostRepository } from "../model/ports";
import { request } from "@/shared/lib/http";

export const httpPostRepository: PostRepository = {
  list: () => request("/posts"),
  getById: (id) => request(`/posts/${id}`),
  create: (input) => request("/posts", { method: "POST", body: JSON.stringify(input) }),
};
```

### Three mechanisms

**Parameter injection** — the simplest, and correct for pure functions and plain modules:

```ts
export function makePostService(repository: PostRepository) {
  return {
    async publishDraft(id: string) {
      const post = await repository.getById(id);
      if (!post.body.trim()) throw new Error("Cannot publish an empty post");
      return repository.create({ title: post.title, body: post.body });
    },
  };
}
```

No framework involved, testable by calling it with a fake.

**Context injection** — for dependencies that many components need and that rarely change:

```tsx
// src/shared/di/container.tsx
import { createContext, useContext, type ReactNode } from "react";
import type { PostRepository } from "@/features/posts/model/ports";
import type { BatteryReader } from "@/shared/device/battery";

export type Container = {
  posts: PostRepository;
  battery: BatteryReader;
};

const ContainerContext = createContext<Container | null>(null);

export function ContainerProvider({
  value,
  children,
}: {
  value: Container;
  children: ReactNode;
}) {
  return <ContainerContext.Provider value={value}>{children}</ContainerContext.Provider>;
}

export function useContainer(): Container {
  const container = useContext(ContainerContext);
  if (!container) throw new Error("useContainer must be used inside ContainerProvider");
  return container;
}
```

Throwing when the provider is missing turns a configuration mistake into an immediate, clear error instead of a confusing `undefined` later.

Context is a good fit here precisely because the container is a **stable reference** — it is created once and never changes, so the usual Context re-render problem does not apply. That is the opposite of what makes Context a poor choice for frequently-changing state.

**Factory injection** — when the dependency is chosen at runtime:

```ts
export function makeStorage(kind: "secure" | "fast"): Storage {
  return kind === "secure" ? secureStorage : mmkvStorage;
}
```

### Wiring it once

```tsx
// app/_layout.tsx
import { ContainerProvider, type Container } from "@/shared/di/container";
import { httpPostRepository } from "@/features/posts/api/httpPostRepository";
import { nativeBattery } from "@/shared/device/battery";

const container: Container = {
  posts: httpPostRepository,
  battery: nativeBattery,
};

export default function RootLayout() {
  return (
    <ContainerProvider value={container}>
      <Stack />
    </ContainerProvider>
  );
}
```

The container is built at the composition root — the one place that knows about concrete implementations. Everything below it depends only on interfaces.

### Using it

```ts
export function usePosts() {
  const { posts } = useContainer();
  return useQuery({ queryKey: ["posts"], queryFn: () => posts.list() });
}
```

The hook now states its dependency explicitly, and a test can supply a different one without touching the module system.

---

## Examples

The payoff is in the tests. A fake repository, written once:

```ts
// src/features/posts/test/fakePostRepository.ts
import type { PostRepository } from "../model/ports";
import type { Post } from "../model/post";

export function fakePostRepository(initial: Post[] = []): PostRepository {
  let posts = [...initial];

  return {
    list: async () => posts,
    getById: async (id) => {
      const found = posts.find((p) => p.id === id);
      if (!found) throw new Error(`No post ${id}`);
      return found;
    },
    create: async (input) => {
      const post = { id: String(posts.length + 1), ...input };
      posts = [...posts, post];
      return post;
    },
  };
}
```

Testing the service with no React and no network:

```ts
import { makePostService } from "../model/postService";
import { fakePostRepository } from "../test/fakePostRepository";

it("refuses to publish an empty post", async () => {
  const repo = fakePostRepository([{ id: "1", title: "Draft", body: "   " }]);
  const service = makePostService(repo);

  await expect(service.publishDraft("1")).rejects.toThrow("Cannot publish an empty post");
});
```

Testing a hook by swapping the container:

```tsx
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContainerProvider } from "@/shared/di/container";
import { fakePostRepository } from "../test/fakePostRepository";
import { usePosts } from "./usePosts";

it("returns posts from the repository", async () => {
  const container = {
    posts: fakePostRepository([{ id: "1", title: "Hello", body: "…" }]),
    battery: { level: () => 1, charging: async () => false },
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      <ContainerProvider value={container}>{children}</ContainerProvider>
    </QueryClientProvider>
  );

  const { result } = renderHook(() => usePosts(), { wrapper });

  await waitFor(() => expect(result.current.data).toHaveLength(1));
});
```

No `jest.mock`, no module-path strings, no reset between tests. The test provides a dependency the same way the app does — which also means the test exercises the real wiring.

---

## When to use

- **Parameter injection** for pure functions and services. It costs nothing and needs no framework.
- **A Context container** for dependencies used across many screens — repositories, the HTTP client, device adapters.
- **Interfaces in the domain layer**, implementations in the data layer, so the dependency arrow points inward.
- **Fakes over mocks**: a small hand-written implementation of the interface is clearer and more durable than a mocking framework's stubs.
- **A single composition root** — the root layout — where concrete implementations are chosen.

## When NOT to use

- Do not build a container for a three-screen app. Importing the module directly is fine until a test hurts.
- Do not inject things that will never vary. A date formatter or a pure utility needs no indirection.
- Do not put changing state in the DI container. It is for stable collaborators; state belongs in a store — see [State Management](state-management.md).
- Do not create an interface with exactly one implementation and no test double. That is indirection without inversion.
- Do not reach for a DI library. Context plus factory functions covers what React Native apps need, without decorators or reflection.

---

## References

- [Dependency Inversion Principle](../../software-engineering/concepts/solid/dependency-inversion.md)
- [Passing Data Deeply with Context — React](https://react.dev/learn/passing-data-deeply-with-context)
- [Scaling Up with Reducer and Context — React](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [Testing Library — React Native](https://callstack.github.io/react-native-testing-library/)
