---
type: concept
tags:
  - language
  - react-native
  - react
  - typescript
  - mobile
related:
  - languages/react-native/core-components-and-styling
  - languages/react-native/data-fetching
  - languages/react-native/accessibility
  - languages/react/forms
language: "react-native"
---
# Forms

> There is no `<form>`, no native validation, and a keyboard that covers half the screen. React Hook Form plus a schema handles the first two; layout discipline handles the third.

---

## What is it?

A form in React Native is a set of `TextInput` components, some validation, and a submit handler. What the web gives you for free — form submission, `required`, `type="email"`, browser autofill, a submit button that responds to Enter — does not exist here.

The practical stack is **React Hook Form** for state and validation wiring, **Zod** for the schema, and deliberate handling of the keyboard.

---

## Why does it matter?

Forms are where users give you something, so they are where abandonment hurts most. On a phone the failure modes are specific and avoidable: the keyboard hides the field being typed into, the submit button is unreachable, the wrong keyboard type appears, Return does nothing, and an error message is rendered somewhere off-screen.

Validation logic is also the part of an app most worth testing, and it is only testable if it lives outside the component.

---

## How it works

### Controlled inputs

```tsx
const [email, setEmail] = useState("");

<TextInput value={email} onChangeText={setEmail} />
```

Note `onChangeText`, which receives the string directly — not `onChange` with an event object. This is the single most common porting mistake from React on the web.

Managing several fields by hand means one `useState` per field, manual touched tracking, and validation scattered through the component. That is what React Hook Form removes.

### Schema first

Define the shape and the rules in one place, outside the component:

```ts
// src/features/auth/schema.ts
import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z.string().min(2, "Name is too short"),
    username: z.string().min(3, "At least 3 characters").regex(/^[a-z0-9_]+$/i, "Letters, numbers and underscore only"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpValues = z.infer<typeof signUpSchema>;
```

The schema is a plain module: unit-testable without rendering anything, and reusable on a server that shares the codebase.

### Wiring the form

```tsx
const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignUpValues>({
  resolver: zodResolver(signUpSchema),
  defaultValues: { name: "", username: "", password: "", confirmPassword: "" },
});
```

`Controller` connects React Hook Form to `TextInput`, which is uncontrolled from the library's perspective:

```tsx
<Controller
  control={control}
  name="username"
  render={({ field: { onChange, onBlur, value } }) => (
    <TextInput value={value} onChangeText={onChange} onBlur={onBlur} />
  )}
/>
```

### Keyboard type and behaviour

Each input should declare what it expects. This is a small change with a large usability effect:

| Prop | Purpose |
|---|---|
| `keyboardType` | `"numeric"`, `"phone-pad"`, `"decimal-pad"`, `"url"` |
| `autoCapitalize` | `"none"` for usernames and passwords |
| `autoCorrect={false}` | For anything that is not prose |
| `secureTextEntry` | Password masking |
| `textContentType` / `autoComplete` | Enables OS autofill and one-time-code suggestions |
| `returnKeyType` | `"next"` or `"done"` — what the Return key shows |
| `onSubmitEditing` | What Return actually does |

### Moving between fields

Return should advance to the next field, and the last field should submit:

```tsx
const passwordRef = useRef<TextInput>(null);

<TextInput
  returnKeyType="next"
  onSubmitEditing={() => passwordRef.current?.focus()}
  blurOnSubmit={false}
/>
<TextInput ref={passwordRef} returnKeyType="done" onSubmitEditing={handleSubmit(onSubmit)} />
```

`blurOnSubmit={false}` prevents the keyboard from closing and reopening between fields, which otherwise looks like a flicker.

### Keeping the keyboard out of the way

```tsx
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : undefined}
>
  <ScrollView
    contentContainerStyle={{ padding: 16, gap: 16 }}
    keyboardShouldPersistTaps="handled"
  >
    {/* fields */}
  </ScrollView>
</KeyboardAvoidingView>
```

Two details that are easy to miss: `behavior` needs to differ by platform, because Android already resizes the window; and `keyboardShouldPersistTaps="handled"` is what allows the submit button to register a tap while the keyboard is open. Without it, the first tap only dismisses the keyboard.

---

## Examples

A complete sign-up form:

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRef } from "react";
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { Button } from "@/shared/ui/Button";
import { signUpSchema, type SignUpValues } from "../schema";

export function SignUpForm({ onSubmit }: { onSubmit: (values: SignUpValues) => Promise<void> }) {
  const passwordRef = useRef<TextInput>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", username: "", password: "", confirmPassword: "" },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={[styles.input, errors.username && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
                accessibilityLabel="Username"
              />
              {errors.username && (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {errors.username.message}
                </Text>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                ref={passwordRef}
                style={[styles.input, errors.password && styles.inputError]}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                accessibilityLabel="Password"
              />
              {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
            </View>
          )}
        />

        <Button
          title={isSubmitting ? "Creating account…" : "Create account"}
          disabled={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  inputError: { borderColor: "#d33" },
  error: { color: "#d33", fontSize: 13 },
});
```

The submit handler stays outside the component, so the screen does not know whether submitting means an API call, a navigation, or both.

---

## When to use

- **React Hook Form + Zod** for any form beyond two fields.
- **A schema module per form**, kept out of the component so validation can be unit-tested directly.
- **`keyboardType`, `autoComplete`, and `returnKeyType` on every input** — cheap to add, immediately noticeable.
- **`KeyboardAvoidingView`** on any screen where an input sits in the lower half.

## When NOT to use

- Do not hand-roll multi-field state with one `useState` per field. Touched tracking and validation ordering are more work than they look.
- Do not validate inline in the component. It cannot be tested without rendering, and it drifts from the server's rules.
- Do not put form state in a global store. It is local until submitted.
- Do not forget `keyboardShouldPersistTaps="handled"` — without it the submit button appears broken while the keyboard is open.
- Do not validate on every keystroke for expensive rules. Validate on blur and on submit; `mode: "onBlur"` is usually the right default.

---

## References

- [TextInput — React Native](https://reactnative.dev/docs/textinput)
- [KeyboardAvoidingView — React Native](https://reactnative.dev/docs/keyboardavoidingview)
- [React Hook Form — React Native](https://react-hook-form.com/get-started#ReactNative)
- [Zod — schema validation](https://zod.dev/)
- [Forms — Expo UI](https://docs.expo.dev/develop/user-interface/forms/)
