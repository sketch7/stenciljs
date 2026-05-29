import type { StartupContext } from "@app/stencil-playground/startup-context";

/**
 * Sets `data-theme` on the SSR'd `<html>` element from the server-resolved theme.
 *
 * This ensures the correct theme is present in the initial HTML — no flash for
 * JS-enabled users (the anti-FOUC script in +Head.tsx also handles this client-side),
 * and correct rendering when JavaScript is disabled (no-JS SSR mode).
 */
export default function htmlAttributes(pageContext: { startupContext: StartupContext }) {
	return { "data-theme": pageContext.startupContext.theme.mode };
}
