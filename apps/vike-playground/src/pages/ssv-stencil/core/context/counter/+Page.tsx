import { AppCtxCounter, AppCtxCounterGroup } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">Context Counter</h1>
				<p className="text-sm text-(--color-muted-fg)">
					Demonstrates tree-scoped context via <code>createContext</code> / <code>provideContext</code> /{" "}
					<code>useContext</code> from <code>@ssv/stencil-core</code>. Each group shares its own counter state; counters
					outside any group fall back to a global singleton.
				</p>
			</div>

			<div className="flex flex-col gap-6">
				<section className="flex flex-col gap-3">
					<div className="flex flex-col gap-0.5">
						<h2 className="text-base font-semibold text-(--color-fg)">Context A — shared state</h2>
						<p className="text-xs text-(--color-muted-fg)">
							Both counters share the same store — incrementing one updates the other.
						</p>
					</div>
					<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
						<AppCtxCounterGroup>
							<div className="flex justify-center gap-8">
								<AppCtxCounter />
								<AppCtxCounter />
							</div>
						</AppCtxCounterGroup>
					</div>
				</section>

				<section className="flex flex-col gap-3">
					<div className="flex flex-col gap-0.5">
						<h2 className="text-base font-semibold text-(--color-fg)">Context B — isolated</h2>
						<p className="text-xs text-(--color-muted-fg)">
							A separate group with its own store, independent of Context A.
						</p>
					</div>
					<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
						<AppCtxCounterGroup>
							<div className="flex justify-center gap-8">
								<AppCtxCounter />
								<AppCtxCounter />
							</div>
						</AppCtxCounterGroup>
					</div>
				</section>

				<section className="flex flex-col gap-3">
					<div className="flex flex-col gap-0.5">
						<h2 className="text-base font-semibold text-(--color-fg)">Global — no provider</h2>
						<p className="text-xs text-(--color-muted-fg)">
							No <code>AppCtxCounterGroup</code> ancestor — falls back to the shared singleton from{" "}
							<code>createContext</code>&apos;s default factory.
						</p>
					</div>
					<div className="flex justify-center rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
						<AppCtxCounter />
					</div>
				</section>
			</div>

			<p className="text-xs text-(--color-muted-fg)">
				Context resolves via a bubbling <code>__ssv:context-request</code> DOM event (<code>composed: true</code>). The
				nearest ancestor <code>provideContext()</code> intercepts it and responds. No provider → singleton fallback from{" "}
				<code>createContext</code>.
			</p>
		</div>
	);
}
