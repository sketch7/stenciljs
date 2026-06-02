import { useQueries } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";
import { $useQueries } from "@ssv/tanstack.stencil-query/signals";

export type Post = {
	userId: number;
	id: number;
	title: string;
	body: string;
};

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

/** Fetches a single post by id from JSONPlaceholder. */
export async function fetchPost(id: number): Promise<Post> {
	const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
	if (!res.ok) {
		throw new Error(`Failed to fetch post ${id}: ${res.status}`);
	}
	return res.json() as Promise<Post>;
}

/** A single query options object for one post — keeps query keys consistent across hooks. */
function postQuery(id: number) {
	return {
		queryKey: ["use-queries", "post", id] as const,
		queryFn: async () => fetchPost(id),
		staleTime: STALE_TIME,
	};
}

/**
 * Reusable **classic** hook — defined OUTSIDE any component, composed in via a field initializer.
 *
 * Runs one parallel query per id and exposes the results array. Because the function captures the
 * host through `useQueries`, dropping it into any component's class body wires up the lifecycle.
 *
 * @example
 * ```ts
 * readonly #posts = usePostsByIds(() => this.ids);
 * render() {
 *   const results = this.#posts();
 * }
 * ```
 */
export function usePostsByIds(getIds: () => number[], client?: QueryClient) {
	return useQueries(() => ({ queries: getIds().map(id => postQuery(id)) }), client);
}

/**
 * Reusable hook using `combine` — derives a single summary value from all parallel queries.
 * Also defined outside the component, demonstrating composition of the `combine` option.
 */
export function usePostsLoadedCount(getIds: () => number[], client?: QueryClient) {
	return useQueries(
		() => ({
			queries: getIds().map(id => postQuery(id)),
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
 * Reusable **signals** hook — the `$useQueries` counterpart, defined outside the component.
 * Returns a single `Signal` of the results array (mirrors angular's `injectQueries`).
 */
export function $usePostsByIds(getIds: () => number[], client?: QueryClient) {
	return $useQueries(() => ({ queries: getIds().map(id => postQuery(id)) }), client);
}

/**
 * Reusable signals hook with `combine` — derives a summary value from all queries.
 * Returns a `Signal<{ total, loaded, titles }>` instead of a per-element proxy array.
 *
 * @example
 * ```ts
 * readonly #summary = $usePostsWithCombine(() => this.#ids());
 * render() {
 *   const { total, loaded, titles } = this.#summary();
 * }
 * ```
 */
export function $usePostsWithCombine(getIds: () => number[], client?: QueryClient) {
	return $useQueries(
		() => ({
			queries: getIds().map(id => postQuery(id)),
			combine: results => ({
				total: results.length,
				loaded: results.filter(r => r.isSuccess).length,
				titles: results.map(r => (r.isSuccess ? (r.data?.title ?? "") : null)),
			}),
		}),
		client,
	);
}
