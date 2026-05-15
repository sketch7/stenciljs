import { signal, useSignalWatcher } from "@ssv/stencil-signals";
import { useDerivedAsync } from "@ssv/stencil-signals/extensions";
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
	tag: "app-signals-derived-async",
	styleUrl: "derived-async.css",
	shadow: true,
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppSignalsDerivedAsync extends SsvElement {
	readonly signalWatcher = useSignalWatcher();
	readonly user = useDerivedAsync<ApiUser>(async (abortSig: AbortSignal) => {
		const res = await fetch(`https://jsonplaceholder.typicode.com/users/${userId()}`, { signal: abortSig });
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}
		return res.json() as Promise<ApiUser>;
	});

	render() {
		const id = userId();

		let row: ApiUser | undefined;
		let readError: unknown;
		try {
			row = this.user();
		} catch (error) {
			readError = error;
		}

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

				{readError === undefined && row === undefined && (
					<div class="state state-pending">
						<span class="spinner" aria-hidden="true" />
						<span>Loading user {id}…</span>
					</div>
				)}

				{readError !== undefined && (
					<div class="state state-error">
						<span class="state-icon">✕</span>
						<span>{String(readError)}</span>
					</div>
				)}

				{row !== undefined && readError === undefined && (
					<div class="user-card">
						<div class="user-header">
							<span class="user-avatar" aria-hidden="true">
								{row.name[0]}
							</span>
							<div>
								<p class="user-name">{row.name}</p>
								<p class="user-handle">@{row.username}</p>
							</div>
						</div>
						<dl class="user-details">
							<dt>Email</dt>
							<dd>{row.email}</dd>
							<dt>Phone</dt>
							<dd>{row.phone}</dd>
							<dt>Website</dt>
							<dd>{row.website}</dd>
							<dt>City</dt>
							<dd>{row.address.city}</dd>
							<dt>Company</dt>
							<dd>{row.company.name}</dd>
						</dl>
					</div>
				)}
			</div>
		);
	}
}
