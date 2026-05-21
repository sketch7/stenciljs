import { highlightAll } from "./highlight.server";
import type { SnippetKey } from "./snippets";

export type Data = {
	highlighted: Record<SnippetKey, string>;
};

export async function data(): Promise<Data> {
	return { highlighted: await highlightAll() };
}
