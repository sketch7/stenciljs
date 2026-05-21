import type { JSX } from "react";

// ── Reusable primitives ────────────────────────────────────────────────────────

function Badge({
	label,
	variant = "default",
}: {
	label: string;
	variant?: "default" | "success" | "warning" | "info";
}): JSX.Element {
	const cls = {
		default: "bg-slate-800 text-slate-300 border-slate-700",
		success: "bg-emerald-950 text-emerald-300 border-emerald-800",
		warning: "bg-amber-950 text-amber-300 border-amber-800",
		info: "bg-indigo-950 text-indigo-300 border-indigo-800",
	}[variant];
	return (
		<span
			className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[0.65rem] font-medium tracking-wide ${cls}`}>
			{label}
		</span>
	);
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }): JSX.Element {
	return (
		<h2 id={id} className="flex scroll-mt-6 items-center gap-2 text-xl font-bold text-(--color-fg)">
			<a href={`#${id}`} className="text-sm text-(--color-primary) opacity-40 transition-opacity hover:opacity-80">
				#
			</a>
			{children}
		</h2>
	);
}

function SubHeading({ id, children }: { id: string; children: React.ReactNode }): JSX.Element {
	return (
		<h3 id={id} className="mt-6 mb-2 flex scroll-mt-6 items-center gap-2 text-base font-semibold text-(--color-fg)">
			<a href={`#${id}`} className="text-xs text-(--color-primary) opacity-40 transition-opacity hover:opacity-70">
				#
			</a>
			{children}
		</h3>
	);
}

function CodeBlock({ code, lang = "ts" }: { code: string; lang?: string }): JSX.Element {
	return (
		<pre
			className={`language-${lang} overflow-x-auto rounded-lg border border-(--color-border) bg-[#0b1523] p-4 text-xs leading-relaxed`}>
			<code dangerouslySetInnerHTML={{ __html: code }} />
		</pre>
	);
}

function BeforeAfter({
	before,
	after,
	beforeLabel = "Before (vanilla Stencil)",
	afterLabel = "After (@ssv)",
}: {
	before: string;
	after: string;
	beforeLabel?: string;
	afterLabel?: string;
}): JSX.Element {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<div className="flex flex-col gap-1.5">
				<span className="text-[0.65rem] font-semibold tracking-widest text-rose-400 uppercase">{beforeLabel}</span>
				<pre className="overflow-x-auto rounded-lg border border-rose-900/40 bg-rose-950/20 p-3 text-xs leading-relaxed text-rose-100">
					<code>{before}</code>
				</pre>
			</div>
			<div className="flex flex-col gap-1.5">
				<span className="text-[0.65rem] font-semibold tracking-widest text-emerald-400 uppercase">{afterLabel}</span>
				<pre className="overflow-x-auto rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-xs leading-relaxed text-emerald-100">
					<code>{after}</code>
				</pre>
			</div>
		</div>
	);
}

function FeatureCard({
	title,
	desc,
	badge,
	href,
}: {
	title: string;
	desc: string;
	badge?: string;
	href?: string;
}): JSX.Element {
	const inner = (
		<div className="group flex flex-col gap-1.5 rounded-xl border border-(--color-card-border) bg-(--color-card) p-4 transition-colors hover:border-(--color-border-hover)">
			<div className="flex items-start justify-between gap-2">
				<span className="text-sm font-semibold text-(--color-fg)">{title}</span>
				{badge && <Badge label={badge} variant="info" />}
			</div>
			<p className="text-xs leading-relaxed text-(--color-muted-fg)">{desc}</p>
		</div>
	);
	return href ? <a href={href}>{inner}</a> : inner;
}

