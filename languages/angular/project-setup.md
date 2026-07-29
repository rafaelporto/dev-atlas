---
type: concept
tags:
  - language
  - angular
  - typescript
  - frontend
  - tool
related:
  - languages/angular/overview
  - languages/angular/components-and-templates
  - languages/angular/testing
language: "angular"
---

# Angular Project Setup

> How an Angular project is scaffolded, structured, and bootstrapped with the Angular CLI.

---

## What is it?

Every Angular project is created and managed by the **Angular CLI** (`ng`), the first-party command-line tool that scaffolds the workspace, generates components and services, runs the dev server, and builds for production. Understanding the workspace layout and the standalone bootstrap is the foundation for everything else.

---

## Why does it matter?

Angular is convention-heavy: files live in predictable places, and the CLI enforces that structure. This is deliberate — it means any Angular developer can open any Angular project and immediately know where things are. Fighting the conventions (custom folder layouts, hand-rolled builds) throws away one of the framework's main benefits. Learning the standard workspace once pays off across every project.

---

## How it works

### The CLI

The CLI is the entry point for the whole lifecycle:

```
ng new <app>        scaffold a new workspace
ng serve            run the dev server (HMR)
ng generate <kind>  scaffold a component/service/etc. (alias: ng g)
ng build            production build (optimized, tree-shaken)
ng test             run unit tests
ng update           migrate to a newer Angular version
```

### Workspace layout

A modern standalone app looks like:

```
my-app/
├── angular.json          # workspace + build configuration
├── package.json
├── tsconfig.json         # base TypeScript config
└── src/
    ├── main.ts           # bootstrap entry point
    ├── index.html        # the single host page
    ├── styles.css        # global styles
    └── app/
        ├── app.component.ts
        ├── app.config.ts     # application-wide providers
        ├── app.routes.ts     # route definitions
        └── <feature>/        # feature folders
```

### The bootstrap chain

The app starts in `main.ts`, which bootstraps the root component with a set of providers:

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig);
```

Application-wide configuration lives in `app.config.ts` so it stays out of the bootstrap file:

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
```

The `provide*` functions are how first-party features are enabled in the standalone world — they replace the old `NgModule` `imports`.

---

## Examples

Scaffolding a new project and generating a feature component:

```bash
# Create a standalone app (routing enabled, CSS for styles)
ng new my-app --standalone --routing --style=css
cd my-app

# Generate a component into a feature folder
ng generate component features/dashboard

# Run the dev server on the default port 4200
ng serve --open
```

A generated standalone component:

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [], // template dependencies go here
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {}
```

---

## When to use

- Any new Angular project — always start from `ng new`; do not hand-assemble a workspace.
- When you need consistent structure across many apps or many contributors.
- When you want first-party build optimization (esbuild-based, tree-shaking, differential loading) without configuring a bundler yourself.

## When NOT to use

- Embedding a tiny Angular widget into a non-Angular page where the full workspace is unnecessary — consider Angular Elements or a lighter tool instead.
- Overriding the CLI build with a custom webpack config unless you have a concrete, measured need — it forfeits automated updates.

## References

- Angular Team. [Setting up the local environment and workspace](https://angular.dev/tools/cli/setup-local). angular.dev.
- Angular Team. [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli). angular.dev.
- Angular Team. [Bootstrapping an application](https://angular.dev/guide/components/importing). angular.dev.
