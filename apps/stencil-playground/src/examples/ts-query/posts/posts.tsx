import { SsvElement } from "@ssv/stencil.core";
import { provideQueryClient } from "@ssv/tanstack.stencil-query";
import { Component, State, h } from "@stencil/core";

import { usePosts } from "./posts.api";
import type { Post } from "./posts.api";

@Component({
	tag: "app-ts-query-posts",
	styleUrl: "posts.css",
	shadow: true,
})
export class AppTsQueryPosts extends SsvElement {
	readonly #queryClient = provideQueryClient();
	readonly #api = usePosts(this.#queryClient);

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

	render() {
		const { data: posts, isPending, isError, error } = this.#api.posts;
		const { isPending: isCreating, isSuccess: created, data: newPost } = this.#api.create;

		return (
			<div class="posts">
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

				{created && newPost && (
					<p class="notice notice--success">
						Created: <strong>{newPost.title}</strong> (id: {newPost.id})
					</p>
				)}

				{isPending && <p class="status">Loading posts…</p>}

				{isError && <p class="status status--error">Error: {String(error)}</p>}

				{!isPending && !isError && posts && (
					<ul class="list">
						{posts.map((post: Post) => (
							<li key={post.id} class="item">
								<span class="item-id">#{post.id}</span>
								<span class="item-title">{post.title}</span>
							</li>
						))}
					</ul>
				)}
			</div>
		);
	}
}
