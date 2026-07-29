---
type: concept
tags:
  - language
  - angular
  - typescript
  - async
related:
  - languages/angular/rxjs-and-observables
  - languages/angular/dependency-injection
  - languages/angular/state-management
  - software-engineering/architecture/frontend/data-fetching-and-bff
language: "angular"
---

# HTTP and Data Fetching

> Angular's `HttpClient` for talking to servers — making requests, handling responses, and shaping cross-cutting concerns with interceptors.

---

## What is it?

**`HttpClient`** is Angular's first-party service for making HTTP requests. It returns [Observables](rxjs-and-observables.md), integrates with dependency injection, and supports **interceptors** — middleware that runs on every request/response for concerns like authentication, logging, and error handling. It is enabled once with `provideHttpClient()`.

---

## Why does it matter?

Almost every app talks to a backend. `HttpClient` gives you typed responses, automatic JSON parsing, cancellation (via Observable unsubscription), and a clean place to centralize cross-cutting request logic through interceptors — so you attach an auth token or handle 401s in **one** place rather than at every call site. Pairing it with [signals](signals-and-change-detection.md) via `toSignal` gives ergonomic, declarative data loading.

---

## How it works

### Enabling and injecting

```typescript
// app.config.ts
provideHttpClient(withInterceptors([authInterceptor]));
```

```typescript
// a data service
@Injectable({ providedIn: 'root' })
export class UserApi {
  private http = inject(HttpClient);

  getUser(id: string) {
    return this.http.get<User>(`/api/users/${id}`); // typed Observable<User>
  }

  createUser(body: NewUser) {
    return this.http.post<User>('/api/users', body);
  }
}
```

The generic (`get<User>`) types the response; Angular parses JSON automatically.

### Consuming the data

Three idioms, from most to least declarative:

```typescript
// 1) as a signal (great for templates)
readonly user = toSignal(this.api.getUser(this.id()));

// 2) with the async pipe
readonly user$ = this.api.getUser(this.id());
// template: @if (user$ | async; as user) { {{ user.name }} }

// 3) manual subscribe (side effects only; unsubscribe!)
this.api.getUser(id).pipe(takeUntilDestroyed()).subscribe(...);
```

### Interceptors

A functional interceptor is a plain function that transforms the request or response:

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;
  return next(authed);
};
```

Interceptors chain in order and can handle errors globally:

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err) => {
      if (err.status === 401) inject(Router).navigate(['/login']);
      return throwError(() => err);
    }),
  );
```

### Query params, headers, and error handling

```typescript
this.http.get<Page<Item>>('/api/items', {
  params: { page: '2', size: '20' },
  headers: { 'X-Trace': traceId },
}).pipe(
  retry(2),
  catchError((err) => of(EMPTY_PAGE)), // graceful fallback
);
```

---

## Examples

A resource loaded reactively when an id signal changes:

```typescript
import { Component, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-user',
  standalone: true,
  template: `
    @if (user(); as u) { <h2>{{ u.name }}</h2> } @else { <p>Loading…</p> }
  `,
})
export class UserComponent {
  readonly id = input.required<string>();

  readonly user = toSignal(
    toObservable(this.id).pipe(switchMap((id) => this.api.getUser(id))),
  );

  constructor(private api: UserApi) {}
}
```

---

## When to use

- All server communication — use `HttpClient` rather than raw `fetch` to get DI, typing, and interceptors.
- Interceptors for anything cross-cutting: auth headers, correlation IDs, global error handling, retry policies.
- `toSignal` for read-heavy data you display directly; the `async` pipe when you prefer template-driven subscription.

## When NOT to use

- Don't scatter auth or error handling across call sites — centralize in interceptors.
- Don't manually subscribe without cleanup — leaks; prefer `async` pipe or `takeUntilDestroyed()`.
- For rich server-state caching (dedup, background refetch, invalidation), consider a dedicated library (e.g. TanStack Query for Angular) rather than reinventing it. See [data fetching & BFF](../../software-engineering/architecture/frontend/data-fetching-and-bff.md).

## References

- Angular Team. [Understanding communicating with backend services using HTTP](https://angular.dev/guide/http). angular.dev.
- Angular Team. [Interceptors](https://angular.dev/guide/http/interceptors). angular.dev.
- Angular Team. [Making HTTP requests](https://angular.dev/guide/http/making-requests). angular.dev.
