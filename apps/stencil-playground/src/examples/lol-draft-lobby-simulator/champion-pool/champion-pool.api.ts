import { use } from "@ssv/stencil.core";
import { useQuery, useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";

import { BASE_URL } from "../shared/lol.constants";
import type { Champion } from "../shared/lol.types";

const QUERY_KEY = ["lol-champions"] as const;

async function fetchChampions(): Promise<Champion[]> {
	const url = `${BASE_URL}/api/lol/champions`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Failed to fetch champions: ${res.status}`);
	}
	return res.json() as Promise<Champion[]>;
}

export function useChampions(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);

	use({
		async hostWillLoad() {
			await client.current?.prefetchQuery({ queryKey: QUERY_KEY, queryFn: fetchChampions, staleTime: Infinity });
		},
	});

	const championsRef = useQuery(
		() => ({ queryKey: QUERY_KEY, staleTime: Infinity, queryFn: fetchChampions }),
		queryClient,
	);

	return {
		get query() {
			return championsRef();
		},
	};
}
