import { use } from "@ssv/stencil.core";
import { useQuery } from "@ssv/tanstack.stencil-query";

import { useLolDraftQueryClient } from "./lol-query-client";
import { BASE_URL } from "./lol.constants";

export type LolTextMap = Record<string, string>;

const QUERY_KEY = ["lol-text"] as const;

async function fetchLolText(): Promise<LolTextMap> {
	const url = `${BASE_URL}/api/lol/text`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to fetch LoL text: ${res.status}`);
	}
	return res.json() as Promise<LolTextMap>;
}

export function useLoLText() {
	const client = useLolDraftQueryClient();

	use({
		async hostWillLoad() {
			await client.current?.prefetchQuery({ queryKey: QUERY_KEY, queryFn: fetchLolText, staleTime: Infinity });
		},
	});

	const textRef = useQuery(() => ({ queryKey: QUERY_KEY, staleTime: Infinity, queryFn: fetchLolText }));

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
