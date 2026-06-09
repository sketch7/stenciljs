import { useQuery } from "@ssv/tanstack.stencil-query";

import { useConfig } from "../../../startup-context";
import { useLolDraftQueryClient } from "../shared/lol-query-client";
import { useChampionFilter } from "./champion-filter.hooks";
import { CHAMPIONS_QUERY_KEY, fetchChampions } from "./champion.client";

export function useChampions() {
	const client = useLolDraftQueryClient();
	const config = useConfig();

	const championsRef = useQuery(
		() => ({
			queryKey: CHAMPIONS_QUERY_KEY,
			staleTime: Infinity,
			queryFn: async () => fetchChampions(config.current?.baseUrl() ?? ""),
		}),
		client,
	);

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
