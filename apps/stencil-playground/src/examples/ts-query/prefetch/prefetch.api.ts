import { queryOptions, useQuery, usePrefetchQuery } from "@ssv/tanstack.stencil-query";

export type Post = {
	userId: number;
	id: number;
	title: string;
	body: string;
};

export const postKeys = {
	all: ["prefetch-posts"] as const,
	list: () => [...postKeys.all, "list"] as const,
	detail: (id: number) => [...postKeys.all, "detail", id] as const,
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
			queryFn: async () => fetchPostById(id),
		}),
};

export function prefetchPosts(): void {
	usePrefetchQuery(postQueries.list());
}

export function usePrefetchedPosts() {
	return useQuery(postQueries.list());
}

export function useHoveredPost(getPostId: () => number | null) {
	return useQuery(() => ({ ...postQueries.detail(getPostId() ?? 0), enabled: getPostId() !== null }));
}

// ── private ──────────────────────────────────────────────────────────────────

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
