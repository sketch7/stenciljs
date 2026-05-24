import { use } from "@ssv/stencil.core";
import { useQuery, useQueryClient } from "@ssv/tanstack.stencil-query";
import type { QueryClient } from "@ssv/tanstack.stencil-query";

import { useChampionFilter } from "./champion-filter.hooks";
import { CHAMPIONS_QUERY_KEY, fetchChampions } from "./champion.client";

export function useChampions(queryClient?: QueryClient) {
	const client = useQueryClient(queryClient);

	use({
		async hostWillLoad() {
			await client.current?.prefetchQuery({
				queryKey: CHAMPIONS_QUERY_KEY,
				queryFn: fetchChampions,
				staleTime: Infinity,
			});
		},
	});

	const championsRef = useQuery(
		() => ({ queryKey: CHAMPIONS_QUERY_KEY, staleTime: Infinity, queryFn: fetchChampions }),
		queryClient,
	);

	return {
		get query() {
			return championsRef();
		},
	};
}

/** Main champion hook — combines data fetching and filter state. */
export function useChampion(queryClient?: QueryClient) {
	return {
		champions: useChampions(queryClient),
		filter: useChampionFilter(),
	};
}
