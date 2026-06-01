import { AppIntersectionObserver, AppMutationObserver, AppResizeObserver } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-10">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">DOM Observers</h1>
				<p className="text-sm text-(--color-muted-fg)">
					Lifecycle-aware wrappers for <code className="text-(--color-primary)">ResizeObserver</code>,{" "}
					<code className="text-(--color-primary)">IntersectionObserver</code>, and{" "}
					<code className="text-(--color-primary)">MutationObserver</code>. All utilities bind automatically to the
					Stencil component lifecycle via <code className="text-(--color-primary)">@ssv/stencil-core/dom</code>.
				</p>
			</div>

			{/* ── Resize Observer ─────────────────────────────────────────────────── */}
			<section className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<h2 className="text-lg font-semibold text-(--color-fg)">resizeObserver</h2>
					<p className="text-sm text-(--color-muted-fg)">
						Drag the corner of the box — width and height update live via{" "}
						<code className="text-(--color-primary)">resizeObserver</code> with no{" "}
						<code className="text-(--color-primary)">@State</code> polling.
					</p>
				</div>
				<div className="inline-block rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
					<AppResizeObserver />
				</div>
			</section>

			{/* ── Intersection Observer ───────────────────────────────────────────── */}
			<section className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<h2 className="text-lg font-semibold text-(--color-fg)">intersectionObserver</h2>
					<p className="text-sm text-(--color-muted-fg)">
						Scroll the box into and out of view — visibility and intersection ratio update via{" "}
						<code className="text-(--color-primary)">intersectionObserver</code>.
					</p>
				</div>
				<div className="flex flex-col gap-32">
					<p className="text-xs text-(--color-muted-fg)">↓ scroll down to see the observer fire</p>
					<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
						<AppIntersectionObserver />
					</div>
					<p className="text-xs text-(--color-muted-fg)">↑ scroll back up</p>
				</div>
			</section>

			{/* ── Mutation Observer ────────────────────────────────────────────────── */}
			<section className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<h2 className="text-lg font-semibold text-(--color-fg)">mutationObserver</h2>
					<p className="text-sm text-(--color-muted-fg)">
						Add or remove child nodes and toggle an attribute — each DOM change fires{" "}
						<code className="text-(--color-primary)">mutationObserver</code> and updates the stats.
					</p>
				</div>
				<div className="inline-block rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
					<AppMutationObserver />
				</div>
			</section>
		</div>
	);
}
