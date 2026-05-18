import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-10">
			<section className="flex flex-col gap-3">
				<h1 className="text-3xl font-bold text-(--color-fg)">Vike Playground</h1>
				<p className="leading-relaxed text-(--color-muted-fg)">
					Server-side rendered StencilJS web components, powered by{" "}
					<a
						href="https://vike.dev"
						className="text-(--color-primary) hover:underline"
						target="_blank"
						rel="noreferrer">
						Vike
					</a>
					,{" "}
					<a
						href="https://stenciljs.com"
						className="text-(--color-primary) hover:underline"
						target="_blank"
						rel="noreferrer">
						StencilJS
					</a>{" "}
					and{" "}
					<a
						href="https://tailwindcss.com"
						className="text-(--color-primary) hover:underline"
						target="_blank"
						rel="noreferrer">
						Tailwind CSS v4
					</a>
					.
				</p>
				<p className="text-sm text-(--color-muted-fg)">
					Components are rendered on the server via <code className="text-(--color-primary)">@stencil/ssr</code> with
					Declarative Shadow DOM, then hydrated on the client.
				</p>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-sm font-semibold tracking-widest text-(--color-muted-fg) uppercase">SSV Stencil / Core</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<ExampleCard
						href="/ssv-stencil/core/reactive-host/mouse"
						title="Mouse Controller"
						description="Tracks cursor position via a ReactiveController. No @State — controller calls requestUpdate() directly."
					/>
					<ExampleCard
						href="/ssv-stencil/core/reactive-host/timer"
						title="Timer Controller"
						description="Elapsed time ticker using setInterval inside a ReactiveController — auto-starts and cleans up with the host lifecycle."
					/>
					<ExampleCard
						href="/ssv-stencil/core/transfer-state"
						title="Transfer State"
						description="Server-injected state serialized into the shadow DOM and hydrated on the client — no duplicate fetches."
					/>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-sm font-semibold tracking-widest text-(--color-muted-fg) uppercase">
					SSV Stencil / TanStack Store
				</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<ExampleCard
						href="/ssv-stencil/ts-store/counter"
						title="Counter"
						description="Increment / decrement with a multiplied additional value. State via @tanstack/store atoms and createAtomCtrl."
					/>
					<ExampleCard
						href="/ssv-stencil/ts-store/todo"
						title="Todo List"
						description="Add, complete, and delete tasks. Store subscription via createSelectorCtrl — no @State needed."
					/>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-sm font-semibold tracking-widest text-(--color-muted-fg) uppercase">Stencil</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<ExampleCard
						href="/stencil/counter"
						title="Counter"
						description="Increment / decrement with an additional value multiplied by 2. Global state via @stencil/store."
					/>
					<ExampleCard
						href="/stencil/todo"
						title="Todo List"
						description="Add, complete, and delete tasks. Reactive list with store-driven state updates."
					/>
				</div>
			</section>
		</div>
	);
}

function ExampleCard({ href, title, description }: { href: string; title: string; description: string }): JSX.Element {
	return (
		<a
			href={href}
			className="flex flex-col gap-2 rounded-xl border border-(--color-card-border) bg-(--color-card) p-5 transition-colors hover:border-(--color-primary)">
			<span className="font-semibold text-(--color-fg)">{title} →</span>
			<span className="text-sm leading-relaxed text-(--color-muted-fg)">{description}</span>
		</a>
	);
}
