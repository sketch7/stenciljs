import type { StartupContext } from "@app/stencil-playground/startup-context";
import { createContext, useContext } from "react";

export type { StartupContext } from "@app/stencil-playground/startup-context";
export type {
	ConfigContext,
	ThemeContext,
	FeatureFlagsContext,
	AuthContext,
	LocaleContext,
	TenantContext,
} from "@app/stencil-playground/startup-context";

/**
 * React context that carries the server-collected startup context through the React tree.
 *
 * Provided in `+Layout.tsx` via `EnvContext.Provider`. Consume with {@link useEnvContext}.
 *
 * @example
 * ```tsx
 * // Any React component inside Layout:
 * const { config } = useEnvContext();
 * ```
 */
export const EnvContext = createContext<StartupContext | undefined>(undefined);

/**
 * Returns the startup context from the nearest `EnvContext.Provider`.
 *
 * @throws if called outside of `EnvContext.Provider` (i.e. outside `+Layout.tsx` subtree).
 *
 * @example
 * ```tsx
 * const { config, featureFlags } = useEnvContext();
 * ```
 */
export function useEnvContext(): StartupContext {
	const ctx = useContext(EnvContext);
	if (!ctx) {
		throw new Error(
			"[startup-context] EnvContext is not provided. Wrap your app with EnvContext.Provider in +Layout.tsx.",
		);
	}
	return ctx;
}
