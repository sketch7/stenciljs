import { SsvElement } from "@ssv/stencil-core";
import { computed, signal, useSignalWatcher } from "@ssv/stencil-signals";
import { Component, h } from "@stencil/core";

const value = signal(1);

// `computed` feeds each derivation its own previous result. Seeding with
// `initialValue` types `prev` as `number` (never undefined) and infers `T`.
const runningTotal = computed(prev => value() + prev, { initialValue: 0 });
const maxSeen = computed(prev => Math.max(prev, value()), { initialValue: 0 });

@Component({
	tag: "app-signals-computed-self",
	styleUrl: "computed-self.css",
	shadow: true,
})
export class AppSignalsComputedSelf extends SsvElement {
	readonly signalWatcher = useSignalWatcher();

	render() {
		return (
			<div class="self">
				<div class="values">
					<div class="value-item">
						<span class="value-label">Value</span>
						<span class="value-num value-curr">{value()}</span>
					</div>
					<div class="value-item">
						<span class="value-label">Running total</span>
						<span class="value-num value-total">{runningTotal()}</span>
					</div>
					<div class="value-item">
						<span class="value-label">Max seen</span>
						<span class="value-num value-max">{maxSeen()}</span>
					</div>
				</div>

				<div class="controls">
					<button type="button" class="btn btn-outline" onClick={() => value.update(n => n - 1)}>
						−
					</button>
					<button type="button" class="btn btn-primary" onClick={() => value.update(n => n + 1)}>
						+
					</button>
				</div>

				<p class="hint">
					Each change folds <code>value</code> into the previous result: the total accumulates, while max only ever
					climbs — both read their own prior output via <code>computed(prev =&gt; …)</code>.
				</p>
			</div>
		);
	}
}
