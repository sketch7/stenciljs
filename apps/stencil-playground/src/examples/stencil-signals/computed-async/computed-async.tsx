import { signal, withSignalController } from "@ssv/stencil-signals";
import { computedAsync, isError, isPending } from "@ssv/stencil-signals/extensions";
import { SsvElement } from "@ssv/stencil.core";
import { Component, h } from "@stencil/core";

export type ApiUser = {
	id: number;
	name: string;
	username: string;
	email: string;
	phone: string;
	website: string;
	company: { name: string };
	address: { city: string };
};

const userId = signal(1);
const USER_COUNT = 10;

@Component({
	tag: "app-signals-computed-async",
	styleUrl: "computed-async.css",
	shadow: true,
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppSignalsComputedAsync extends SsvElement {
	readonly signalWatcher = withSignalController(this);
	readonly user = computedAsync<ApiUser>(this, async (abortSig: AbortSignal) => {
		const res = await fetch(`https://jsonplaceholder.typicode.com/users/${userId()}`, { signal: abortSig });
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}
		return res.json() as Promise<ApiUser>;
	});

	render() {
		const result = this.user();
		const id = userId();

		return (
			<div class="async">
				<div class="nav">
					<button type="button" class="btn btn-outline" disabled={id <= 1} onClick={() => userId.update(n => n - 1)}>
						‹ Prev
					</button>
					<span class="user-id">
						User {id} / {USER_COUNT}
					</span>
					<button
						type="button"
						class="btn btn-outline"
						disabled={id >= USER_COUNT}
						onClick={() => userId.update(n => n + 1)}>
						Next ›
					</button>
				</div>

				{isPending(result) && (
					<div class="state state-pending">
						<span class="spinner" aria-hidden="true" />
						<span>Loading user {id}…</span>
					</div>
				)}

				{isError(result) && (
					<div class="state state-error">
						<span class="state-icon">✕</span>
						<span>{String(result.error)}</span>
					</div>
				)}

				{result.value && (
					<div class="user-card">
						<div class="user-header">
							<span class="user-avatar" aria-hidden="true">
								{result.value.name[0]}
							</span>
							<div>
								<p class="user-name">{result.value.name}</p>
								<p class="user-handle">@{result.value.username}</p>
							</div>
						</div>
						<dl class="user-details">
							<dt>Email</dt>
							<dd>{result.value.email}</dd>
							<dt>Phone</dt>
							<dd>{result.value.phone}</dd>
							<dt>Website</dt>
							<dd>{result.value.website}</dd>
							<dt>City</dt>
							<dd>{result.value.address.city}</dd>
							<dt>Company</dt>
							<dd>{result.value.company.name}</dd>
						</dl>
					</div>
				)}
			</div>
		);
	}
}
