import { AppTimer } from "@app/stencil-playground/react";
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
				<AppTimer duration={60} />
			</div>

			<div className="flex flex-col gap-2 text-xs text-[var(--color-muted-fg)]">
				<p>
					<code>
						withSignalProps(this, AppTimer)(&#123; duration: &#123; transform &#125;, isRunning: &#123; twoWay: true
						&#125; &#125;)
					</code>{" "}
					bridges Stencil <code>@Prop()</code> fields into signals — <code>$props.duration</code> is a read-only{" "}
					<code>Signal&lt;number&gt;</code> with a <code>Math.max(0, v)</code> transform applied on every change;
					<code>$props.isRunning</code> is a <code>WritableSignal</code> that emits <code>isRunningChange</code> on
					every write so the React wrapper picks it up via <code>onIsRunningChange</code>.
				</p>
				<p>
					<code>app-timer-counter</code> receives <code>timeRemaining</code> as a plain <code>@Prop</code> and uses{" "}
					<code>withSignalProps(this, AppTimerCounter)(&#123; timeRemaining: &#123;&#125; &#125;)</code> to expose it as
					a signal internally, so <code>$mins</code> and <code>$secs</code> are <code>computed()</code> values — no
					manual math in
					<code>render()</code>.
				</p>
				<p>
					<code>batch()</code> in <code>#stop()</code>, <code>#reset()</code>, and <code>#setTime()</code> coalesces
					multiple signal writes into a single render — <code>isRunning</code> and <code>timeRemaining</code> never flip
					in separate frames. Two explicit-dep <code>effect(this, [dep], fn, &#123; defer: true &#125;)</code> calls
					handle side-effectful reactions — one resets the clock when <code>duration</code> changes, one stops the
					interval the moment <code>isCompleted</code> flips.
				</p>
			</div>
		</div>
	);
}
