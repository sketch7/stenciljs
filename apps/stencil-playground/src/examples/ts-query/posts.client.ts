export type Post = {
	userId: number;
	id: number;
	title: string;
	body: string;
};

/**
 * Fetch a list of posts from JSONPlaceholder.
 *
 * @param limit - Number of posts to fetch (default: 10)
 */
export async function fetchPosts(limit = 10): Promise<Post[]> {
	console.warn(">>>> fetchPosts");
	const res = await fetch(`https://jsonplaceholder.typicode.com/posts?_limit=${limit}`);
	if (!res.ok) {
		throw new Error(`Failed to fetch posts: ${res.status}`);
	}
	return res.json() as Promise<Post[]>;
}

/**
 * Fetch a single post by id from JSONPlaceholder.
 */
export async function fetchPostById(id: number): Promise<Post> {
	const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
	if (!res.ok) {
		throw new Error(`Failed to fetch post ${id}: ${res.status}`);
	}
	return res.json() as Promise<Post>;
}

/**
 * Create a new post via JSONPlaceholder.
 */
export async function apiCreatePost(title: string): Promise<Post> {
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
