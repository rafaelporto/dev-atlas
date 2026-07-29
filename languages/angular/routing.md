---
type: concept
tags:
  - language
  - angular
  - typescript
  - frontend
related:
  - languages/angular/overview
  - languages/angular/project-setup
  - languages/angular/http-and-data
  - languages/react/routing
language: "angular"
---

# Routing

> Angular's first-party Router — mapping URLs to components, lazy loading, route parameters, and guarding navigation.

---

## What is it?

The **Angular Router** maps URL paths to components, renders them into a `<router-outlet>`, and manages navigation, parameters, and guards. It is a core, first-party library (`@angular/router`), enabled once via `provideRouter(routes)` and configured with a plain array of route objects.

---

## Why does it matter?

Routing is the backbone of any multi-page single-page application: it defines the app's structure, enables deep-linking and the back button, and is where **lazy loading** happens — splitting the app so users download only the code for the page they visit. Because the router is first-party, it integrates directly with DI (guards, resolvers) and the rest of the framework, rather than being a separate ecosystem choice.

---

## How it works

### Defining routes

Routes are an array mapping paths to components. Lazy routes use a dynamic `import()` so their code is a separate bundle:

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'users/:id', component: UserComponent },       // route parameter
  {
    path: 'admin',
    canActivate: [authGuard],                            // guard
    loadComponent: () => import('./admin/admin.component') // lazy standalone
      .then((m) => m.AdminComponent),
  },
  { path: '**', component: NotFoundComponent },          // wildcard (404)
];
```

### Rendering and linking

The matched component renders into an outlet; links use `routerLink` (not raw `href`) so navigation stays client-side:

```html
<nav>
  <a routerLink="/" routerLinkActive="active">Home</a>
  <a [routerLink]="['/users', user.id]">Profile</a>
</nav>
<router-outlet />
```

### Reading route parameters

With signal-based inputs enabled (`withComponentInputBinding()`), route params bind straight into component inputs:

```typescript
provideRouter(routes, withComponentInputBinding()); // in app.config.ts

@Component({ /* route: users/:id */ })
export class UserComponent {
  readonly id = input.required<string>(); // bound from the :id segment
}
```

Or read them reactively via `ActivatedRoute` for the RxJS style:

```typescript
private route = inject(ActivatedRoute);
readonly id$ = this.route.paramMap.pipe(map((p) => p.get('id')));
```

### Guards and resolvers

- **Guards** (`canActivate`, `canDeactivate`, `canMatch`) decide whether navigation may proceed — auth checks, unsaved-changes prompts. They are plain functions using `inject()`:

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};
```

- **Resolvers** pre-fetch data before the route activates, so the component renders with data already present.

---

## Examples

A feature area with a parent layout and lazily-loaded children:

```typescript
export const routes: Routes = [
  {
    path: 'shop',
    component: ShopLayoutComponent,   // renders its own <router-outlet>
    children: [
      { path: '', redirectTo: 'catalog', pathMatch: 'full' },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./shop/catalog.component').then((m) => m.CatalogComponent),
      },
      {
        path: 'cart',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./shop/cart.component').then((m) => m.CartComponent),
      },
    ],
  },
];
```

---

## When to use

- Any application with more than one screen — the router defines structure and enables deep-linking.
- Use `loadComponent`/`loadChildren` to lazy-load feature areas and keep the initial bundle small.
- Use guards for auth and unsaved-changes checks; resolvers when a route must have data before rendering.

## When NOT to use

- A single-screen widget embedded in another page doesn't need the router.
- Don't fetch all route data in resolvers if it delays first paint — sometimes rendering a skeleton and loading in the component is better UX.
- Avoid deeply nested guard logic in components; put access rules in guards where they belong.

## References

- Angular Team. [Angular Router](https://angular.dev/guide/routing). angular.dev.
- Angular Team. [Common routing tasks](https://angular.dev/guide/routing/common-router-tasks). angular.dev.
- Angular Team. [Route guards](https://angular.dev/guide/routing/route-guards). angular.dev.
