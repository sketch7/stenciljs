import { collectStartupContext } from "../startup.server";

export function onBeforeRender() {
	return {
		pageContext: {
			startupContext: collectStartupContext(),
		},
	};
}
