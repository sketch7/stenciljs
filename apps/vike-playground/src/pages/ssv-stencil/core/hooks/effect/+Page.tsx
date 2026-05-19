import { AppEffectDemo } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">useEffect</h1>
				<p className="text-sm text-(--color-muted-fg)">
					React-identical effect API. <code>useEffect(fn)</code> runs after every render; <code>useEffect(fn, [])</code>{" "}
					Runs once on mount — matching React&apos;s dependency-array semantics.
				</p>
			</div>

			<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-6">
				<AppEffectDemo />
			</div>

			<div className="flex flex-col gap-2 text-xs text-(--color-muted-fg)">
				<p>
					<code>useEffect(fn, [])</code> — registers a <code>keydown</code> listener on <code>globalThis</code> once at{" "}
					<code>hostConnected</code> and removes it at <code>hostDisconnected</code>. Mutates <code>@State</code> via
					the arrow-function <code>this</code> closure to trigger re-renders.
				</p>
				<p>
					<code>useEffect(fn)</code> — syncs the browser tab title after every render at <code>hostDidRender</code>.
					Cleanup restores the previous title before the next execution and on disconnect — identical to React&apos;s
					cleanup semantics.
				</p>
			</div>
		</div>
	);
}
