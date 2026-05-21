import { createHighlighter } from "shiki";

import { snippets } from "./snippets";
import type { SnippetKey } from "./snippets";

// Detect TSX by presence of JSX angle-bracket syntax
function detectLang(code: string): "tsx" | "typescript" {
	return /<[A-Z][a-zA-Z]*[\s/>]|<\/[a-zA-Z]|<slot|<div|<span|<ul|<li|<nav/u.test(code) ? "tsx" : "typescript";
}

let highlighterPromise: ReturnType<typeof createHighlighter> | undefined;

// oxlint-disable-next-line typescript/explicit-function-return-type
function getHighlighter() {
	highlighterPromise ??= createHighlighter({
		themes: ["github-dark-default"],
		langs: ["typescript", "tsx"],
	});
	return highlighterPromise;
}

export async function highlightAll(): Promise<Record<SnippetKey, string>> {
	const hl = await getHighlighter();
	const result = {} as Record<SnippetKey, string>;
	for (const [key, code] of Object.entries(snippets) as [SnippetKey, string][]) {
		result[key] = hl.codeToHtml(code, {
			lang: detectLang(code),
			theme: "github-dark-default",
		});
	}
	return result;
}
