---
type: concept
tags: []
related: []
language: "react"
---
# Forms

> Most React forms benefit from a dedicated library (React Hook Form). Hand-rolling controlled inputs is fine for tiny forms; it doesn't scale.

---

## What is it?

A **form** in React is a tree of input components whose values are managed alongside the rest of your component state. There are three common approaches:

1. **Controlled** — React state holds each input value; `onChange` updates it.
2. **Uncontrolled** — the DOM holds the value; React reads it on submit via `ref` or `FormData`.
3. **Form library** (React Hook Form, Formik) — handles registration, validation, errors, and performance for you.

For anything beyond a search box or a single field, prefer a library.

---

## Why does it matter?

Real-world forms have validation, async checks (e.g., "is this email taken?"), nested fields, arrays of items, conditional fields, and performance constraints (re-rendering every keystroke across a 30-field form is expensive). Solving these by hand is error-prone and verbose. React Hook Form solves them with a small, performant API.

---

## How it works

### Controlled inputs

```tsx
function SearchBox() {
  const [query, setQuery] = useState("");

  return (
    <input
      value={query}
      onChange={e => setQuery(e.target.value)}
      placeholder="Search…"
    />
  );
}
```

Every keystroke triggers a re-render of the component owning the state. For one input this is fine. For a 30-field form, it adds up.

### Uncontrolled inputs

```tsx
function ContactForm() {
  const ref = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = new FormData(ref.current!);
    const name = data.get("name") as string;
    // ...
  }

  return (
    <form ref={ref} onSubmit={handleSubmit}>
      <input name="name" defaultValue="" />
      <button>Submit</button>
    </form>
  );
}
```

The DOM holds the value. React only learns about it on submit. Zero re-renders per keystroke.

### React Hook Form

`react-hook-form` registers inputs as uncontrolled, subscribes only fields that need to re-render, and gives you a typed API for values, validation, and errors.

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type Values = z.infer<typeof Schema>;

function SignInForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(Schema),
  });

  return (
    <form onSubmit={handleSubmit(async (values) => { await signIn(values); })}>
      <label>
        Email
        <input {...register("email")} />
        {errors.email && <span>{errors.email.message}</span>}
      </label>

      <label>
        Password
        <input type="password" {...register("password")} />
        {errors.password && <span>{errors.password.message}</span>}
      </label>

      <button disabled={isSubmitting}>Sign in</button>
    </form>
  );
}
```

Zod (or Yup, Valibot) lets you declare a schema once and reuse it for both client-side validation and TypeScript types.

### React 19 actions

React 19 introduces first-class **actions** for forms. You attach an async function to `<form action={...}>` and use `useFormStatus` / `useActionState` to track pending and error state — no library required for simple cases.

```tsx
async function submit(formData: FormData) {
  await saveProfile(formData);
}

function ProfileForm() {
  return (
    <form action={submit}>
      <input name="name" />
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>Save</button>;
}
```

For server components (Next.js, Remix), the action runs on the server.

---

## Examples

### Validation with Zod

```tsx
const Schema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.coerce.number().int().nonnegative(),
  email: z.string().email(),
});
```

Use the same schema with React Hook Form via `zodResolver`, and parse the same payload on the backend.

### Async validation

```tsx
const { register } = useForm();

<input {...register("username", {
  validate: async (value) => {
    const taken = await isUsernameTaken(value);
    return taken ? "Username is taken" : true;
  },
})} />
```

---

## When to use

- **Controlled** — single input or very small form (≤ 3 fields).
- **Uncontrolled / React Hook Form** — anything beyond that, especially with validation, dynamic fields, or arrays.
- **React 19 actions** — simple forms in apps already using the new model (e.g., Next.js App Router).
- **Zod** (or Valibot / Yup) — whenever validation is non-trivial; share the schema across client and server.

---

## When NOT to use

- Don't hand-roll controlled inputs for a 20+ field form — performance and verbosity suffer.
- Don't validate only on submit when fields can be validated as users move on (use `mode: "onBlur"` in RHF).
- Don't store transient form state in app-wide state libraries (Redux, Zustand) — keep it local until submit.
- Don't trust client-side validation alone — always validate on the server too.

---

## References

- [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev)
- [`useFormStatus` — react.dev](https://react.dev/reference/react-dom/hooks/useFormStatus)
- [`useActionState` — react.dev](https://react.dev/reference/react/useActionState)
- [`<form>` action prop — react.dev](https://react.dev/reference/react-dom/components/form)
