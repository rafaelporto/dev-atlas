# Facade

> Provide a simplified interface to a complex subsystem.

---

## What is it?

Facade defines a higher-level interface that makes a subsystem easier to use. It does not add new functionality — it hides complexity by coordinating multiple subsystem components behind a single, convenient entry point.

## Why does it matter?

Complex subsystems (video encoders, payment processing, notification pipelines) involve many classes that must be called in the right order with the right parameters. Exposing all of that to every client creates tight coupling and forces every caller to understand the internals. A Facade lets clients do the common case with one call.

## How it works

```
Client ──► Facade ──► SubsystemA
                 ──► SubsystemB
                 ──► SubsystemC
```

The Facade delegates to subsystem classes. Clients are not prevented from bypassing the Facade for advanced use — it is a convenience layer, not a lock.

## Pseudo-code

```python
# Complex subsystem classes
class VideoDecoder:
    def load(self, path: str):
        print(f"VideoDecoder: loading {path}")

    def decode(self) -> "RawFrames":
        print("VideoDecoder: decoding frames")
        return RawFrames()


class AudioDecoder:
    def load(self, path: str):
        print(f"AudioDecoder: loading {path}")

    def decode(self) -> "RawAudio":
        print("AudioDecoder: decoding audio")
        return RawAudio()


class Encoder:
    def encode(self, frames: "RawFrames", audio: "RawAudio", codec: str):
        print(f"Encoder: encoding with codec={codec}")
        return EncodedFile()


class FileWriter:
    def write(self, encoded: "EncodedFile", output_path: str):
        print(f"FileWriter: writing to {output_path}")


# Facade — hides all of the above behind one method
class VideoConverterFacade:
    def __init__(self):
        self._video_decoder = VideoDecoder()
        self._audio_decoder = AudioDecoder()
        self._encoder = Encoder()
        self._writer = FileWriter()

    def convert(self, input_path: str, output_path: str, codec: str = "h264"):
        self._video_decoder.load(input_path)
        self._audio_decoder.load(input_path)

        frames = self._video_decoder.decode()
        audio = self._audio_decoder.decode()

        encoded = self._encoder.encode(frames, audio, codec)
        self._writer.write(encoded, output_path)
        print("Done.")


# Client — uses only the Facade
converter = VideoConverterFacade()
converter.convert("input.avi", "output.mp4")
# VideoDecoder: loading input.avi
# AudioDecoder: loading input.avi
# VideoDecoder: decoding frames
# AudioDecoder: decoding audio
# Encoder: encoding with codec=h264
# FileWriter: writing to output.mp4
# Done.
```

### Another example: order placement

```python
class OrderFacade:
    def place_order(self, cart: Cart, user: User) -> Order:
        inventory.reserve(cart.items)
        payment = payment_service.charge(user.card, cart.total)
        order = order_repo.create(user, cart.items, payment)
        notification_service.send_confirmation(user.email, order)
        return order

# Without the Facade, every client would repeat these 4 calls in the right order.
```

## When to use

- You want to provide a simple interface to a complex subsystem.
- You want to layer your subsystem and define entry points for each layer.
- You want to reduce coupling between clients and a subsystem.

## When NOT to use

- When clients need fine-grained control over the subsystem — the Facade would get in the way.
- Do not turn the Facade into a "god class" that does everything. It should delegate, not own logic.

## References

- Gamma et al. *Design Patterns*. Addison-Wesley, 1994. p. 185.
- [Refactoring Guru — Facade](https://refactoring.guru/design-patterns/facade)
