# useSignalProps

Bridge multiple `@Prop()` fields to signals in one call. Each signal stays in sync with its prop via `hostWillLoad` / `hostWillUpdate` — no `@Watch` needed.

Import from the `/extensions` sub-path:

```ts
import { useSignalProps } from "@ssv/stencil-signals/extensions";
```

Declare `useSignalWatcher()` **before** this field. Prop signals are created on `hostConnected`; disposal is via the signal watcher's active-owner scope.

## Usage

Pass the class constructor so TypeScript resolves the host type — `transform`'s `v` parameter is then typed from the `@Prop` field:

```tsx
@Component({ tag: "app-timer", shadow: true })
export class AppTimer extends SsvElement {
  @Prop() duration = 60;
  @Prop({ reflect: true }) isRunning = false;

  @Event() isRunningChange!: EventEmitter<boolean>;

  readonly signalWatcher = useSignalWatcher();
  readonly $props = useSignalProps(AppTimer)({
    duration: { transform: v => Math.max(0, v) }, // v: number — Signal<number>
    isRunning: { twoWay: true }, // WritableSignal<boolean>
  });

  render() {
    return (
      <div>
        <p>Remaining: {this.$props.duration()}s</p>
        <button onClick={() => this.$props.isRunning.set(true)}>Start</button>
      </div>
    );
  }
}
```

## One-way (read-only)

Omit `twoWay`; the result is a read-only `Signal<T>` that mirrors the prop:

```ts
readonly $props = useSignalProps(AppTimerCounter)({
  timeRemaining: {}, // Signal<number> — auto-syncs on every render
});

const mins = Math.floor(this.$props.timeRemaining() / 60);
```

## Two-way (writable + event)

Set `twoWay: true`; every `.set()` / `.update()` dispatches a `${propName}Change` `CustomEvent`:

```ts
readonly $props = useSignalProps(AppTimer)({
  isRunning: { twoWay: true }, // WritableSignal<boolean>
});

this.$props.isRunning.set(true); // fires isRunningChange CustomEvent automatically
```

Pair with a Stencil `@Event()` so output targets (React, Vue, Angular) generate the correct event binding:

```ts
@Prop({ reflect: true }) isRunning = false;
@Event() isRunningChange!: EventEmitter<boolean>;
```

> [!NOTE]
> Typos in the config key are caught at compile time — a key not on the component class is typed `never`.

## Options

| Option      | Type                 | Description                                                       |
| ----------- | -------------------- | ----------------------------------------------------------------- |
| `transform` | `(rawValue: T) => T` | Sanitise the incoming prop value before storing in the signal     |
| `twoWay`    | `boolean`            | Emit `${propName}Change` on every signal write (two-way binding)  |
| `default`   | `T`                  | Fallback used when the prop value is `null` or `undefined`        |
| `required`  | `boolean`            | Log a console error when the prop is `null` / `undefined` on load |
