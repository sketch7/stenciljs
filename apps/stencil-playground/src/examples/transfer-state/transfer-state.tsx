import { SsvElement } from "@ssv/stencil.core";
import { makeTransferKey, provideTransferState } from "@ssv/stencil.core/transfer-state";
import { Component, h } from "@stencil/core";

type ServerItem = { id: number; label: string };

const TIME_KEY = makeTransferKey<string>("time");
const COUNT_KEY = makeTransferKey<number>("count");
const ITEMS_KEY = makeTransferKey<ServerItem[]>("items");

@Component({
	tag: "app-transfer-state",
	styleUrl: "transfer-state.css",
	shadow: true,
})
export class AppTransferState extends SsvElement {
	readonly #ts = provideTransferState("ts-demo");

	render() {
		const time = this.#ts.transfer(TIME_KEY, () => new Date().toISOString());
		const count = this.#ts.transfer(COUNT_KEY, () => Math.floor(Math.random() * 1000));
		const items = this.#ts.transfer(ITEMS_KEY, () => [
			{ id: 1, label: "Alpha (from server)" },
			{ id: 2, label: "Beta (from server)" },
			{ id: 3, label: "Gamma (from server)" },
		]);

		const env = !("window" in globalThis) ? "server" : "client";

		return (
			<div class="ts-demo">
				{this.#ts.toScriptElement()}

				<p class="env-badge" data-env={env}>
					Rendering on: <strong>{env}</strong>
				</p>

				<section class="ts-section">
					<h3 class="ts-label">String — Server Timestamp</h3>
					<p class="ts-value">{time ?? "—"}</p>
					<p class="ts-hint">Populated by the server; stable across client re-renders.</p>
				</section>

				<section class="ts-section">
					<h3 class="ts-label">Number — Random Token</h3>
					<p class="ts-value">{count ?? "—"}</p>
					<p class="ts-hint">Random value injected during SSR; reloading the page generates a new token.</p>
				</section>

				<section class="ts-section">
					<h3 class="ts-label">Array — Server Items</h3>
					{items ? (
						<ul class="ts-list">
							{items.map(item => (
								<li key={item.id} class="ts-item">
									{item.label}
								</li>
							))}
						</ul>
					) : (
						<p class="ts-value">—</p>
					)}
					<p class="ts-hint">List serialized on the server and hydrated before the first client render.</p>
				</section>
			</div>
		);
	}
}
