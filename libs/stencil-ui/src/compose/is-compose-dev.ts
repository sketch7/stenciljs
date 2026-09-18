/** @internal True when compose should emit dev-only warnings (not production). */
export function isComposeDevEnv(): boolean {
	try {
		const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV;
		if (nodeEnv === "production") {
			return false;
		}
	} catch {
		// ignore
	}
	return true;
}
