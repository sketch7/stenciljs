import { use } from "@ssv/stencil-core";
import { useQuery, useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";

export type TranslationMap = Record<string, string>;

const QUERY_KEY = ["translations"] as const;
const STALE_TIME = Infinity;

async function fetchTranslations(): Promise<TranslationMap> {
	// Build.isServer is a Stencil compile-time constant: true in the hydrate bundle, false in
	// browser bundles. The module-level code runs inside Stencil's hydrateFactory closure where
	// `window` is already present in globalThis (mock DOM), so globalThis.window checks are
	// unreliable. Build.isServer is the correct signal.
	// NOTE: process.env must be inlined inside the Build.isServer branch — in browser bundles
	// Build.isServer is falsy (runtime or compile-time) so the branch is never evaluated, avoiding
	// ReferenceError: process is not defined on CSR navigations where there is no transfer state.
	const url = `http://localhost:3100/api/translations`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to fetch translations: ${res.status}`);
	}
	return res.json() as Promise<TranslationMap>;
}

export function useTranslations(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);

	use({
		async hostWillLoad() {
			await client.current?.prefetchQuery({ queryKey: QUERY_KEY, queryFn: fetchTranslations, staleTime: STALE_TIME });
		},
	});

	const translationsRef = useQuery(
		() => ({ queryKey: QUERY_KEY, staleTime: STALE_TIME, queryFn: fetchTranslations }),
		queryClient,
	);

	function tr(key: string, params?: Record<string, string>): string {
		const map = translationsRef().data ?? {};
		let value = map[key] ?? key;
		if (params) {
			value = value.replaceAll(/\{\{(\w+)\}\}/gu, (_, p) => params[p] ?? `{{${p}}}`);
		}
		return value;
	}

	return {
		get query() {
			return translationsRef();
		},
		tr,
	};
}
