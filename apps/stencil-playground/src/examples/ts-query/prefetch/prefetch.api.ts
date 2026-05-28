import type { Ref } from "@ssv/stencil-core";
import { queryOptions, useQuery, usePrefetchQuery } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";

export type Post = {
	userId: number;
	id: number;
	title: string;
	body: string;
};

export const postKeys = {
	all: ["prefetch-posts"] as const,
	lists: () => [...postKeys.all, "list"] as const,
	list: () => [...postKeys.lists()] as const,
	details: () => [...postKeys.all, "detail"] as const,
	detail: (id: number) => [...postKeys.details(), id] as const,
	hover: (id: number | null) => [...postKeys.details(), id ?? ("idle" as const)] as const,
};

export const postQueries = {
	list: () =>
		queryOptions({
			queryKey: postKeys.list(),
			queryFn: fetchPosts,
		}),
	detail: (id: number) =>
		queryOptions({
			queryKey: postKeys.detail(id),
			queryFn: () => fetchPostById(id),
		}),
	hover: (id: number | null) =>
		queryOptions({
			queryKey: postKeys.hover(id),
			queryFn: () => fetchHoveredPost(id),
		}),
};

/**
 * Seeds the posts cache before any `useQuery` in the component renders.
 * Defined outside the component and reusable across any component that provides a client.
 *
 * @example
 * ```ts
 * readonly _prefetch = prefetchPosts();
 * ```
 */
export function prefetchPosts(client?: QueryClient | Ref<QueryClient>): void {
	usePrefetchQuery(postQueries.list(), client);
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
	return useQuery(postQueries.list(), client);
}

export function useHoveredPost(getPostId: () => number | null, client?: QueryClient | Ref<QueryClient>) {
	return useQuery(() => postQueries.hover(getPostId()), client);
}

async function fetchPosts(): Promise<Post[]> {
	console.warn("Fetching posts…");
	const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
	if (!res.ok) {
		throw new Error(`Failed to fetch posts: ${res.status}`);
	}
	return res.json() as Promise<Post[]>;
}

async function fetchPostById(id: number): Promise<Post> {
	const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
	if (!res.ok) {
		throw new Error(`Failed to fetch post ${id}: ${res.status}`);
	}
	return res.json() as Promise<Post>;
}

async function fetchHoveredPost(id: number | null): Promise<Post | null> {
	if (id === null) {
		return null;
	}
	return fetchPostById(id);
}
