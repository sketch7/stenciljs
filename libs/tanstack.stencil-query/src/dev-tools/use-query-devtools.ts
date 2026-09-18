import { useLoadEffect } from "@ssv/stencil-core";
import type { Ref } from "@ssv/stencil-core";
import { Build } from "@stencil/core";
import { onlineManager } from "@tanstack/query-core";
import type { QueryClient } from "@tanstack/query-core";
import type { TanstackQueryDevtools } from "@tanstack/query-devtools";

import { useQueryClient } from "../query-client-context";

export type DevtoolsButtonPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "relative";
export type DevtoolsPosition = "top" | "bottom" | "left" | "right";
export type DevtoolsTheme = "light" | "dark" | "system";

export type DevtoolsErrorType = {
	name: string;
	initializer?: (query: unknown) => unknown;
};

/**
 * Options for {@link useQueryDevtools}.
 *
 * @example
 * ```ts
 * readonly #devtools = useQueryDevtools({ initialIsOpen: true, buttonPosition: 'bottom-left' });
 * ```
 */
export type UseQueryDevtoolsOptions = {
	/**
	 * Mount the devtools panel. Defaults to `process.env.NODE_ENV === 'development'` —
	 * disabled in production (and any non-development environment) unless explicitly set.
	 */
	enabled?: boolean;
	/** Use an explicit `QueryClient` instead of the one from context. */
	client?: QueryClient | Ref<QueryClient>;
	/** Position of the TanStack logo button. Defaults to `'bottom-right'`. */
	buttonPosition?: DevtoolsButtonPosition;
	/** Position of the devtools panel. Defaults to `'bottom'`. */
	position?: DevtoolsPosition;
	/** Open the panel by default. */
	initialIsOpen?: boolean;
	/** Custom error types to surface in the devtools panel. */
	errorTypes?: DevtoolsErrorType[];
	/** CSP nonce applied to injected `<style>` tags. */
	styleNonce?: string;
	/** Attach devtools styles to a specific shadow root. */
	shadowDOMTarget?: ShadowRoot;
	/** Hide disabled queries from the panel. */
	hideDisabledQueries?: boolean;
	/** Color theme. Defaults to `'system'`. */
	theme?: DevtoolsTheme;
};

/**
 * Mounts the TanStack Query devtools panel for the nearest `QueryClient` in the component tree.
 *
 * Appends a container to `document.body` on `hostWillLoad` and removes it when the host
 * disconnects. Disabled by default in non-development environments (`process.env.NODE_ENV !== 'development'`).
 * Safe to call in SSR — skipped entirely when running server-side (`Build.isServer`).
 *
 * Import from the `dev-tools` sub-entrypoint so the `@tanstack/query-devtools` bundle is only
 * loaded when this hook is actually used:
 *
 * @example
 * ```ts
 * import { useQueryDevtools } from '@ssv/tanstack.stencil-query/dev-tools';
 *
 * export class AppRoot extends SsvElement {
 *   readonly #queryClient = provideQueryClient();
 *   _ = useQueryDevtools();
 * }
 * ```
 */
export function useQueryDevtools(options?: UseQueryDevtoolsOptions): void {
	if (Build.isServer) {
		return;
	}

	const enabled = options?.enabled ?? Build.isDev;
	if (!enabled) {
		return;
	}

	const clientRef = useQueryClient(options?.client);

	useLoadEffect(
		({ qc }) => {
			let active = true;
			let devtools: TanstackQueryDevtools | undefined;
			let container: HTMLDivElement | undefined;

			void (async () => {
				const { TanstackQueryDevtools: DevtoolsClass } = await import("@tanstack/query-devtools");
				if (!active) {
					return;
				}
				container = document.createElement("div");
				document.body.append(container);
				devtools = new DevtoolsClass({
					client: qc,
					queryFlavor: "Stencil Query",
					version: "5",
					onlineManager,
					buttonPosition: options?.buttonPosition,
					position: options?.position,
					initialIsOpen: options?.initialIsOpen,
					errorTypes: options?.errorTypes as never,
					styleNonce: options?.styleNonce,
					shadowDOMTarget: options?.shadowDOMTarget,
					hideDisabledQueries: options?.hideDisabledQueries,
					theme: options?.theme,
				});
				devtools.mount(container);
			})();

			return () => {
				active = false;
				devtools?.unmount();
				container?.remove();
			};
		},
		{ qc: clientRef },
	);
}
