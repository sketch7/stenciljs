import { AppSignalsTimer } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-[var(--color-fg)]">Countdown Timer</h1>
				<p className="text-sm text-[var(--color-muted-fg)]">
					Pick a preset or start counting down from 60 seconds. Start, pause, and reset — or watch it complete on its
					own.
				</p>
			</div>

			<div className="rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-6">
				<AppSignalsTimer />
			</div>

			<p className="text-xs text-[var(--color-muted-fg)]">
				<code>minutes</code>, <code>seconds</code>, <code>isCompleted</code>, and <code>buttonLabel</code> are all{" "}
				<code>computed()</code> — derived automatically, no manual sync needed. A single{" "}
				<code>effect(this, [isCompleted], fn, &#123; defer: true &#125;)</code> stops the interval the moment the timer
				reaches zero — it fires only when that one computed flips, not on every tick. Passing <code>this</code> as host
				auto-disposes the effect on disconnect and reinitialises it on reconnect, with no <code>DestroyRef</code> or
				manual cleanup required.
			</p>
		</div>
	);
}
