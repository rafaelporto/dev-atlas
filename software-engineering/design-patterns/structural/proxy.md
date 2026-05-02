# Proxy

> Provide a surrogate or placeholder for another object to control access to it.

---

## What is it?

Proxy is an object that acts as a stand-in for another object (the Subject). The proxy implements the same interface as the real Subject and intercepts calls to add behavior — such as lazy initialization, access control, logging, or caching — before forwarding them.

## Why does it matter?

Sometimes you want to create an expensive object only when it is actually needed, restrict who can use an object, log every access, or cache results. Adding this logic directly to the Subject violates the Single Responsibility Principle. The Proxy holds this cross-cutting concern separately.

## How it works

```
Client → [Subject Interface] → Proxy → RealSubject
```

Both the Proxy and RealSubject implement the same interface. The client cannot tell them apart.

## Types of Proxy

| Type | Purpose |
|---|---|
| **Virtual Proxy** | Delays creation of an expensive object until needed (lazy init) |
| **Protection Proxy** | Controls access based on permissions |
| **Remote Proxy** | Represents an object in a different address space (e.g., RPC) |
| **Caching Proxy** | Caches results of expensive operations |
| **Logging Proxy** | Logs calls to the real subject |

## Pseudo-code

### Virtual Proxy (lazy initialization)

```python
class Image(ABC):
    @abstractmethod
    def display(self): ...


class RealImage(Image):
    def __init__(self, path: str):
        self.path = path
        self._load()              # expensive operation at construction

    def _load(self):
        print(f"Loading image from disk: {self.path}")

    def display(self):
        print(f"Displaying: {self.path}")


class LazyImageProxy(Image):
    def __init__(self, path: str):
        self.path = path
        self._real: RealImage = None   # not loaded yet

    def display(self):
        if self._real is None:
            self._real = RealImage(self.path)   # load only when first needed
        self._real.display()


# Usage
images = [LazyImageProxy(f"photo_{i}.jpg") for i in range(100)]
# No disk I/O yet — proxies are cheap

images[0].display()
# → Loading image from disk: photo_0.jpg
# → Displaying: photo_0.jpg

images[0].display()
# → Displaying: photo_0.jpg  (already loaded, no second disk read)
```

### Protection Proxy (access control)

```python
class DocumentService(ABC):
    @abstractmethod
    def read(self, doc_id: str) -> str: ...

    @abstractmethod
    def delete(self, doc_id: str): ...


class RealDocumentService(DocumentService):
    def read(self, doc_id: str) -> str:
        return f"Content of {doc_id}"

    def delete(self, doc_id: str):
        print(f"Deleted {doc_id}")


class DocumentServiceProxy(DocumentService):
    def __init__(self, service: DocumentService, user_role: str):
        self._service = service
        self._role = user_role

    def read(self, doc_id: str) -> str:
        return self._service.read(doc_id)   # everyone can read

    def delete(self, doc_id: str):
        if self._role != "admin":
            raise PermissionError("Only admins can delete documents")
        self._service.delete(doc_id)


# Usage
service = DocumentServiceProxy(RealDocumentService(), user_role="viewer")
print(service.read("doc-1"))   # → Content of doc-1
service.delete("doc-1")        # → PermissionError: Only admins can delete documents
```

### Caching Proxy

```python
class WeatherService(ABC):
    @abstractmethod
    def get_forecast(self, city: str) -> str: ...


class APIWeatherService(WeatherService):
    def get_forecast(self, city: str) -> str:
        print(f"Calling weather API for {city}...")
        return f"Sunny in {city}"


class CachingWeatherProxy(WeatherService):
    def __init__(self, service: WeatherService, ttl_seconds: int = 300):
        self._service = service
        self._cache: dict[str, tuple[str, float]] = {}
        self._ttl = ttl_seconds

    def get_forecast(self, city: str) -> str:
        if city in self._cache:
            result, timestamp = self._cache[city]
            if time.time() - timestamp < self._ttl:
                print(f"Cache hit for {city}")
                return result
        result = self._service.get_forecast(city)
        self._cache[city] = (result, time.time())
        return result
```

## When to use

- You need lazy initialization of an expensive object.
- You need to add access control around a service.
- You need to cache results of remote or expensive calls.
- You need to log or audit all calls to an object.

## When NOT to use

- When the response time introduced by the proxy matters and is not offset by its benefits.
- When the added indirection makes the code harder to debug without meaningful benefit.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 207.
- [Refactoring Guru — Proxy](https://refactoring.guru/design-patterns/proxy)
