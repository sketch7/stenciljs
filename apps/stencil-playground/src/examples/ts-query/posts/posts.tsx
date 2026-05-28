import { SsvElement } from "@ssv/stencil-core";
import { provideTransferState } from "@ssv/stencil-core/transfer-state";
import { provideQueryClient } from "@ssv/tanstack.stencil-query";
import { useQueryDevtools } from "@ssv/tanstack.stencil-query/dev-tools";
import { Component, State, h } from "@stencil/core";

import { usePosts } from "./posts.api";
import type { Post } from "./posts.api";

@Component({
	tag: "app-ts-query-posts",
	styleUrl: "posts.css",
	shadow: true,
})
export class AppTsQueryPosts extends SsvElement {
	// Transfer state owns the serialization scope — must be declared before provideQueryClient.
	readonly #ts = provideTransferState("ts-query-posts");
	readonly #queryClient = provideQueryClient({ withHydration: this.#ts });
	readonly #api = usePosts(this.#queryClient);
	readonly _ = this.setup(() => useQueryDevtools({ enabled: true }));

	@State() inputValue = "";

	private handleInput(e: Event) {
		this.inputValue = (e.target as HTMLInputElement).value;
	}

	private handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Enter") {
			this.submit();
		}
	}

	private submit() {
		const title = this.inputValue.trim();
		if (!title) {
			return;
		}
		this.#api.create.mutate(title);
		this.inputValue = "";
	}

	private renderCreateSuccess() {
		const { isSuccess: created, data: newPost } = this.#api.create;
		if (!created || !newPost) {
			return null;
		}
		console.warn(">>>> [renderCreateSuccess] render");
		return (
			<p class="notice notice--success">
				Created: <strong>{newPost.title}</strong> (id: {newPost.id})
			</p>
		);
	}

	private renderPostsList() {
		const { data: posts, isPending, isError } = this.#api.posts;
		if (isPending || isError) {
			return null;
		}
		if (!posts) {
			return null;
		}
		console.warn(">>>> [renderPostsList] render");
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
		const { isPending, isError, error } = this.#api.posts;
		const { isPending: isCreating } = this.#api.create;

		return (
			<div class="posts">
				{this.#ts.toScriptElement()}
				<div class="add-row">
					<input
						class="post-input"
						type="text"
						placeholder="New post title…"
						value={this.inputValue}
						onInput={e => this.handleInput(e)}
						onKeyDown={e => this.handleKeyDown(e)}
						disabled={isCreating}
					/>
					<button type="button" class="btn btn-primary" onClick={() => this.submit()} disabled={isCreating}>
						{isCreating ? "Creating…" : "Create"}
					</button>
				</div>
				<div>{this.inputValue}</div>

				{this.renderCreateSuccess()}

				{isPending && <p class="status">Loading posts…</p>}
				{isError && <p class="status status--error">Error: {String(error)}</p>}

				{this.renderPostsList()}
			</div>
		);
	}
}
