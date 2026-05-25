import { use } from "@ssv/stencil-core";
import { useQuery } from "@ssv/tanstack.stencil-query";

import { useLolDraftQueryClient } from "../shared/lol-query-client";
import { useChampionFilter } from "./champion-filter.hooks";
import { CHAMPIONS_QUERY_KEY, fetchChampions } from "./champion.client";

export function useChampions() {
	const client = useLolDraftQueryClient();

	use({
		async hostWillLoad() {
			await client.current?.prefetchQuery({
				queryKey: CHAMPIONS_QUERY_KEY,
				queryFn: fetchChampions,
				staleTime: Infinity,
			});
		},
	});

	const championsRef = useQuery(() => ({
		queryKey: CHAMPIONS_QUERY_KEY,
		staleTime: Infinity,
		queryFn: fetchChampions,
	}));

	return {
		get query() {
			return championsRef();
		},
	};
}

/** Main champion hook — combines data fetching and filter state. */
export function useChampion() {
	return {
		champions: useChampions(),
		filter: useChampionFilter(),
	};
}
