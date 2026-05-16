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
const STALE_TIME = 5 * 60 * 1000;

async function fetchPosts(): Promise<Post[]> {
	console.warn(">>>> fetchPosts");
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
 * Unified hook for the posts feature — query, mutation, and prefetch in one place.
 * The component only needs to call this and render the result.
 *
 * @param queryClient - Optional explicit client; falls back to context.
 *
 * @example
 * ```ts
 * readonly #api = usePosts(this.#queryClient);
 * render() {
 *   const { data, isPending } = this.#api.posts;
 * }
 * ```
 */
export function usePosts(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);

	// Client-side prefetch for non-SSR navigation. staleTime prevents re-fetching data
	// that was already hydrated from the server.
	use({
		async hostWillLoad() {
			console.warn(">>>> hostWillLoad prefetchQuery");
			await client.current?.prefetchQuery({ queryKey: QUERY_KEY, queryFn: fetchPosts, staleTime: STALE_TIME });
		},
	});

	const posts = useQuery(
		() => ({
			queryKey: QUERY_KEY,
			staleTime: STALE_TIME,
			queryFn: () => {
				console.warn(">>>> useQuery fetchPosts");
				return fetchPosts();
			},
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
