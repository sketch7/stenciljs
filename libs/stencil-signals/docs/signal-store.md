# Signal store (`@ssv/stencil-signals/store`)

```ts
import { computed } from "@ssv/stencil-signals";
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from "@ssv/stencil-signals/store";

export const todoStore = signalStore(
  withState({ todos: [] as Todo[], nextId: 1 }),
  withComputed(s => ({
    completedCount: computed(() => s.todos().filter(t => t.completed).length),
  })),
  withMethods(s => ({
    add(text: string) {
      patchState(s, state => ({
        todos: [...state.todos, { id: state.nextId, text, completed: false }],
        nextId: state.nextId + 1,
      }));
    },
    toggle(id: number) {
      s.todos.update(items =>
        items.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)),
      );
    },
  })),
);
```

Read state and computed by invocation: `todoStore.todos()` and `todoStore.completedCount()`.

## Update and inspect state

```ts
import {
  getInitialState,
  getState,
  patchState,
} from "@ssv/stencil-signals/store";

patchState(todoStore, { nextId: 2 });
patchState(todoStore, s => ({ nextId: s.nextId + 1 }));
patchState(todoStore, fn1, fn2);

const snapshot = getState(todoStore);
patchState(todoStore, getInitialState(todoStore));
```

Use `patchState` for partial updates and updater functions.

## Watch state

`watchState` runs a callback immediately with the current state and again on every subsequent change. It integrates with the active owner scope, so when used as a class field it disposes automatically on host disconnect.

```ts
import { watchState } from "@ssv/stencil-signals/store";

// standalone — dispose manually
const { destroy } = watchState(todoStore, state => {
  localStorage.setItem("todos", JSON.stringify(state.todos));
});
```

```tsx
@Component({ tag: "my-comp", shadow: true })
export class MyComp extends SsvElement {
  readonly _ = this.setup(useSignalWatcher());

  // class field — disposed automatically on disconnect
  readonly _persist = watchState(todoStore, state => {
    localStorage.setItem("todos", JSON.stringify(state.todos));
  });
}
```

## Read-only public state

```ts
import {
  signalStore,
  withConfig,
  withMethods,
  withState,
} from "@ssv/stencil-signals/store";

export const counterStore = signalStore(
  withConfig({ isStateWritable: false }),
  withState({ count: 0 }),
  withMethods(s => ({
    inc: () => s.count.update(n => n + 1),
  })),
);
```

Use `withConfig({ isStateWritable: false })` to expose state as read-only signals outside the store.

## Reusable features

```ts
import { computed } from "@ssv/stencil-signals";
import {
  signalStore,
  signalStoreFeature,
  type,
  withComputed,
  withMethods,
  withState,
} from "@ssv/stencil-signals/store";

function withCounter() {
  return signalStoreFeature(
    withState({ count: 0 }),
    withMethods(s => ({
      increase: () => s.count.update(n => n + 1),
    })),
  );
}

function withDoubleCount() {
  return signalStoreFeature(
    type<{ state: { count: number } }>(),
    withComputed(s => ({
      double: computed(() => s.count() * 2),
    })),
  );
}

const store = signalStore(withCounter(), withDoubleCount());
```

Use `type<Input>()` when a feature depends on fields that another feature provides.

## API

| Export                             | Kind     | Purpose                                            |
| ---------------------------------- | -------- | -------------------------------------------------- |
| `signalStore(...features)`         | function | Compose a store from features                      |
| `signalStoreFeature(...features)`  | function | Bundle reusable features                           |
| `type<Input>()`                    | function | Declare feature input shape at type level          |
| `withState(initial)`               | function | Add writable state signals                         |
| `withComputed(store => ({ ... }))` | function | Add derived signals                                |
| `withMethods(store => ({ ... }))`  | function | Add methods                                        |
| `withConfig({ isStateWritable })`  | function | Set public state mutability                        |
| `patchState(store, ...updaters)`   | function | Apply batched partial and updater-function writes  |
| `getState(store)`                  | function | Read a plain, non-reactive state snapshot          |
| `getInitialState(store)`           | function | Read merged initial state for reset flows          |
| `watchState(store, watcher)`       | function | React to every state change; returns `{ dispose }` |
