import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-10">
			<section className="flex flex-col gap-3">
				<h1 className="text-3xl font-bold text-[var(--color-fg)]">Vike Playground</h1>
				<p className="text-[var(--color-muted-fg)] leading-relaxed">
					Server-side rendered StencilJS web components, powered by{" "}
					<a
						href="https://vike.dev"
						className="text-[var(--color-primary)] hover:underline"
						target="_blank"
						rel="noreferrer">
						Vike
					</a>
					,{" "}
					<a
						href="https://stenciljs.com"
						className="text-[var(--color-primary)] hover:underline"
						target="_blank"
						rel="noreferrer">
						StencilJS
					</a>{" "}
					and{" "}
					<a
						href="https://tailwindcss.com"
						className="text-[var(--color-primary)] hover:underline"
						target="_blank"
						rel="noreferrer">
						Tailwind CSS v4
					</a>
					.
				</p>
				<p className="text-sm text-[var(--color-muted-fg)]">
					Components are rendered on the server via <code className="text-[var(--color-primary)]">@stencil/ssr</code>{" "}
					with Declarative Shadow DOM, then hydrated on the client. State is managed with{" "}
					<code className="text-[var(--color-primary)]">@stencil/store</code>.
				</p>
			</section>

			<section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<ExampleCard
					href="/counter"
					title="Counter"
					description="Increment / decrement with an additional value multiplied by 2. Global state via @stencil/store."
				/>
				<ExampleCard
					href="/todo"
					title="Todo List"
					description="Add, complete, and delete tasks. Reactive list with store-driven state updates."
				/>
			</section>
		</div>
	);
}

function ExampleCard({ href, title, description }: { href: string; title: string; description: string }): JSX.Element {
	return (
		<a
			href={href}
			className="flex flex-col gap-2 p-5 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)] transition-colors">
			<span className="font-semibold text-[var(--color-fg)]">{title} →</span>
			<span className="text-sm text-[var(--color-muted-fg)] leading-relaxed">{description}</span>
		</a>
	);
}
