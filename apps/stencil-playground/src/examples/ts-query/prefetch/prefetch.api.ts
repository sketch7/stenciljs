import type { Ref } from "@ssv/stencil-core";
import { useQuery, usePrefetchQuery } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";

export type Post = {
	userId: number;
	id: number;
	title: string;
	body: string;
};

export const POSTS_QUERY_KEY = ["prefetch-posts"] as const;
export const HOVER_POST_IDS = [1, 2, 3, 4, 5] as const;
export const HOVER_IDLE_ID = "idle" as const;
const STALE_TIME = 5 * 60 * 1000;

export async function fetchPosts(): Promise<Post[]> {
	console.warn("Fetching posts…");
	const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
	if (!res.ok) {
		throw new Error(`Failed to fetch posts: ${res.status}`);
	}
	return res.json() as Promise<Post[]>;
}

export function hoverPostQueryKey(id: number | null) {
	return ["prefetch-post-hover", id ?? HOVER_IDLE_ID] as const;
}

export async function fetchPostById(id: number): Promise<Post> {
	const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
	if (!res.ok) {
		throw new Error(`Failed to fetch post ${id}: ${res.status}`);
	}
	return res.json() as Promise<Post>;
}

export async function fetchHoveredPost(id: number | null): Promise<Post | null> {
	if (id === null) {
		return null;
	}
	return fetchPostById(id);
}

/**
 * Seeds the posts cache before any `useQuery` in the component renders.
 * Defined outside the component — reusable across any component that provides a client.
 *
 * @example
 * ```ts
 * readonly _prefetch = prefetchPosts();
 * ```
 */
export function prefetchPosts(client?: QueryClient | Ref<QueryClient>): void {
	usePrefetchQuery({ queryKey: POSTS_QUERY_KEY, queryFn: fetchPosts }, client);
}

/**
 * Posts query — picks up pre-seeded cache data immediately with no loading state.
 *
 * @example
 * ```ts
 * readonly #posts = usePrefetchedPosts();
 * ```
 */
export function usePrefetchedPosts(client?: QueryClient | Ref<QueryClient>) {
	return useQuery({ queryKey: POSTS_QUERY_KEY, queryFn: fetchPosts, staleTime: STALE_TIME }, client);
}

export function useHoveredPost(getPostId: () => number | null, client?: QueryClient | Ref<QueryClient>) {
	return useQuery(
		() => ({
			queryKey: hoverPostQueryKey(getPostId()),
			queryFn: () => fetchHoveredPost(getPostId()),
			staleTime: STALE_TIME,
		}),
		client,
	);
}
