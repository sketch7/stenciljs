import { use } from "@ssv/stencil-core";
import { useQuery, useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";

import { useConfig } from "../../startup-context";

export type TranslationMap = Record<string, string>;

const QUERY_KEY = ["translations"] as const;
const STALE_TIME = Infinity;

async function fetchTranslations(baseUrl: string): Promise<TranslationMap> {
	const url = `${baseUrl}/api/translations`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to fetch translations: ${res.status}`);
	}
	return res.json() as Promise<TranslationMap>;
}

export function useTranslations(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);
	const config = useConfig();

	use({
		async hostWillLoad() {
			const baseUrl = config.current?.baseUrl() ?? "";
			await client.current?.prefetchQuery({
				queryKey: QUERY_KEY,
				queryFn: async () => fetchTranslations(baseUrl),
				staleTime: STALE_TIME,
			});
		},
	});

	const translationsRef = useQuery(
		() => ({
			queryKey: QUERY_KEY,
			staleTime: STALE_TIME,
			queryFn: async () => fetchTranslations(config.current?.baseUrl() ?? ""),
		}),
		queryClient,
	);

	function tr(key: string, params?: Record<string, string>): string {
		const map = translationsRef().data ?? {};
		let value = map[key] ?? key;
		if (params) {
			value = value.replaceAll(/\{\{(?<key>\w+)\}\}/gu, (_, p: string) => params[p] ?? `{{${p}}}`);
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