function Callout({
	type = "info",
	children,
}: {
	type?: "info" | "tip" | "warning";
	children: React.ReactNode;
}): JSX.Element {
	const styles = {
		info: "border-indigo-800 bg-indigo-950/30 text-indigo-200",
		tip: "border-emerald-800 bg-emerald-950/30 text-emerald-200",
		warning: "border-amber-800 bg-amber-950/30 text-amber-200",
	}[type];
	const icon = { info: "ℹ", tip: "✓", warning: "⚠" }[type];
	return (
		<div className={`flex gap-2 rounded-lg border px-4 py-3 text-xs leading-relaxed ${styles}`}>
			<span className="mt-px shrink-0 opacity-70">{icon}</span>
			<div>{children}</div>
		</div>
	);
}

// ── Table of contents ──────────────────────────────────────────────────────────

const tocItems = [
	{ id: "motivation", label: "Motivation" },
	{ id: "vs-vanilla", label: "Stencil vs @ssv" },
	{ id: "core", label: "Core — hooks, context, transfer state" },
	{ id: "signals", label: "Signals" },
	{ id: "stencil-ui", label: "UI — compose" },
	{ id: "tanstack", label: "TanStack store & query" },
	{ id: "demo-translations", label: "Demo — translations" },
	{ id: "principles", label: "Design principles" },
	{ id: "qa", label: "Q & A" },
];

function Toc(): JSX.Element {
	return (
		<nav
			aria-label="Table of contents"
			className="not-prose rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
			<p className="mb-2 text-[0.6rem] font-semibold tracking-widest text-(--color-muted-fg) uppercase">Contents</p>
			<ol className="flex flex-col gap-1">
				{tocItems.map((item, i) => (
					<li key={item.id}>
						<a
							href={`#${item.id}`}
							className="flex gap-2 text-xs text-(--color-muted-fg) transition-colors hover:text-(--color-primary)">
							<span className="w-4 shrink-0 text-right opacity-40">{i + 1}.</span>
							{item.label}
						</a>
					</li>
				))}
			</ol>
		</nav>
	);
}

// ── Code snippets ──────────────────────────────────────────────────────────────

