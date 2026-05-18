import { use } from "@ssv/stencil.core";
import { useQuery, useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";

export type TranslationMap = Record<string, string>;

const QUERY_KEY = ["translations"] as const;
const STALE_TIME = Infinity;

// SSR needs an absolute URL; browser can use relative.
const translationsUrl =
	globalThis.window === undefined ? "http://localhost:3000/api/translations" : "/api/translations";

async function fetchTranslations(): Promise<TranslationMap> {
	const res = await fetch(translationsUrl);
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
