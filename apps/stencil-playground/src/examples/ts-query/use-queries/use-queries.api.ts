import { queryOptions, useQueries } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";
import { $useQueries } from "@ssv/tanstack.stencil-query/signals";

export type Post = {
	userId: number;
	id: number;
	title: string;
	body: string;
};

export type User = {
	id: number;
	name: string;
	username: string;
	email: string;
};

// ── Query keys ────────────────────────────────────────────────────────────────

export const postKeys = {
	all: ["use-queries-posts"] as const,
	detail: (id: number) => [...postKeys.all, id] as const,
};

export const userKeys = {
	all: ["use-queries-users"] as const,
	detail: (id: number) => [...userKeys.all, id] as const,
};

// ── Query options ─────────────────────────────────────────────────────────────

export const postQueries = {
	detail: (id: number) =>
		queryOptions({
			queryKey: postKeys.detail(id),
			queryFn: () => fetchPost(id),
		}),
};

export const userQueries = {
	detail: (id: number) =>
		queryOptions({
			queryKey: userKeys.detail(id),
			queryFn: () => fetchUser(id),
		}),
};

// ── Reusable hooks ────────────────────────────────────────────────────────────

/**
 * Fetches a post and user simultaneously using `useQueries`.
 * Encapsulates the query definitions so the component only renders.
 *
 * @example
 * ```ts
 * readonly #api = usePostAndUser(1, 1);
 * render() {
 *   const [post, user] = this.#api();
 * }
 * ```
 */
export function usePostAndUser(postId: number, userId: number, queryClient?: QueryClient) {
	return useQueries([postQueries.detail(postId), userQueries.detail(userId)], queryClient);
}

/**
 * Signal-based variant — fetches post and user via `$useQueries`.
 * Results are wrapped in a single signal.
 *
 * @example
 * ```ts
 * readonly #results = $usePostAndUser(1, 1);
 * render() {
 *   const [post, user] = this.#results();
 * }
 * ```
 */
export function $usePostAndUser(postId: number, userId: number, queryClient?: QueryClient) {
	return $useQueries([postQueries.detail(postId), userQueries.detail(userId)], queryClient);
}

// ── Private fetch functions ───────────────────────────────────────────────────

async function fetchPost(id: number): Promise<Post> {
	const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
	if (!res.ok) {
		throw new Error(`Failed to fetch post ${id}: ${res.status}`);
	}
	return res.json() as Promise<Post>;
}

async function fetchUser(id: number): Promise<User> {
	const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
	if (!res.ok) {
		throw new Error(`Failed to fetch user ${id}: ${res.status}`);
	}
	return res.json() as Promise<User>;
}
