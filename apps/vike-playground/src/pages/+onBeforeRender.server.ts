import { collectStartupContext } from "../startup.server";

export function onBeforeRender(pageContext: { headers?: Record<string, string> }) {
	return {
		pageContext: {
			startupContext: collectStartupContext(pageContext.headers?.["cookie"]),
		},
	};
}
