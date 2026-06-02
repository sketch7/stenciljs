import { use } from "@ssv/stencil-core";
import { useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";
import { $useMutation, $useQuery } from "@ssv/tanstack.stencil-query/signals";

import type { Post } from "../posts/posts.api";

export type { Post };

const QUERY_KEY = ["posts"] as const;
const STALE_TIME = 5 * 60 * 1000;

async function fetchPosts(): Promise<Post[]> {
	const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=10");
	if (!res.ok) {
		throw new Error(`Failed to fetch posts: ${res.status}`);
	}
	return res.json() as Promise<Post[]>;
}

async function apiCreatePost(title: string): Promise<Post> {
	const res = await fetch("https://jsonplaceholder.typicode.com/posts", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ title, body: "", userId: 1 }),
	});
	if (!res.ok) {
		throw new Error(`Failed to create post: ${res.status}`);
	}
	return res.json() as Promise<Post>;
}

/**
 * Signal-based variant of `usePosts` — fields are fine-grained signals.
 *
 * @example
 * ```ts
 * readonly #api = $usePosts(this.#queryClient);
 * render() {
 *   const data = this.#api.posts.data();
 *   const isPending = this.#api.posts.isPending();
 * }
 * ```
 */
export function $usePosts(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);

	use({
		async hostWillLoad() {
			await client.current?.prefetchQuery({ queryKey: QUERY_KEY, queryFn: fetchPosts, staleTime: STALE_TIME });
		},
	});

	const posts = $useQuery(
		() => ({
			queryKey: QUERY_KEY,
			staleTime: STALE_TIME,
			queryFn: fetchPosts,
		}),
		queryClient,
	);

	const create = $useMutation(
		{
			mutationFn: async (title: string) => apiCreatePost(title),
			onSuccess: () => {
				client.current?.invalidateQueries({ queryKey: QUERY_KEY });
			},
		},
		queryClient,
	);

	return { posts, create };
}
