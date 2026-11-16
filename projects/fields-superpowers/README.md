# Fields with Superpowers 🦸

### Custom Field Features with Angular Signal Forms Metadata

This project is the live-coding demo from the **NG Poland** talk about **Signal Forms metadata** — how to build custom, reusable field features using metadata and a field wrapper component.

Signal Forms are **stable since Angular v22** — everything shown here is public, supported API.

---

## 1. The Problem

Defining a Signal Form and its schema is the *easy* part:

```ts
const userSchema = schema<User>((path) => {
  required(path.firstName);
  minLength(path.bio, 20);
  minWords(path.bio, 5); // our custom validator
});

readonly userForm = form(this.model, userSchema);
```

But then you write the HTML... and every single field wants a whole entourage of features:

- A **label**
- A **required star** (only when the field is actually required)
- **Error messages**
- **Hints** ("at least 20 characters", "at least 5 words"...)
- And sometimes **custom extras** — for example, in form-heavy applications, some fields need a **copy to clipboard** button

So your template ends up looking like this — *for every field*:

```html
<label>
  Bio
  @if (bioIsRequired) { <span class="star">*</span> }
</label>
<input [formField]="userForm.bio" />
<span class="hint">At least 20 characters, at least 5 words</span>
@for (error of userForm.bio().errors(); track error) {
  <span class="error">{{ error.message }}</span>
}
<button (click)="copyBio()">📋</button>
```

Lots and lots of repeating HTML surrounding every input. And worse — the information is **duplicated**: the schema already *knows* the field is required and has a min length, but we repeat it manually in the UI.

---

## 2. The Solution: A Field Wrapper

We create a **field wrapper** — a component that receives the input control via content projection and adds all of the surrounding features:

```html
<app-field-wrapper label="Bio">
  <textarea [formField]="userForm.bio"></textarea>
</app-field-wrapper>
```

The initial wrapper displays the label, required star, hints from `min`, `max`,
`minLength`, and `maxLength`, and errors after the field is touched. The control
uses a native wrapping label without HTML IDs. Copy and AI buttons are reserved
for the later metadata features below.

Hint calculation lives in `getFieldHints(state)`, a pure function that returns
an array of hint strings. It collects the value-range and length-range hints,
filtering out `null` when a range does not apply.

The wrapper needs information — label, required flag, limitations for hints, etc. The label we pass as an input. But the rest?

### The field state already knows a lot

The wrapper doesn't even need the field as an input — the projected content already carries the `FormField` directive. The wrapper queries it as a **content child** and gets the **field state** from it. From that state, it can **auto-detect** many features:

```ts
// inside the field wrapper component
readonly formField = contentChild.required(FormField);

readonly state = computed(() => this.formField().state());

readonly isRequired = computed(() => this.state().required());
readonly errors     = computed(() => this.state().errors());
readonly maxLength  = computed(() => this.state().maxLength?.());
readonly min        = computed(() => this.state().min?.());
```

The required star, the error messages, and even hints derived from `min`, `max`, `minLength`, `maxLength` — all of these can be rendered automatically, **without the developer writing anything twice**. One declaration in the schema, and the UI follows.

---

## 3. But What About Custom Validators?

We wrote a custom `minWords` validator that counts words. It works fine for validation — but the field state has no `minWords()` property. How can the wrapper show a *"minimum 5 words"* hint?

**How does the validator pass data — metadata — into the field state?**

---

## 4. Metadata: The Dependency Injection of Signal Forms

Signal Forms have a **metadata** feature, and it works a lot like Angular's dependency injection with injection tokens:

| Dependency Injection | Signal Forms Metadata |
| --- | --- |
| `InjectionToken<T>` — unique identifier that also defines the type | **Metadata key** — unique identifier that also defines the type |
| Provider — sets the value | `metadata(path, key, logicFn)` — sets the value on a field |
| `inject(token)` — extracts the value | `state.metadata(key)` — extracts the value as a signal |

In fact — **even the built-in validators use it**. The `required()` property on field state is just a convenient shortcut that extracts a boolean signal out of the general metadata structure (there is a built-in `REQUIRED` metadata key, along with `MIN`, `MAX`, `MIN_LENGTH`, `MAX_LENGTH`, `PATTERN`...). If you look at the source of the built-in validators, each one has a unique metadata key, and each one calls both `validate(...)` (to install the validation logic) **and** `metadata(...)` (to publish the validation metadata).

### Doing the same for `minWords`

```ts
// 1. The identifier — a unique metadata key, typed
export const MIN_WORDS = createMetadataKey<number>();

// 2. The setter — publish metadata inside the validator
export function minWords(path: SchemaPath<string>, threshold: number) {
  metadata(path, MIN_WORDS, () => threshold);

  validate(path, ({ value }) =>
    countWords(value()) >= threshold
      ? undefined
      : { kind: 'minWords', message: `At least ${threshold} words` }
  );
}
```

```ts
// 3. The getter — read it in the field wrapper
readonly minWords = computed(() => this.state().metadata(MIN_WORDS)?.());
```

