import {
	queryOptions,
	useQuery,
	useMutation,
	usePrefetchQuery,
	useQueries,
	useQueryClient,
} from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";
import { $useMutation, $useQuery, $useQueries } from "@ssv/tanstack.stencil-query/signals";

import { apiCreatePost, fetchPostById, fetchPosts } from "./posts.client";
import type { Post } from "./posts.client";

export type { Post };

export const STALE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Query key factory — unified across all demos.
 *
 * @example
 * ```ts
 * postKeys.list() // ["posts", "list"]
 * postKeys.detail(1) // ["posts", "detail", 1]
 * ```
 */
export const postKeys = {
	all: ["posts"] as const,
	list: () => [...postKeys.all, "list"] as const,
	detail: (id: number) => [...postKeys.all, "detail", id] as const,
};

/**
 * Query options factory — reusable, type-safe query definitions.
 */
export const postQueries = {
	list: () =>
		queryOptions({
			queryKey: postKeys.list(),
			queryFn: async () => fetchPosts(),
		}),
	detail: (id: number) =>
		queryOptions({
			queryKey: postKeys.detail(id),
			queryFn: async () => fetchPostById(id),
		}),
};

/**
 * Classic hook for the posts feature — query, mutation, and cache invalidation in one place.
 * Used by `app-ts-query-posts`.
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

	const postsRef = useQuery(
		() => ({
			...postQueries.list(),
			staleTime: STALE_TIME,
		}),
		client,
	);

	const createRef = useMutation(
		{
			mutationFn: async (title: string) => apiCreatePost(title),
			onSuccess: () => {
				void client.current?.invalidateQueries({ queryKey: postKeys.all });
			},
		},
		client,
	);

	return {
		get posts() {
			return postsRef();
		},
		get create() {
			return createRef();
		},
	};
}

/**
 * Signal-based variant of `usePosts` — fields are fine-grained signals.
 * Used by `app-ts-query-posts-signals`.
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

	const posts = $useQuery(
		() => ({
			...postQueries.list(),
			staleTime: STALE_TIME,
		}),
		client,
	);

	const create = $useMutation(
		{
			mutationFn: async (title: string) => apiCreatePost(title),
			onSuccess: () => {
				void client.current?.invalidateQueries({ queryKey: postKeys.all });
			},
		},
		client,
	);

	return { posts, create };
}

/**
 * Prefetch the posts list — seeds the cache before any query connects.
 * Used as a field initializer in `app-ts-query-prefetch-reuse`.
 *
 * @example
 * ```ts
 * readonly _ = this.setup(prefetchPosts());
 * ```
 */
export function prefetchPosts(): void {
	usePrefetchQuery(postQueries.list());
}

/**
 * Subscribe to the prefetched posts list — hits the cache if already seeded.
 * Used by `app-ts-query-prefetch` and `app-ts-query-prefetch-reuse`.
 */
export function usePrefetchedPosts() {
	return useQuery(postQueries.list());
}

/**
 * Subscribe to a single post detail, driven by a computed id.
 * Used by `app-ts-query-hover-prefetch` to show details on hover.
 *
 * @param getPostId - Function returning the post id to display, or null to disable.
 */
export function useHoveredPost(getPostId: () => number | null) {
	return useQuery(() => ({ ...postQueries.detail(getPostId() ?? 0), enabled: getPostId() !== null }));
}

/**
 * Subscribe to multiple posts in parallel by id.
 * Returns a `Ref` whose value is an array of query results.
 * Used by `app-ts-query-use-queries-inline` and `app-ts-query-use-queries-reuse`.
 *
 * @example
 * ```ts
 * readonly #posts = usePostsByIds(() => [1, 2, 3]);
 * render() {
 *   const results = this.#posts();
 *   return results.map(r => r.isSuccess && <li>{r.data.title}</li>);
 * }
 * ```
 */
export function usePostsByIds(getIds: () => number[], client?: QueryClient) {
	return useQueries(() => ({ queries: getIds().map(id => postQueries.detail(id)) }), client);
}

/**
 * Subscribe to multiple posts and derive a single summary via `combine`.
 * Used by `app-ts-query-use-queries-reuse`.
 *
 * @example
 * ```ts
 * readonly #summary = usePostsLoadedCount(() => [1, 2, 3]);
 * render() {
 *   const { total, loaded, pending } = this.#summary();
 * }
 * ```
 */
export function usePostsLoadedCount(getIds: () => number[], client?: QueryClient) {
	return useQueries(
		() => ({
			queries: getIds().map(id => postQueries.detail(id)),
			combine: results => ({
				total: results.length,
				loaded: results.filter(r => r.isSuccess).length,
				pending: results.some(r => r.isPending),
			}),
		}),
		client,
	);
}

/**
 * Signal-based variant of `usePostsByIds`.
 * Used by `app-ts-query-use-queries-signals`.
 */
export function $usePostsByIds(getIds: () => number[], client?: QueryClient) {
	return $useQueries(() => ({ queries: getIds().map(id => postQueries.detail(id)) }), client);
}

/**
 * Signal-based variant with `combine` — derives a summary from all queries.
 * Used by `app-ts-query-use-queries-signals-combine`.
 *
 * @example
 * ```ts
 * readonly #summary = $usePostsWithCombine(() => [1, 2, 3]);
 * render() {
 *   const { total, loaded, titles } = this.#summary();
 * }
 * ```
 */
export function $usePostsWithCombine(getIds: () => number[], client?: QueryClient) {
	return $useQueries(
		() => ({
			queries: getIds().map(id => postQueries.detail(id)),
			combine: results => ({
				total: results.length,
				loaded: results.filter(r => r.isSuccess).length,
				titles: results.map(r => (r.isSuccess ? (r.data?.title ?? "") : null)),
			}),
		}),
		client,
	);
}
