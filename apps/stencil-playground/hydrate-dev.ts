/**
 * Dev-only hydrate wrapper that enables `runtimeLogging: true` on every
 * `renderToString` call so Stencil component logs (including `createLogger`
 * output) are forwarded to the Node.js console during SSR development.
 *
 * Used via the `@ssv/source` export condition for `@app/stencil-playground/hydrate`
 * when Vite resolves in dev mode. The plain `hydrate/index.mjs` is used in production.
 */
export * from "./hydrate/index.mjs";

import type { SerializeDocumentOptions, HydrateResults } from "./hydrate/index.mjs";
import * as hydrate from "./hydrate/index.mjs";

export const renderToString: {
	(html: string | unknown, options?: SerializeDocumentOptions): Promise<HydrateResults>;
} = (html, options) =>
	hydrate.renderToString(html as string, {
		runtimeLogging: true,
		...options,
	});
