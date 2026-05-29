/** Raw TypeScript/TSX code snippets used in the overview presentation page. */
export const snippets = {
	hooksBefore: `// Vanilla Stencil — manage every lifecycle manually
@Component({ tag: 'my-tooltip', shadow: true })
export class MyTooltip {
  @State() private isVisible = false;
  private cleanup?: () => void;

  connectedCallback() {
    const handler = () => { this.isVisible = false; };
    document.addEventListener('click', handler);
    this.cleanup = () =>
      document.removeEventListener('click', handler);
  }

  disconnectedCallback() {
    this.cleanup?.();
  }
  render() { /* ... */ }
}`,

	hooksAfter: `// @ssv/stencil-core — composable, reusable, no boilerplate
function useClickOutside(onOutside: () => void) {
  useEffect(() => {
    const handler = () => onOutside();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);               // [] = run once on connect
}

@Component({ tag: 'my-tooltip', shadow: true })
export class MyTooltip extends SsvElement {
  @State() private isVisible = false;
  _ = useClickOutside(() => { this.isVisible = false; });
  render() { /* ... */ }
}`,

	mouseControllerBefore: `// Vanilla: boilerplate repeated per component
@Component({ tag: 'app-tracker', shadow: true })
export class AppTracker {
  @State() x = 0;
  @State() y = 0;

  connectedCallback() {
    globalThis.addEventListener('mousemove', this.#handler);
  }
  disconnectedCallback() {
    globalThis.removeEventListener('mousemove', this.#handler);
  }
  #handler = ({ clientX, clientY }: MouseEvent) => {
    this.x = clientX; this.y = clientY;
  };
  render() { return <span>{this.x},{this.y}</span>; }
}`,

	mouseControllerAfter: `// @ssv: extracted controller — zero boilerplate in component
function useMouseController() {
  return use(host => {
    let pos = { x: 0, y: 0 };
    const onMove = ({ clientX, clientY }: MouseEvent) => {
      pos = { x: clientX, y: clientY };
      host.requestUpdate();    // no @State needed
    };
    return {
      hooks: {
        hostConnected() { globalThis.addEventListener('mousemove', onMove); },
        hostDisconnected() { globalThis.removeEventListener('mousemove', onMove); },
      },
      value: { get pos() { return pos; } },
    };
  });
}

@Component({ tag: 'app-tracker', shadow: true })
export class AppTracker extends SsvElement {
  #mouse = useMouseController();   // ← reuse anywhere
  render() {
    const { x, y } = this.#mouse.pos;
    return <span>{x},{y}</span>;
  }
}`,

	contextBefore: `// Vanilla Stencil — manual event-based context
// Provider fires CustomEvent; consumers listen with @Listen.
// Fragile, no types, easy to miss disconnect cleanup.
@Component({ tag: 'ctx-provider', shadow: true })
export class CtxProvider {
  store = createStore();
  componentDidLoad() {
    this.el.addEventListener('ctx-request', e => {
      (e as any).detail.resolve(this.store);
    });
  }
  render() { return <slot />; }
}

@Component({ tag: 'ctx-consumer', shadow: true })
export class CtxConsumer {
  store: Store | null = null;
  connectedCallback() {
    const event = new CustomEvent('ctx-request', {
      detail: { resolve: (s: Store) => { this.store = s; } },
      bubbles: true, composed: true,
    });
    this.el.dispatchEvent(event);
  }
  render() { return <div>{this.store?.count}</div>; }
}`,

	contextAfter: `// @ssv/stencil-core — typed, tree-scoped, one line each
export const CounterContext =
  createContext<CounterStore>(() => createCounterStore(), { name: 'counter' });

// Provider — one line
@Component({ tag: 'ctx-provider', shadow: true })
export class CtxProvider extends SsvElement {
  readonly store = provideContext(CounterContext);
  render() { return <slot />; }
}

// Consumer — reactive hook, no lifecycle noise
@Component({ tag: 'ctx-consumer', shadow: true })
export class CtxConsumer extends SsvElement {
  readonly #c = useCounter();   // hook wraps useContext internally
  render() { return <div>{this.#c.count}</div>; }
}`,

	transferBefore: `// Vanilla Stencil — duplicate fetch on client, no built-in serialization
@Component({ tag: 'my-data', shadow: true })
export class MyData {
  @State() data: Item[] | null = null;

  async componentWillLoad() {
    // runs on server AND client → duplicate fetch
    this.data = await fetchItems();
  }
  render() { return <ul>{this.data?.map(...)}</ul>; }
}`,

	transferAfter: `// @ssv/stencil-core/transfer-state — server fetches once, client rehydrates
const ITEMS_KEY = makeTransferKey<Item[]>('items');

@Component({ tag: 'my-data', shadow: true })
export class MyData extends SsvElement {
  readonly #ts = provideTransferState('my-data');

  @State() data: Item[] | null = null;

  async componentWillLoad() {
    // server: fetches and stores; client: reads serialized value
    this.data = await this.#ts.transfer(ITEMS_KEY, fetchItems) ?? null;
  }

  render() {
    return <>
      {this.#ts.toScriptElement()}   {/* serializes into shadow DOM */}
      <ul>{this.data?.map(...)}</ul>
    </>;
  }
}`,

	signalsBefore: `// Vanilla Stencil — @State on every component, prop drilling
@Component({ tag: 'app-counter', shadow: true })
export class AppCounter {
  @State() count = 0;
  @State() extra = 0;

  // doubled & total must be recomputed in render()
  render() {
    const doubled = this.extra * 2;
    const total = this.count + doubled;
    return (
      <div>
        <span>{total}</span>
        <button onClick={() => this.count++}>+</button>
      </div>
    );
  }
}`,

	signalsAfter: `// @ssv/stencil-signals — fine-grained, shared, no prop drilling
const count = signal(0);
const extra = signal(0);
const doubled = computed(() => extra() * 2);
const total = computed(() => count() + doubled());

@Component({ tag: 'app-counter', shadow: true })
export class AppCounter extends SsvElement {
  readonly _w = useSignalWatcher();   // tracks signals read in render()

  render() {
    return (
      <div>
        <span>{total()}</span>         {/* auto-tracked */}
        <button onClick={() => count.update(c => c + 1)}>+</button>
      </div>
    );
  }
}
// Any other component reads count() / total() and also re-renders.`,

	signalStoreBefore: `// Vanilla: scattered @State, manual sync
@Component({ tag: 'user-card', shadow: true })
export class UserCard {
  @State() name = '';
  @State() role = '';
  // name & role duplicated across every component
}`,

	signalStoreAfter: `// @ssv/stencil-signals signalStore — composable, zero boilerplate
const userStore = signalStore(
  withState({ name: '', role: '' }),
  withComputed(state => ({
    fullLabel: computed(() => \`\${state.name} (\${state.role})\`)
  })),
);

// Every component that reads userStore.name re-renders on change
@Component({ tag: 'user-card', shadow: true })
export class UserCard extends SsvElement {
  readonly _w = useSignalWatcher();
  render() { return <span>{userStore.fullLabel}</span>; }
}`,

	composeBefore: `// Vanilla Stencil — hard-coded if/switch per host
@Component({ tag: 'app-widget-host', shadow: true })
export class AppWidgetHost {
  @Prop() type: 'timer' | 'counter' | 'chart' = 'timer';
  render() {
    // grows with every new widget type
    if (this.type === 'timer') return <app-timer />;
    if (this.type === 'counter') return <app-counter />;
    if (this.type === 'chart') return <app-chart />;
    return null;
  }
}`,

	composeAfter: `// @ssv/stencil-ui — registry-driven, extensible without touching the host
export const registry = createCompositionDefs({
  timer:   { tag: 'app-timer',   aliases: ['countdown'] },
  counter: { tag: 'app-counter' },
  chart:   { tag: 'app-chart' },
  // add new types here; no component code changes
});

@Component({ tag: 'app-widget-host', shadow: true })
export class AppWidgetHost extends SsvElement {
  readonly reg = provideCompositionRegistry(registry);
  @Prop() type = 'timer';
  render() {
    return <ssv-compose name={this.type} props={this.widgetProps} />;
  }
}`,

	tanstackStoreBefore: `// Vanilla @stencil/store — reactive but no selectors, no computed atoms
import { createStore } from '@stencil/store';
const { state } = createStore({ count: 0, items: [] });
// Component re-renders on ANY state key change, not just count
@Component({ tag: 'app-counter', shadow: true })
export class AppCounter {
  render() { return <span>{state.count}</span>; }
}`,

	tanstackStoreAfter: `// @ssv/tanstack.stencil-store — TanStack Store with Stencil hooks
const countAtom = createAtom(0);
const extraAtom = createAtom(0);
const totalAtom = createAtom(() => countAtom.get() + extraAtom.get());

@Component({ tag: 'app-counter', shadow: true })
export class AppCounter extends SsvElement {
  readonly #count = useAtom(() => countAtom);     // re-renders on count change
  readonly #total = useSelector(() => totalAtom); // derived, granular updates

  render() {
    return (
      <div>
        <span>{this.#count.value}</span>
        <span>total: {this.#total()}</span>
        <button onClick={() => this.#count.set(v => v + 1)}>+</button>
      </div>
    );
  }
}`,

	tanstackQueryBefore: `// Vanilla Stencil — manual loading/error state, no caching
@Component({ tag: 'app-posts', shadow: true })
export class AppPosts {
  @State() posts: Post[] = [];
  @State() loading = true;
  @State() error: string | null = null;

  async componentWillLoad() {
    try {
      this.posts = await fetchPosts();
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }
  // No caching, no retry, no background refresh
  render() { /* ... */ }
}`,

	tanstackQueryAfter: `// @ssv/tanstack.stencil-query — full TanStack Query in a hook
export function usePosts(queryClient?: QueryClient) {
  const client = useQueryClient(queryClient);
  use({ async hostWillLoad() {
    // prefetch on server; client reads from cache (no duplicate fetch)
    await client.current?.prefetchQuery({ queryKey, queryFn: fetchPosts, staleTime });
  }});

  const postsRef = useQuery(() => ({ queryKey, staleTime, queryFn: fetchPosts }), queryClient);
  const createPost = useMutation(() => ({ mutationFn: apiCreatePost }), queryClient);
  return { posts: postsRef(), create: createPost() };
}

@Component({ tag: 'app-posts', shadow: true })
export class AppPosts extends SsvElement {
  readonly #ts = provideTransferState('posts');
  readonly #qc = provideQueryClient({ withHydration: this.#ts });
  readonly #api = usePosts(this.#qc);

  render() {
    const { data, isPending, isError } = this.#api.posts;
    // caching, retry, devtools, SSR hydration — all included
    return <ul>{data?.map(...)}</ul>;
  }
}`,

	translationsHook: `// translations.api.ts — composable hook shared across components
export function useTranslations(queryClient?: QueryClient) {
  const client = useQueryClient(queryClient);
  use({
    async hostWillLoad() {
      await client.current?.prefetchQuery({
        queryKey: ['translations'],
        queryFn: fetchTranslations,
        staleTime: Infinity,   // fetched once, cached forever
      });
    },
  });
  const ref = useQuery(
    () => ({ queryKey: ['translations'], staleTime: Infinity, queryFn: fetchTranslations }),
    queryClient,
  );
  function tr(key: string, params?: Record<string, string>): string {
    const map = ref().data ?? {};
    let value = map[key] ?? key;
    if (params) {
      value = value.replaceAll(/\\{\\{(\\w+)\\}\\}/gu, (_, p) => params[p] ?? \`{{\${p}}}\`);
    }
    return value;
  }
  return { get query() { return ref(); }, tr };
}`,

	translationsUsage: `// translation-shell.tsx — consume with one line
@Component({ tag: 'app-translation-shell', shadow: true })
export class AppTranslationShell extends SsvElement {
  readonly #tr = useTranslations();   // ← hook reused across all components

  render() {
    const { tr } = this.#tr;
    return (
      <nav>
        <li>{tr('nav.dashboard')}</li>
        <li>{tr('nav.profile')}</li>
        <li>{tr('nav.settings')}</li>
      </nav>
    );
  }
}`,
} as const;

export type SnippetKey = keyof typeof snippets;
