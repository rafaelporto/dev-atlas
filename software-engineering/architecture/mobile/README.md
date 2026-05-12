# Mobile Architecture

Architectural patterns for mobile applications define how responsibilities are separated across the UI, presentation logic, business rules, and data layers — and how state flows through the system.

---

## Articles

| Article | Description |
|---|---|
| [MVC](mvc.md) | The original iOS pattern — and why it breaks down at scale |
| [MVP](mvp.md) | Passive View and a testable Presenter, without framework dependencies |
| [MVVM](mvvm.md) | Observable ViewModel with data binding — the dominant pattern today |
| [MVI](mvi.md) | Unidirectional data flow with immutable state |
| [VIPER](viper.md) | Five-layer iOS architecture with explicit routing |
| [Clean Architecture](clean-architecture-mobile.md) | Domain-isolated layers applied to mobile apps |
| [Modular Architecture](modular-architecture.md) | Feature modules for team scale and build-time performance |

---

> These patterns are not mutually exclusive. Clean Architecture defines the layer boundaries; MVVM or MVI organize the presentation layer inside them. Modular Architecture determines how those layers are packaged and owned by teams.
