import { use } from "@ssv/stencil.core";
import { useQuery, useMutation, useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";

export type Post = {
	userId: number;
	id: number;
	title: string;
	body: string;
};

const QUERY_KEY = ["posts"] as const;

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
 * Unified hook for the posts feature — query, mutation, and SSR prefetch in one place.
 * The component only needs to call this and render the result.
 *
 * @example
 * ```ts
 * readonly #api = usePosts();
 * render() {
 *   const { data, isPending } = this.#api.posts;
 * }
 * ```
 */
export function usePosts(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);

	// SSR prefetch — runs before the first render on both server and client.
	use({
		async hostWillLoad() {
			await client.current?.prefetchQuery({ queryKey: QUERY_KEY, queryFn: fetchPosts });
		},
	});

	const posts = useQuery(
		() => ({
			queryKey: QUERY_KEY,
			queryFn: fetchPosts,
			staleTime: 5 * 60 * 1000,
		}),
		queryClient,
	);

	const create = useMutation(
		{
			mutationFn: (title: string) => apiCreatePost(title),
			onSuccess: () => {
				client.current?.invalidateQueries({ queryKey: QUERY_KEY });
			},
		},
		queryClient,
	);

	return { posts, create };
}