Now the wrapper can display a proper *"at least 5 words"* hint — declared once, in the schema.

---

## 5. Schema Functions Are Not Just Validators

In Signal Forms we call them **schema functions**, not validators — because they do more than validate:

- **`disabled(path, logicFn)`** installs a feature where the field becomes automatically disabled when a condition applies.
- **`hidden(path, logicFn)`** sets metadata that says whether the field is hidden — but it doesn't actually hide anything. **It's up to the UI (the wrapper) to implement it.**

This leads to the key insight of the talk:

> **Schema functions let us define new *features*. The schema function sets the feature's metadata — and the field wrapper reads the metadata and implements the feature.**

So let's build two custom features.

---

## 6. Feature #1: `copyable`

A schema function that dynamically decides when a field is copy-paste-able. The wrapper shows a 📋 button; clicking it copies the field value to the clipboard and shows a notification.

```ts
export const COPYABLE = createMetadataKey<boolean>();

export function copyable<TValue>(
  path: SchemaPath<TValue>,
  logic: LogicFn<TValue, boolean> = () => true
) {
  metadata(path, COPYABLE, logic);
}
```

Usage in the schema — fully dynamic:

```ts
copyable(path.email);
copyable(path.apiKey, ({ valueOf }) => valueOf(path.showSecrets));
```

### The `valueOrDefault` utility

Reading metadata in the wrapper gives us a `Signal<boolean | undefined> | undefined` — the key may not be set at all, and its value may be undefined. That's too many checks. So we wrote a small utility:

```ts
export function valueOrDefault<T, K>(
  source: Signal<T | undefined> | undefined,
  defaultValue: K
): Signal<T | K> {
  return computed(() => source?.() ?? defaultValue);
}
```

Now the wrapper is clean:

```ts
readonly isCopyable = valueOrDefault(this.state().metadata(COPYABLE), false);

copy() {
  navigator.clipboard.writeText(String(this.state().value()));
  this.notifications.show('Copied to clipboard');
}
```

```html
@if (isCopyable()) {
  <button class="copy" (click)="copy()">📋</button>
}
```

---

## 7. Feature #2: `fillableByAi` 🤖

Let's take it a step further: a field that can **fill itself using AI**, powered by Chrome's built-in on-device model (the Prompt API).

The schema function receives a `LogicFn` that produces a **prompt**. If the prompt is non-empty, the wrapper displays a *"fill using AI"* button:

```ts
export const FILLABLE_BY_AI = createMetadataKey<string>();

export function fillableByAi<TValue>(
  path: SchemaPath<TValue>,
  promptLogic: LogicFn<TValue, string>
) {
  metadata(path, FILLABLE_BY_AI, promptLogic);
}
```

Usage — the prompt can even depend on other fields:

```ts
fillableByAi(path.bio, ({ valueOf }) =>
  `Write a short, friendly bio for a person named ${valueOf(path.firstName)}`);
```

### The AI plumbing

- An **AI service** wraps Chrome's in-browser model: you give it a prompt, it returns a `Promise<string>`.
- A **utility function** wraps the service in a `resource`: you give it a *writable signal* that holds the prompt, and it builds a resource that calls the service whenever the prompt changes.

```ts
export function aiValueResource(prompt: Signal<string | undefined>) {
  const ai = inject(AiService);
  return resource({
    params: () => prompt(),
    loader: ({ params }) => params ? ai.generate(params) : Promise.resolve(undefined),
  });
}
```

### In the field wrapper

```ts
// the trigger — undefined until the user clicks the button
readonly aiPrompt = signal<string | undefined>(undefined);
readonly fieldAiValue = aiValueResource(this.aiPrompt);

// the current prompt from the metadata
readonly fillPrompt = valueOrDefault(this.state().metadata(FILLABLE_BY_AI), '');

fillWithAi() {
  this.aiPrompt.set(this.fillPrompt());
}

constructor() {
  // when the resource returns a value — set it as the field value
  effect(() => {
    const value = this.fieldAiValue.value();
    if (value !== undefined) {
      this.state().value.set(value);
    }
  });
}
```

```html
@if (fieldAiValue.isLoading()) {
  <app-spinner />
} @else if (fillPrompt()) {
  <button (click)="fillWithAi()">✨ Fill with AI</button>
}
```

---

## 8. Tada! 🎉

With custom metadata we created **two custom field features** — `copyable` and `fillableByAi` — that are:

- **Declared once** in the schema, right next to the validation rules
- **Implemented once** in the field wrapper
- **Usable everywhere** in the application, with zero repeated HTML

### The recipe for any custom field feature

1. **Define** a unique, typed metadata key (`createMetadataKey<T>()`)
2. **Set** the metadata in a schema function (`metadata(path, KEY, logicFn)`)
3. **Read** it in the field wrapper (`state.metadata(KEY)` → a signal)
4. **Implement** the feature in the wrapper's template

That's it. Your fields now have superpowers. 🦸

---

## Running the Demo

```bash
npm install
ng serve
```

Open `http://localhost:4200/`.

> 💡 The AI feature requires a Chrome version with the built-in Prompt API (on-device model) enabled.
