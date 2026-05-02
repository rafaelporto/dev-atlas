# Clean Architecture

> Organize the system around use cases. All source code dependencies must point inward — from outer circles toward the innermost circle. Nothing in the inner circle knows anything about the outer circles.

Introduced by Robert C. Martin (Uncle Bob) in 2012.

---

## What is it?

Clean Architecture is a synthesis of several earlier architectural ideas (Hexagonal, Onion, BCE) unified under one rule: **the Dependency Rule**.

```
┌──────────────────────────────────────────────────────────────┐
│  Frameworks & Drivers (Web, DB, UI, Devices, External APIs)  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │            Interface Adapters                          │  │
│  │  (Controllers, Presenters, Gateways, Repositories)    │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │           Application Business Rules             │  │  │
│  │  │                  (Use Cases)                     │  │  │
│  │  │  ┌────────────────────────────────────────────┐  │  │  │
│  │  │  │      Enterprise Business Rules             │  │  │  │
│  │  │  │      (Entities / Domain Model)             │  │  │  │
│  │  │  └────────────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

         All arrows point inward ←
```

## The Dependency Rule

> Source code dependencies can only point inward. Nothing in an inner circle can know anything at all about something in an outer circle.

This means:
- Entities do not import Use Cases.
- Use Cases do not import Controllers.
- Controllers do not import Frameworks directly — they work through interfaces.

## The four circles

### Entities (innermost)

Enterprise-wide business rules. Objects that encapsulate the most general, high-level rules. They change least often — only when fundamental business rules change.

```python
class User:
    def __init__(self, id: UserId, email: Email, password_hash: str):
        self.id = id
        self.email = email
        self._password_hash = password_hash

    def verify_password(self, raw: str) -> bool:
        return hash_function(raw) == self._password_hash

    def change_email(self, new_email: Email):
        if not new_email.is_valid():
            raise DomainError("Invalid email")
        self.email = new_email
```

### Use Cases (application business rules)

Application-specific business rules. Each use case orchestrates the flow of data to and from entities to achieve a specific goal. Use Cases define **input/output ports** (interfaces) to communicate with the outer layers.

```python
# Input port (what the controller calls)
class RegisterUserInputPort(ABC):
    @abstractmethod
    def execute(self, request: RegisterUserRequest) -> RegisterUserResponse: ...


# Output port (what the use case calls — implemented outside)
class UserRepository(ABC):
    @abstractmethod
    def exists_by_email(self, email: Email) -> bool: ...

    @abstractmethod
    def save(self, user: User): ...


# Use Case implementation
class RegisterUserUseCase(RegisterUserInputPort):
    def __init__(self, repo: UserRepository, hasher: PasswordHasher):
        self._repo = repo
        self._hasher = hasher

    def execute(self, request: RegisterUserRequest) -> RegisterUserResponse:
        email = Email(request.email)

        if self._repo.exists_by_email(email):
            raise EmailAlreadyInUseError(email)

        hashed = self._hasher.hash(request.password)
        user = User(UserId.generate(), email, hashed)
        self._repo.save(user)

        return RegisterUserResponse(user_id=str(user.id))
```

### Interface Adapters

Convert data from the format most convenient for use cases/entities into the format most convenient for the framework (and vice versa). Controllers, Presenters, and Repository implementations live here.

```python
# Controller — calls the use case through its input port
class RegisterUserController:
    def __init__(self, use_case: RegisterUserInputPort):
        self._use_case = use_case

    def handle(self, http_request: HttpRequest) -> HttpResponse:
        request = RegisterUserRequest(
            email=http_request.body["email"],
            password=http_request.body["password"],
        )
        try:
            response = self._use_case.execute(request)
            return HttpResponse(201, {"user_id": response.user_id})
        except EmailAlreadyInUseError:
            return HttpResponse(409, {"error": "Email already in use"})


# Gateway — implements output port
class PostgresUserRepository(UserRepository):
    def exists_by_email(self, email: Email) -> bool:
        return self._db.scalar("SELECT 1 FROM users WHERE email = %s", str(email))

    def save(self, user: User):
        self._db.execute("INSERT INTO users ...", user.to_row())
```

### Frameworks & Drivers (outermost)

The outermost circle contains frameworks and tools: the web framework, ORM, database driver, UI library. This circle writes very little code — it mostly glues adapters to the underlying tools.

```python
# Composition root — wires everything together
def build_app() -> Flask:
    app = Flask(__name__)
    db = PostgresConnection(DATABASE_URL)

    # Driven adapters
    user_repo = PostgresUserRepository(db)
    hasher = BcryptPasswordHasher()

    # Use case
    register_use_case = RegisterUserUseCase(user_repo, hasher)

    # Driving adapter
    controller = RegisterUserController(register_use_case)

    @app.route("/users", methods=["POST"])
    def register():
        return controller.handle(HttpRequest(request.json))

    return app
```

## Data crossing boundaries

When data crosses a boundary (e.g., from Controller to Use Case), it travels as simple data structures — DTOs (Data Transfer Objects), not domain entities. This prevents domain objects from leaking outward.

```python
# DTO — crosses the boundary between Controller and Use Case
@dataclass
class RegisterUserRequest:
    email: str
    password: str

@dataclass
class RegisterUserResponse:
    user_id: str
```

## Clean vs Hexagonal vs Onion

| | Hexagonal | Onion | Clean |
|---|---|---|---|
| Focus | Port/Adapter boundary | Concentric rings | Dependency Rule + Use Cases |
| Use Cases | Not explicit | Application Services | First-class circle |
| Entities vs Use Cases | Not separated | Separated rings | Separate circles |
| Data transfer objects | Optional | Optional | Explicit, between every boundary |

Clean Architecture is the most prescriptive of the three: it explicitly separates Entities from Use Cases, mandates DTOs at boundaries, and gives Use Cases their own input/output port interfaces.

## When to use

- Complex applications where business rules must be isolated from delivery mechanisms (HTTP, CLI, tests).
- Long-lived systems where delivery mechanisms and frameworks will change over time.
- When testability at the use-case level is a high priority.

## When NOT to use

- When the overhead of DTOs, input/output ports, and explicit layers is greater than the complexity of the business logic.
- Small or short-lived services — a simpler layered structure is more productive.

## References

- Martin, Robert C. *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall, 2017.
- Martin, Robert C. [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) (2012).
