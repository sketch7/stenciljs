import { use } from "@ssv/stencil-core";
import { useQuery } from "@ssv/tanstack.stencil-query";

import { useConfig } from "../../../startup-context";
import { useLolDraftQueryClient } from "./lol-query-client";

export type LolTextMap = Record<string, string>;

const QUERY_KEY = ["lol-text"] as const;

async function fetchLolText(baseUrl: string): Promise<LolTextMap> {
	const url = `${baseUrl}/api/lol/text`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to fetch LoL text: ${res.status}`);
	}
	return res.json() as Promise<LolTextMap>;
}

export function useLoLText() {
	const client = useLolDraftQueryClient();
	const config = useConfig();

	use({
		async hostWillLoad() {
			const baseUrl = config.current?.baseUrl() ?? "";
			await client.current?.prefetchQuery({
				queryKey: QUERY_KEY,
				queryFn: async () => fetchLolText(baseUrl),
				staleTime: Infinity,
			});
		},
	});

	const textRef = useQuery(() => {
		const baseUrl = config.current?.baseUrl() ?? "";
		return { queryKey: QUERY_KEY, staleTime: Infinity, queryFn: async () => fetchLolText(baseUrl) };
	}, client);

	function t(key: string, fallback?: string): string {
		const map = textRef().data ?? {};
		return map[key] ?? fallback ?? key;
	}

	return {
		get query() {
			return textRef();
		},
		t,
	};
}
