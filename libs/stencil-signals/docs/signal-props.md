# useSignalProps

Bridge multiple `@Prop()` fields to signals in one call. Each signal stays in sync with its prop via `hostWillLoad` / `hostWillUpdate` — no `@Watch` needed.

**Import:** `@ssv/stencil-signals/extensions`

**Prerequisites:** `useSignalWatcher()` declared **above** this field ([signal-watcher.md](signal-watcher.md)).

**Example:** [timer](../../apps/stencil-playground/src/examples/stencil-signals/timer/).

## Usage

Pass the class constructor so TypeScript resolves the host type — `transform`'s `v` parameter is typed from the `@Prop` field:

```tsx
@Component({ tag: "app-timer", shadow: true })
export class AppTimer extends SsvElement {
  @Prop() duration = 60;
  @Prop({ reflect: true }) isRunning = false;

  @Event() isRunningChange!: EventEmitter<boolean>;

  readonly signalWatcher = useSignalWatcher();
  readonly $props = useSignalProps(AppTimer)({
    duration: { transform: v => Math.max(0, v) },
    isRunning: { twoWay: true },
  });

  render() {
    return (
      <div>
        <p>Remaining: {this.$props.duration()}s</p>
        <button type="button" onClick={() => this.$props.isRunning.set(true)}>
          Start
        </button>
      </div>
    );
  }
}
```

## One-way (read-only)

Omit `twoWay`; the result is a read-only `Signal<T>` that mirrors the prop:

```ts
readonly $props = useSignalProps(AppTimerCounter)({
  timeRemaining: {},
});

const mins = Math.floor(this.$props.timeRemaining() / 60);
```

## Two-way (writable + event)

Set `twoWay: true`; every `.set()` / `.update()` dispatches a `${propName}Change` `CustomEvent`:

```ts
readonly $props = useSignalProps(AppTimer)({
  isRunning: { twoWay: true },
});

this.$props.isRunning.set(true); // fires isRunningChange
```

Pair with `@Event()` so framework output targets generate correct bindings:

```ts
@Prop({ reflect: true }) isRunning = false;
@Event() isRunningChange!: EventEmitter<boolean>;
```

> [!NOTE]
> Config keys not on the component class are typed `never` at compile time.

## Options

| Option      | Type                 | Description                                         |
| ----------- | -------------------- | --------------------------------------------------- |
| `transform` | `(rawValue: T) => T` | Sanitise incoming prop before storing in the signal |
| `twoWay`    | `boolean`            | Emit `${propName}Change` on signal write            |
| `default`   | `T`                  | Fallback when prop is `null` / `undefined`          |
| `required`  | `boolean`            | Console error when prop missing on load             |
