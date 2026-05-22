import { computed, signal, useSignalWatcher } from "@ssv/stencil-signals";
import { SsvElement } from "@ssv/stencil.core";
import { provideTransferState } from "@ssv/stencil.core/transfer-state";
import { provideQueryClient } from "@ssv/tanstack.stencil-query";
import { useQueryDevtools } from "@ssv/tanstack.stencil-query/dev-tools";
import { Component, h } from "@stencil/core";

import { usePostsSignals } from "./posts-signals.api";
import type { Post } from "./posts-signals.api";

@Component({
	tag: "app-ts-query-posts-signals",
	styleUrl: "posts-signals.css",
	shadow: true,
})
export class AppTsQueryPostsSignals extends SsvElement {
	readonly #ts = provideTransferState("ts-query-posts-signals");
	readonly #queryClient = provideQueryClient({ withHydration: this.#ts });
	readonly #api = usePostsSignals(this.#queryClient);
	readonly signalWatcher = useSignalWatcher();
	_ = useQueryDevtools();

	readonly inputValue = signal("");

	/** Derived: true when the input has content and no mutation is in-flight. */
	readonly canSubmit = computed(() => Boolean(this.inputValue()) && !this.#api.create.isPending());

	private handleInput(e: Event) {
		this.inputValue.set((e.target as HTMLInputElement).value.trim());
	}

	private handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Enter") {
			this.submit();
		}
	}

	private submit() {
		if (!this.canSubmit()) {
			return;
		}
		this.#api.create.mutate(this.inputValue());
		this.inputValue.set("");
	}

	private renderCreateSuccess() {
		if (!this.#api.create.isSuccess()) {
			return null;
		}
		console.warn(">>>> success");
		const data = this.#api.create.data();
		if (!data) {
			return null;
		}
		return (
			<p class="notice notice--success">
				Created: <strong>{data.title}</strong> (id: {data.id})
			</p>
		);
	}

	private renderPostsList() {
		const postsApi = this.#api.posts;
		if (postsApi.isPending() || postsApi.isError()) {
			return null;
		}
		const posts = postsApi.data();
		if (!posts) {
			return null;
		}

		console.warn(">>>> posts");

		return (
			<ul class="list">
				{posts.map((post: Post) => (
					<li key={post.id} class="item">
						<span class="item-id">#{post.id}</span>
						<span class="item-title">{post.title}</span>
					</li>
				))}
			</ul>
		);
	}

	render() {
		const { posts: postsApi, create: createPostsApi } = this.#api;

		return (
			<div class="posts">
				{this.#ts.toScriptElement()}
				<div class="add-row">
					<input
						class="post-input"
						type="text"
						placeholder="New post title…"
						value={this.inputValue()}
						onInput={e => this.handleInput(e)}
						onKeyDown={e => this.handleKeyDown(e)}
						disabled={createPostsApi.isPending()}
					/>
					<button type="button" class="btn btn-primary" onClick={() => this.submit()} disabled={!this.canSubmit()}>
						{createPostsApi.isPending() ? "Creating…" : "Create"}
					</button>
				</div>

				{this.renderCreateSuccess()}

				{postsApi.isPending() && <p class="status">Loading posts…</p>}
				{postsApi.isError() && <p class="status status--error">Error: {String(postsApi.error())}</p>}

				{this.renderPostsList()}
			</div>
		);
	}
}
