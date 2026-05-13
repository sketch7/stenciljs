import { SignalWatcher, effect } from "@ssv/stencil-signals";
/* eslint-disable react/no-array-index-key -- display-only append-only lists; stable order */
import { Component, h, Mixin } from "@stencil/core";

import { count, history, milestones } from "./effect.signals";

@Component({
	tag: "app-signals-effect",
	styleUrl: "effect.css",
	shadow: true,
})
export class AppSignalsEffect extends Mixin(SignalWatcher) {
	// Explicit-deps effect: appends count to history on every change (deferred — skips initial value)
	readonly _historyEff = effect(
		[count],
		([val]) => {
			history.set([...history.peek(), val]);
		},
		{ defer: true },
		this,
	);

	// Explicit-deps effect: records a milestone text at every multiple of 5 (deferred)
	readonly _milestoneEff = effect(
		[count],
		([val]) => {
			if (val !== 0 && val % 5 === 0) {
				milestones.set([...milestones.peek(), `Reached ${val}!`]);
			}
		},
		{ defer: true },
		this,
	);

	override render() {
		const curr = count();
		const hist = history();
		const miles = milestones();

		return (
			<div class="effect">
				<div class="count-display">
					<span class="count-label">Count</span>
					<span class="count-value">{curr}</span>
				</div>

				<div class="controls">
					<button type="button" class="btn btn-outline" onClick={() => count.update(n => n - 1)}>
						−
					</button>
					<button type="button" class="btn btn-primary" onClick={() => count.update(n => n + 1)}>
						+
					</button>
				</div>

				{miles.length > 0 && (
					<div class="section">
						<p class="section-label">Milestones</p>
						<ul class="badge-list">
							{miles.map((m, i) => (
								<li key={i} class="badge badge-milestone">
									{m}
								</li>
							))}
						</ul>
					</div>
				)}

				<div class="section">
					<p class="section-label">Change history ({hist.length})</p>
					{hist.length === 0 ? (
						<p class="empty">No changes yet — increment or decrement.</p>
					) : (
						<ul class="history-list">
							{[...hist]
								.toReversed()
								.slice(0, 12)
								.map((v, i) => (
									<li key={i} class="history-item">
										{v}
									</li>
								))}
						</ul>
					)}
				</div>
			</div>
		);
	}
}
