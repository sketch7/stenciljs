import { SsvElement } from "@ssv/stencil-core";
import { Component, State, h } from "@stencil/core";

import { hookMeta, useLifecycleLogger } from "./lifecycle-logger";

@Component({
	tag: "app-lifecycle-demo",
	styleUrl: "lifecycle.css",
	shadow: true,
})
export class AppLifecycleDemo extends SsvElement {
	readonly #lifecycle = useLifecycleLogger();

	@State() private _tick = 0;

	render() {
		// eslint-disable-next-line no-console -- intentional warn for demo
		console.warn(
			"%c[lifecycle] %crender()",
			"color: #94a3b8; font-weight: normal",
			"color: #e2e8f0; font-weight: bold",
			{
				tick: this._tick,
				eventCount: this.#lifecycle.events.length,
			},
		);
		const events = this.#lifecycle.events;

		return (
			<div class="lifecycle-demo">
				<div class="controls">
					<button
						type="button"
						class="btn btn-update"
						onClick={() => {
							this._tick += 1;
						}}>
						<span class="btn-icon">↻</span>
						Force Re-render
						<span class="btn-badge">{this._tick}</span>
					</button>
					<button
						type="button"
						class="btn btn-clear"
						onClick={() => {
							this.#lifecycle.clear();
						}}>
						<span class="btn-icon">✕</span>
						Clear Log
					</button>
				</div>

				<div class="log-panel">
					<div class="log-panel-header">
						<span class="log-col-idx">#</span>
						<span class="log-col-time">time</span>
						<span class="log-col-hook">hook</span>
						<span class="log-col-desc">description</span>
					</div>

					<div class="log-entries" aria-live="polite" aria-label="Lifecycle event log">
						{events.length === 0 ? (
							<div class="log-empty">
								<span class="log-empty-icon">◌</span>
								<span>Waiting for lifecycle events…</span>
							</div>
						) : (
							events.map(ev => (
								<div key={ev.index} class={`log-entry log-entry--${hookMeta[ev.hook].badge}`}>
									<span class="log-idx">{ev.index}</span>
									<span class="log-time">{ev.ts}</span>
									<span class={`log-hook hook-badge hook-badge--${hookMeta[ev.hook].badge}`}>{ev.hook}</span>
									<span class="log-desc">{hookMeta[ev.hook].desc}</span>
								</div>
							))
						)}
					</div>
				</div>

				<div class="legend">
					{(Object.entries(hookMeta) as [keyof typeof hookMeta, (typeof hookMeta)[keyof typeof hookMeta]][]).map(
						([hook, meta]) => (
							<span key={hook} class={`legend-item hook-badge hook-badge--${meta.badge}`}>
								{hook}
							</span>
						),
					)}
				</div>
			</div>
		);
	}
}
