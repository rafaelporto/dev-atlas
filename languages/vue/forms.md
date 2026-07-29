---
type: concept
tags:
  - language
  - vue
  - typescript
  - frontend
related:
  - languages/vue/template-syntax-and-components
  - languages/vue/reactivity-and-composition-api
  - languages/react/forms
language: "vue"
---

# Forms

> Handling user input in Vue with `v-model` two-way binding, and validating it with schema libraries like VeeValidate and Zod.

---

## What is it?

Vue handles form input primarily through **`v-model`**, a directive that creates two-way binding between a form element and reactive state — typing in an input updates the state, and changing the state updates the input. For validation, Vue relies on the ecosystem: **VeeValidate** and **Zod**/**Yup** schemas are the common choices.

---

## Why does it matter?

Forms are where user input meets application state, and `v-model` removes the boilerplate of wiring `value` + `@input` by hand for every field. But two-way binding alone doesn't validate; understanding how `v-model` works — and where a validation library takes over for error messages, touched state, and submission — is what separates a toy form from a production one.

---

## How it works

### `v-model` basics

`v-model` on a native input is shorthand for a value binding plus an input handler:

```vue
<script setup lang="ts">
import { ref } from 'vue';
const name = ref('');
const agreed = ref(false);
const role = ref('member');
</script>

<template>
  <input v-model="name" placeholder="Name" />          <!-- text -->
  <input type="checkbox" v-model="agreed" />            <!-- boolean -->
  <select v-model="role">                               <!-- select -->
    <option value="member">Member</option>
    <option value="admin">Admin</option>
  </select>
</template>
```

Modifiers refine behavior: `v-model.trim` trims whitespace, `v-model.number` casts to a number, `v-model.lazy` syncs on `change` instead of every keystroke.

### `v-model` on components

A component can support `v-model` by declaring a `defineModel()` — the modern way to build custom inputs:

```vue
<!-- CurrencyInput.vue -->
<script setup lang="ts">
const amount = defineModel<number>(); // two-way bound to the parent's v-model
</script>
<template>
  <input :value="amount" @input="amount = +$event.target.value" />
</template>
```

```vue
<CurrencyInput v-model="price" />
```

### Validation with VeeValidate + Zod

Hand-rolled validation gets unwieldy fast. VeeValidate manages field state (value, errors, touched, dirty) and integrates with schema validators:

```vue
<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';

const schema = toTypedSchema(
  z.object({
    name: z.string().min(1, 'Name is required'),
    age: z.number().min(18, 'Must be 18+'),
  }),
);

const { handleSubmit, errors, defineField } = useForm({ validationSchema: schema });
const [name] = defineField('name');
const [age] = defineField('age');

const onSubmit = handleSubmit((values) => console.log(values)); // typed values
</script>

<template>
  <form @submit="onSubmit">
    <input v-model="name" /> <small>{{ errors.name }}</small>
    <input v-model="age" type="number" /> <small>{{ errors.age }}</small>
    <button>Submit</button>
  </form>
</template>
```

The Zod schema is the single source of truth for both runtime validation and TypeScript types.

---

## Examples

A minimal controlled form without a library (fine for a couple of fields):

```vue
<script setup lang="ts">
import { reactive, computed } from 'vue';

const form = reactive({ name: '', email: '' });
const nameError = computed(() => (form.name ? '' : 'Required'));
const canSubmit = computed(() => !nameError.value);
</script>

<template>
  <form @submit.prevent="save(form)">
    <input v-model.trim="form.name" />
    <small v-if="nameError">{{ nameError }}</small>
    <button :disabled="!canSubmit">Save</button>
  </form>
</template>
```

Note `@submit.prevent` — the `.prevent` modifier calls `preventDefault()` so the page doesn't reload.

---

## When to use

- Use `v-model` for all form input binding — native elements and custom input components (via `defineModel`).
- Use VeeValidate + Zod (or Yup) for anything beyond trivial validation: multiple fields, cross-field rules, async checks, typed submission.
- Use input modifiers (`.trim`, `.number`, `.lazy`) to handle common casting/timing needs declaratively.

## When NOT to use

- Don't hand-roll validation state (errors, touched, dirty) for a real form — a library does it correctly and reduces bugs.
- Don't forget `@submit.prevent` — otherwise the browser reloads on submit.
- Don't duplicate validation rules in the template and in JS — derive both from one schema.

## References

- Vue Team. [Form Input Bindings](https://vuejs.org/guide/essentials/forms.html). vuejs.org.
- Vue Team. [Component v-model](https://vuejs.org/guide/components/v-model.html). vuejs.org.
- VeeValidate. [VeeValidate — Overview](https://vee-validate.logaretm.com/v4/). vee-validate.logaretm.com.
