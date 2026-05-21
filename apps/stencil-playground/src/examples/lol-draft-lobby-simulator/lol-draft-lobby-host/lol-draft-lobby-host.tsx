import { SsvElement, use } from "@ssv/stencil.core";
import { provideTransferState } from "@ssv/stencil.core/transfer-state";
import { provideQueryClient } from "@ssv/tanstack.stencil-query";
import { Component, State, h, Build } from "@stencil/core";

import { useDraftSSE } from "../draft/draft-sse.hooks";
import { useCreateDraft } from "../draft/draft.api";
import { showNotification } from "../notification/notification.store";

@Component({
	tag: "app-lol-draft-lobby-host",
	styleUrl: "lol-draft-lobby-host.css",
	shadow: true,
})
export class AppLolDraftLobbyHost extends SsvElement {
	// Transfer state must be declared before provideQueryClient.
	readonly #ts = provideTransferState("lol-draft");
	readonly #queryClient = provideQueryClient({ withHydration: this.#ts });

	@State() draftId: string | null = null;
	@State() createError: string | null = null;

	readonly #create = useCreateDraft(this.#queryClient);

	// Subscribe to SSE once we have a draftId
	readonly _ = useDraftSSE(() => this.draftId, this.#queryClient);

	// Trigger draft creation after the first render (hydration complete).
	// hostDidLoad fires in componentDidLoad — client-only, safe for DOM state changes.
	// Arrow function captures `this` (the component instance) from the class field initializer.
	readonly _mount = use(() => ({
		hostDidLoad: () => {
			if (Build.isServer) {
				return;
			}
			if (!this.draftId) {
				this.#create.create.mutate(undefined, {
					onSuccess: session => {
						this.draftId = session.id;
						this.createError = null;
					},
					onError: (err: unknown) => {
						const msg = err instanceof Error ? err.message : "Failed to create session";
						this.createError = msg;
						showNotification(msg, "error");
					},
				});
			}
		},
	}));

	render() {
		const isCreating = this.#create.create.isPending;

		return (
			<div class="host">
				{this.#ts.toScriptElement()}

				{/* Global notification overlay */}
				<app-lol-notification />

				{isCreating && !this.draftId && (
					<div class="host-loading">
						<div class="loading-card">
							<span class="spinner" />
							<span>Starting draft session…</span>
						</div>
					</div>
				)}

				{this.createError && !this.draftId && (
					<div class="host-error">
						<p>Failed to start session: {this.createError}</p>
						<button
							type="button"
							class="btn-retry"
							onClick={() => {
								this.createError = null;
								this.#create.create.mutate(undefined, {
									onSuccess: s => {
										this.draftId = s.id;
									},
									onError: (err: unknown) => {
										const msg = err instanceof Error ? err.message : "Failed";
										this.createError = msg;
									},
								});
							}}>
							Retry
						</button>
					</div>
				)}

				{this.draftId && (
					<app-lol-draft-layout session-id={this.draftId}>
						<app-lol-champion-pool slot="champion-pool" draft-id={this.draftId} team="blue" />
						<app-lol-draft-area slot="draft-area" draft-id={this.draftId} my-team="blue" />
						<app-lol-draft-info slot="draft-info" draft-id={this.draftId} my-team="blue" />
					</app-lol-draft-layout>
				)}
			</div>
		);
	}
}
