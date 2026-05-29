import { signalStore, withConfig, withState } from "@ssv/stencil-signals/store";

import type {
	AuthContext,
	ConfigContext,
	FeatureFlagsContext,
	LocaleContext,
	TenantContext,
	ThemeContext,
} from "./startup-context.types";

/** @internal Creates a fresh ConfigStore instance with optional initial state. */
export function createConfigStore(initial?: Partial<ConfigContext>) {
	return signalStore(withConfig({ isStateWritable: true }), withState({ baseUrl: initial?.baseUrl ?? "" }));
}

/** @internal Creates a fresh ThemeStore instance with optional initial state. */
export function createThemeStore(initial?: Partial<ThemeContext>) {
	return signalStore(
		withConfig({ isStateWritable: true }),
		withState({ mode: (initial?.mode ?? "light") as "light" | "dark" }),
	);
}

/** @internal Creates a fresh FeatureFlagsStore instance with optional initial state. */
export function createFeatureFlagsStore(initial?: Partial<FeatureFlagsContext>) {
	return signalStore(
		withConfig({ isStateWritable: true }),
		withState({ flags: initial?.flags ?? ({} as Record<string, boolean>) }),
	);
}

/** @internal Creates a fresh AuthStore instance with optional initial state. */
export function createAuthStore(initial?: Partial<AuthContext>) {
	return signalStore(
		withConfig({ isStateWritable: true }),
		withState({ isAuthenticated: initial?.isAuthenticated ?? false }),
	);
}

/** @internal Creates a fresh LocaleStore instance with optional initial state. */
export function createLocaleStore(initial?: Partial<LocaleContext>) {
	return signalStore(
		withConfig({ isStateWritable: true }),
		withState({ locale: initial?.locale ?? "en-US", timezone: initial?.timezone ?? "" }),
	);
}

/** @internal Creates a fresh TenantStore instance with optional initial state. */
export function createTenantStore(initial?: Partial<TenantContext>) {
	return signalStore(
		withConfig({ isStateWritable: true }),
		withState({ tenantId: initial?.tenantId ?? "default", tenantName: initial?.tenantName ?? "" }),
	);
}

export type ConfigStore = ReturnType<typeof createConfigStore>;
export type ThemeStore = ReturnType<typeof createThemeStore>;
export type FeatureFlagsStore = ReturnType<typeof createFeatureFlagsStore>;
export type AuthStore = ReturnType<typeof createAuthStore>;
export type LocaleStore = ReturnType<typeof createLocaleStore>;
export type TenantStore = ReturnType<typeof createTenantStore>;
