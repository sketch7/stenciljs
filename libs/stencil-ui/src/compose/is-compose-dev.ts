// todo: remove and replace usages with logger
/** @internal True when compose should emit dev-only warnings (not production). */
export function isComposeDevEnv(): boolean {
	try {
		if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
			return false;
		}
	} catch {
		// ignore
	}
	return true;
}