const snippets = {
	// hooks — before/after
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
	hooksAfter: `// @ssv/stencil.core — composable, reusable, no boilerplate
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

	// context before/after
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
	contextAfter: `// @ssv/stencil.core — typed, tree-scoped, one line each
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

	// transfer state
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
	transferAfter: `// @ssv/stencil.core/transfer-state — server fetches once, client rehydrates
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

	// Signals
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

	// Signal store
	signalStoreBefore: `// Vanilla: scattered @State, manual sync
@Component({ tag: 'user-card', shadow: true })
export class UserCard {
  @State() name = '';
  @State() role = '';
  // name & role duplicated across every component
}`,
	signalStoreAfter: `// @ssv/stencil-signals createStore — reactive proxy, zero boilerplate
const userStore = createStore(
  { name: '', role: '' },
  state => ({
    fullLabel: computed(() => \`\${state.name} (\${state.role})\`)
  })
);

// Every component that reads userStore.name re-renders on change
@Component({ tag: 'user-card', shadow: true })
export class UserCard extends SsvElement {
  readonly _w = useSignalWatcher();
  render() { return <span>{userStore.fullLabel}</span>; }
}`,

	// Compose
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

	// TanStack Store
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

	// TanStack Query
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

	// Translations demo
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
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-12 pb-16">
			{/* ── Hero ── */}
			<section className="flex flex-col gap-4">
				<div className="flex flex-wrap items-center gap-2">
					<Badge label="INTERNAL" variant="warning" />
					<Badge label="TEAM PRESENTATION" />
					<Badge label="2026" variant="info" />
				</div>
				<h1 className="text-4xl leading-tight font-extrabold tracking-tight text-(--color-fg)">
					<span className="text-(--color-primary)">@ssv / stencil</span>
					<br />
					<span className="text-2xl font-bold text-(--color-muted-fg)">
						Filling the gaps in StencilJS for building real apps
					</span>
				</h1>
				<p className="max-w-2xl text-sm leading-relaxed text-(--color-muted-fg)">
					StencilJS is excellent at building UI components — but building <em>applications</em> requires more. State
					management, side effects, context, SSR hydration, async data… none of these have first-class answers in
					vanilla Stencil. This library brings familiar React-like primitives to Stencil without locking you in.
				</p>
				<Toc />
			</section>

			{/* ── Motivation ── */}
			<section className="flex flex-col gap-4" id="motivation">
				<SectionHeading id="motivation">Motivation</SectionHeading>
				<div className="grid gap-3 sm:grid-cols-2">
					<FeatureCard
						title="Stencil is good for UI components"
						desc="Rendering, slots, CSS isolation, output targets — Stencil handles these well out of the box."
						badge="out-of-box"
					/>
					<FeatureCard
						title="Apps need more primitives"
						desc="Shared state, tree context, side effects with cleanup, SSR state transfer, async data — all missing."
						badge="gap"
					/>
					<FeatureCard
						title="Familiar React-like APIs"
						desc="useEffect, signals, context, query — easier onboarding, less lock-in, transferable mental model."
						badge="developer ux"
					/>
					<FeatureCard
						title="Gradual adoption"
						desc="Each library is independent. Add what you need, when you need it — no big-bang rewrite required."
						badge="modular"
					/>
				</div>

				<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-5">
					<p className="mb-3 text-xs font-semibold tracking-widest text-(--color-muted-fg) uppercase">
						Architecture at a glance
					</p>
					<pre className="overflow-x-auto text-[0.65rem] leading-relaxed text-slate-300">
						{`
┌─────────────────────────────────────────────────────────────────────────┐
│                         Application layer                               │
│   @ssv/tanstack.stencil-query   @ssv/tanstack.stencil-store             │
│   @ssv/stencil-signals          @ssv/stencil-ui                         │
├─────────────────────────────────────────────────────────────────────────┤
│                     Foundation (@ssv/stencil.core)                      │
│   ReactiveController  ·  use() / useEffect()  ·  context  ·  transfer  │
├─────────────────────────────────────────────────────────────────────────┤
│                         @stencil/core (peer)                            │
└─────────────────────────────────────────────────────────────────────────┘
`.trim()}
					</pre>
				</div>

				<Callout type="tip">
					Every package is <strong>optional</strong> and independently versioned. Use only what your project needs.
				</Callout>
			</section>

			{/* ── Stencil vs @ssv ── */}
			<section className="flex flex-col gap-6" id="vs-vanilla">
				<SectionHeading id="vs-vanilla">Stencil vs @ssv — Why bother?</SectionHeading>
				<p className="text-sm text-(--color-muted-fg)">
					These side-by-side comparisons show the concrete difference for each concern. Vanilla Stencil on the left,
					@ssv abstractions on the right.
				</p>

				<SubHeading id="vs-side-effects">Side effects &amp; cleanup</SubHeading>
				<BeforeAfter before={snippets.hooksBefore} after={snippets.hooksAfter} />

				<SubHeading id="vs-context">Tree-scoped context</SubHeading>
				<BeforeAfter before={snippets.contextBefore} after={snippets.contextAfter} />

				<SubHeading id="vs-transfer">SSR transfer state</SubHeading>
				<BeforeAfter before={snippets.transferBefore} after={snippets.transferAfter} />
			</section>

			{/* ── Core ── */}
			<section className="flex flex-col gap-6" id="core">
				<SectionHeading id="core">
					<code className="text-base">@ssv/stencil.core</code>
					<Badge label="foundation" variant="info" />
				</SectionHeading>
				<p className="text-sm text-(--color-muted-fg)">
					The foundation everything else builds on. Reactive controller host, composable hooks, tree context, and SSR
					transfer state.
				</p>

				{/* Hooks */}
				<SubHeading id="core-hooks">
					Hooks — <code>use()</code>, <code>useEffect()</code>, <code>useLoadEffect()</code>
				</SubHeading>
				<p className="text-xs text-(--color-muted-fg)">
					<code>use()</code> is the core primitive: register a <code>ReactiveController</code> from a factory function
					that receives the host. <code>useEffect</code> mirrors React — no deps = every render, <code>[]</code> = once
					on connect. <code>useLoadEffect</code> runs in <code>hostWillLoad</code> where context is guaranteed resolved.
				</p>
				<BeforeAfter before={snippets.mouseControllerBefore} after={snippets.mouseControllerAfter} />
				<Callout type="tip">
					<strong>Controller pattern:</strong> extract any behaviour into a <code>use*()</code> factory, test it in
					isolation with <code>TestHost</code>, and reuse across components — no copy-pasting lifecycle boilerplate.
				</Callout>

				{/* Context */}
				<SubHeading id="core-context">
					Context — <code>createContext</code> / <code>provideContext</code> / <code>useContext</code>
				</SubHeading>
				<p className="text-xs text-(--color-muted-fg)">
					Tree-scoped context backed by DOM event bubbling. Typed, composable into hooks, with a default factory
					fallback. Works during SSR. No need for global singletons.
				</p>
				<div className="grid gap-3 sm:grid-cols-3">
					<FeatureCard
						title="createContext<T>()"
						desc="Creates a typed token. Accepts an optional default factory used when no provider ancestor is found."
					/>
					<FeatureCard
						title="provideContext()"
						desc="Called in a component's field initializer. Returns a Ref<T> to the provided value."
					/>
					<FeatureCard
						title="useContext()"
						desc="Resolves the nearest provider. Re-tries after providers that connect later (async-safe)."
					/>
				</div>
				<a
					href="/ssv-stencil/core/context/counter"
					className="inline-flex items-center gap-1 text-xs text-(--color-primary) hover:underline">
					→ Live demo: Counter with context
				</a>

				{/* Transfer State */}
				<SubHeading id="core-transfer">Transfer State — SSR → client without duplicate fetches</SubHeading>
				<p className="text-xs text-(--color-muted-fg)">
					Serializes arbitrary data into a <code>&lt;script type="application/json"&gt;</code> element placed inside the
					shadow DOM, then reads it back on the client. Works with Stencil's Declarative Shadow DOM hydration.
				</p>
				<div className="grid gap-3 sm:grid-cols-2">
					<FeatureCard
						title="provideTransferState(id)"
						desc="Opens a named serialization scope in the component. Returns a TransferState API."
					/>
					<FeatureCard
						title="ts.transfer(key, getValue)"
						desc="Server: calls getValue() and stores the result. Client: reads serialized value. One call, both environments."
					/>
					<FeatureCard
						title="ts.toScriptElement()"
						desc="Returns the <script> VNode to include in render(). Server-only; returns null on the client."
					/>
					<FeatureCard
						title="useTransferState()"
						desc="Consumer API — reads values from the nearest provideTransferState() ancestor."
					/>
				</div>
				<a
					href="/ssv-stencil/core/transfer-state"
					className="inline-flex items-center gap-1 text-xs text-(--color-primary) hover:underline">
					→ Live demo: Transfer State
				</a>
			</section>

			{/* ── Signals ── */}
			<section className="flex flex-col gap-6" id="signals">
				<SectionHeading id="signals">
					<code className="text-base">@ssv/stencil-signals</code>
					<Badge label="fine-grained reactivity" variant="info" />
				</SectionHeading>
				<p className="text-sm text-(--color-muted-fg)">
					TC39 / Preact Signals adapter for StencilJS. Auto-tracks <code>render()</code>, lifecycle-bound effects, and
					Stencil-native prop/event bridges. Drop-in replacement for scatter-shot <code>@State</code>.
				</p>

				<SubHeading id="signals-core">Core signals</SubHeading>
				<BeforeAfter before={snippets.signalsBefore} after={snippets.signalsAfter} />

				<SubHeading id="signals-store">Signal store</SubHeading>
				<p className="text-xs text-(--color-muted-fg)">
					<code>createStore()</code> wraps a plain object in per-key signals exposed as a reactive Proxy. Computed
					properties via a factory. <code>$reset()</code> built in.
				</p>
				<BeforeAfter before={snippets.signalStoreBefore} after={snippets.signalStoreAfter} />

				<SubHeading id="signals-extensions">Extensions &amp; utilities</SubHeading>
				<div className="grid gap-3 sm:grid-cols-2">
					<FeatureCard
						title="effect(fn)"
						desc="Host-bound effect — registered in hostConnected, disposed in hostDisconnected. AbortSignal for cleanup."
						href="/stencil-signals/counter"
					/>
					<FeatureCard
						title="derivedAsync(fn)"
						desc="Async computed signal with AbortSignal switch semantics. Re-runs when dependencies change, cancels in-flight requests. Perfect for data fetching."
						href="/stencil-signals/derived-async"
					/>
					<FeatureCard
						title="computedPrevious(signal)"
						desc="Returns a signal holding the previous value of another signal — useful for animations or diffs."
						href="/stencil-signals/computed-previous"
					/>
					<FeatureCard
						title="signalFromEvent(el, event)"
						desc="Creates a WritableSignal that stays in sync with a DOM event — e.g. window resize, input value."
						href="/stencil-signals/mouse-event"
					/>
					<FeatureCard
						title="useSignalProps()"
						desc="Bridges @Prop() values into signals with optional transform, required validation, and two-way binding."
					/>
					<FeatureCard
						title="useSignalWatcher()"
						desc="Controller that wraps render() in a tracked computed — any signal read during render auto-subscribes."
					/>
				</div>

				<Callout type="info">
					<strong>Backend agnostic:</strong> register <code>@ssv/stencil-signals/tc39</code> (signal-polyfill){" "}
					<em>or</em> <code>@ssv/stencil-signals/preact</code> (@preact/signals-core) once in <code>globalScript</code>.
					The rest of the API is identical.
				</Callout>
			</section>

			{/* ── Stencil UI ── */}
			<section className="flex flex-col gap-6" id="stencil-ui">
				<SectionHeading id="stencil-ui">
					<code className="text-base">@ssv/stencil-ui</code>
					<Badge label="dynamic composition" variant="info" />
				</SectionHeading>
				<p className="text-sm text-(--color-muted-fg)">
					Registry-driven UI composition. A single <code>&lt;ssv-compose&gt;</code> component dispatches to named
					component variants looked up in a scoped registry — eliminating hard-coded <code>if/switch</code> chains.
				</p>

				<BeforeAfter before={snippets.composeBefore} after={snippets.composeAfter} />

				<div className="grid gap-3 sm:grid-cols-2">
					<FeatureCard
						title="createCompositionDefs()"
						desc="Define a typed map of name → tag + aliases. Type-safe CompositionNameOf helper included."
					/>
					<FeatureCard
						title="provideCompositionRegistry()"
						desc="Registers definitions into a scoped context. Different subtrees can have different registries."
					/>
					<FeatureCard
						title="<ssv-compose name props />"
						desc="Resolves the name in the nearest registry and renders the matching component. Error slot for unknown names."
					/>
					<FeatureCard
						title="Event forwarding"
						desc="composeEvent normalizes child events — consumers get a unified ComposeEventDetail regardless of widget type."
					/>
				</div>

				<Callout type="tip">
					<strong>Use cases:</strong> dynamic dashboards, plugin slots, CMS-driven layouts, form fields driven by a
					schema, feature-flag-switched components — anywhere the component type is determined at runtime.
				</Callout>

				<a
					href="/stencil-ui/compose"
					className="inline-flex items-center gap-1 text-xs text-(--color-primary) hover:underline">
					→ Live demo: Compose
				</a>
			</section>

			{/* ── TanStack ── */}
			<section className="flex flex-col gap-6" id="tanstack">
				<SectionHeading id="tanstack">
					TanStack integrations
					<Badge label="store + query" variant="info" />
				</SectionHeading>
				<p className="text-sm text-(--color-muted-fg)">
					Stencil bindings for TanStack Store and TanStack Query — battle-tested libraries that are now first-class in
					Stencil components via <code>use*()</code> hooks.
				</p>

				<SubHeading id="tanstack-store">@ssv/tanstack.stencil-store</SubHeading>
				<p className="text-xs text-(--color-muted-fg)">
					<code>useAtom()</code> and <code>useSelector()</code> — granular subscriptions that re-render only when the
					selected slice changes. <code>createAtom()</code> for standalone atoms; <code>createStore()</code> from{" "}
					<code>@tanstack/store</code> for structured state with actions.
				</p>
				<BeforeAfter
					before={snippets.tanstackStoreBefore}
					after={snippets.tanstackStoreAfter}
					beforeLabel="Before (@stencil/store)"
					afterLabel="After (@ssv/tanstack.stencil-store)"
				/>
				<a
					href="/ssv-stencil/ts-store/counter"
					className="inline-flex items-center gap-1 text-xs text-(--color-primary) hover:underline">
					→ Live demo: TanStack Store counter
				</a>

				<SubHeading id="tanstack-query">@ssv/tanstack.stencil-query</SubHeading>
				<p className="text-xs text-(--color-muted-fg)">
					Full TanStack Query in a Stencil hook: caching, background refetch, mutations, devtools, and{" "}
					<strong>SSR hydration</strong> via <code>provideTransferState</code>. No duplicate server fetches.
				</p>
				<BeforeAfter before={snippets.tanstackQueryBefore} after={snippets.tanstackQueryAfter} />
				<a
					href="/ssv-stencil/ts-query/posts"
					className="inline-flex items-center gap-1 text-xs text-(--color-primary) hover:underline">
					→ Live demo: TanStack Query posts
				</a>
			</section>

			{/* ── Demo: translations ── */}
			<section className="flex flex-col gap-6" id="demo-translations">
				<SectionHeading id="demo-translations">
					Demo — i18n translations
					<Badge label="real-world POC" variant="success" />
				</SectionHeading>
				<p className="text-sm text-(--color-muted-fg)">
					A production-style translation system built from the primitives above: TanStack Query for fetching and
					caching, transfer state for SSR, composable hook for reuse across components.
				</p>

				<div className="flex flex-col gap-4 rounded-xl border border-(--color-card-border) bg-(--color-card) p-5">
					<p className="text-xs text-(--color-muted-fg)">How it fits together:</p>
					<pre className="text-[0.65rem] leading-loose text-slate-300">
						{`
useTranslations() hook
   └─ useQueryClient()           → resolves QueryClient from context
   └─ use({ hostWillLoad })      → prefetches translations server-side
   └─ useQuery(...)              → caches, returns Ref<QueryResult>
   └─ tr(key, params)            → resolves key from data, interpolates {{params}}

AppTranslationShell
   └─ useTranslations()          → one line
   └─ render()                   → tr('nav.dashboard') etc.

AppTranslationProfile
   └─ useTranslations()          → same hook, different component — shared cache
`.trim()}
					</pre>
				</div>

				<SubHeading id="demo-translations-code">Hook implementation</SubHeading>
				<pre className="overflow-x-auto rounded-lg border border-(--color-border) bg-[#0b1523] p-4 text-xs leading-relaxed">
					<code>{snippets.translationsHook}</code>
				</pre>

				<SubHeading id="demo-translations-usage">Component usage</SubHeading>
				<pre className="overflow-x-auto rounded-lg border border-(--color-border) bg-[#0b1523] p-4 text-xs leading-relaxed">
					<code>{snippets.translationsUsage}</code>
				</pre>

				<a
					href="/ssv-stencil/translations"
					className="inline-flex items-center gap-1 text-xs text-(--color-primary) hover:underline">
					→ Live demo: Translations
				</a>
			</section>

			{/* ── Design principles ── */}
			<section className="flex flex-col gap-6" id="principles">
				<SectionHeading id="principles">Design principles</SectionHeading>

				<div className="grid gap-3 sm:grid-cols-2">
					<FeatureCard
						title="Treeshakeable & modular"
						desc="Each package is a separate npm install. Import only what you need — the rest is dead-code eliminated."
						badge="optional"
					/>
					<FeatureCard
						title="SSR / hydration first"
						desc="Every primitive is tested against Stencil's hydrate bundle. Transfer state, context, and signals all work server-side."
						badge="SSR ready"
					/>
					<FeatureCard
						title="Gradual adoption"
						desc="Add @ssv/stencil.core first, then signals or query as needed. Nothing forces a big-bang rewrite."
						badge="low risk"
					/>
					<FeatureCard
						title="Familiar APIs"
						desc="useEffect, context, signals, query — patterns borrowed from React so the team can onboard quickly."
						badge="developer ux"
					/>
					<FeatureCard
						title="Documented"
						desc="Each library ships a README with API table, examples, and links to working playground demos."
						badge="docs"
					/>
					<FeatureCard
						title="Tested"
						desc="Unit tests via Vitest with TestHost for controller/hook isolation. Integration tests in the playground via SSR."
						badge="quality"
					/>
				</div>

				<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-5">
					<p className="mb-3 text-xs font-semibold tracking-widest text-(--color-muted-fg) uppercase">
						Dependency graph
					</p>
					<pre className="text-[0.65rem] leading-loose text-slate-300">
						{`
@ssv/tanstack.stencil-query  ──┐
@ssv/tanstack.stencil-store  ──┤
@ssv/stencil-signals         ──┤──▶  @ssv/stencil.core  ──▶  @stencil/core
@ssv/stencil-ui              ──┘
`.trim()}
					</pre>
					<p className="mt-3 text-xs text-(--color-muted-fg)">
						All higher-level packages depend only on <code>@ssv/stencil.core</code> and <code>@stencil/core</code>. No
						circular dependencies. Each can be updated independently.
					</p>
				</div>
			</section>

			{/* ── Q&A ── */}
			<section className="flex flex-col gap-6" id="qa">
				<SectionHeading id="qa">Questions &amp; Concerns</SectionHeading>

				<div className="flex flex-col gap-3">
					{[
						{
							q: "Do we have to switch everything at once?",
							a: "No. Each library is independent. Start with useEffect / use() from @ssv/stencil.core in one component. Add signals or query later. No breaking changes to existing components.",
						},
						{
							q: "Does it work with existing @State / @Prop components?",
							a: "Yes. SsvElement extends HTMLElement (or a stub in SSR). You can mix @State decorators and use() hooks in the same component.",
						},
						{
							q: "Signal backend: TC39 vs Preact — which should we pick?",
							a: "TC39 (signal-polyfill) is recommended for standards alignment. Use Preact if the org already uses @preact/signals-core elsewhere. Pick one; mixing is unsupported.",
						},
						{
							q: "What's the bundle cost?",
							a: "@ssv/stencil.core is tiny (ReactiveController, context, hooks). Signals and TanStack bindings add their respective peer libraries. Everything is treeshakeable — unused APIs are eliminated.",
						},
						{
							q: "Is SSR/hydration production-tested?",
							a: "The vike-playground runs full Stencil SSR via @stencil/ssr with Vike. Transfer state, context, signals, and TanStack Query are all exercised end-to-end. Automated tests cover the core primitives.",
						},
						{
							q: "Can we contribute or extend this?",
							a: "Yes. The monorepo is structured as vertical slices. Add a new controller or extension in the appropriate lib, write a Vitest spec, and add a playground page for the demo.",
						},
					].map(({ q, a }) => (
						<details
							key={q}
							className="group rounded-xl border border-(--color-card-border) bg-(--color-card) p-4 transition-colors open:border-(--color-border-hover)">
							<summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-(--color-fg)">
								{q}
								<span className="text-xs text-(--color-muted-fg) transition-transform group-open:rotate-180">▾</span>
							</summary>
							<p className="mt-3 text-xs leading-relaxed text-(--color-muted-fg)">{a}</p>
						</details>
					))}
				</div>

				<Callout type="tip">
					All demos are live in this playground. Navigate via the sidebar to explore each feature interactively.
				</Callout>
			</section>
		</div>
	);
}
