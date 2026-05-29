import { createContext, useContext } from "@ssv/stencil-core";
import { Build } from "@stencil/core";

import { collectStartupContext } from "./startup-context.server";
import {
	createAuthStore,
	createConfigStore,
	createFeatureFlagsStore,
	createLocaleStore,
	createTenantStore,
	createThemeStore,
} from "./startup-context.stores";
import type {
	AuthStore,
	ConfigStore,
	FeatureFlagsStore,
	LocaleStore,
	TenantStore,
	ThemeStore,
} from "./startup-context.stores";

/**
 * Returns the SSR startup context during isolated component rendering.
 *
 * Stencil SSR renders each component without an ancestor `app-startup-context-provider`,
 * so context default factories fire. `Build.isServer` gates all call sites to the hydrate
 * bundle only — Rollup eliminates this function and its entire import chain from browser
 * bundles as unreachable code (no `process` ReferenceError on the client).
 *
 * `collectStartupContext` is the single source of truth: adding a field to any domain type
 * only requires updating that type and `collectStartupContext` — these factories never change.
 */
function getSSRContext() {
	// todo: improve this, and possibly pass cookies
	return collectStartupContext();
}

export const ConfigStoreContext = createContext<ConfigStore>(
	() => createConfigStore(Build.isServer ? getSSRContext().config : undefined),
	{ name: "config" },
);
export const ThemeStoreContext = createContext<ThemeStore>(
	() => createThemeStore(Build.isServer ? getSSRContext().theme : undefined),
	{ name: "theme" },
);
export const FeatureFlagsStoreContext = createContext<FeatureFlagsStore>(
	() => createFeatureFlagsStore(Build.isServer ? getSSRContext().featureFlags : undefined),
	{ name: "featureFlags" },
);
export const AuthStoreContext = createContext<AuthStore>(
	() => createAuthStore(Build.isServer ? getSSRContext().auth : undefined),
	{ name: "auth" },
);
export const LocaleStoreContext = createContext<LocaleStore>(
	() => createLocaleStore(Build.isServer ? getSSRContext().locale : undefined),
	{ name: "locale" },
);
export const TenantStoreContext = createContext<TenantStore>(
	() => createTenantStore(Build.isServer ? getSSRContext().tenant : undefined),
	{ name: "tenant" },
);

/** Resolves the nearest {@link ConfigStore} from context. */
export function useConfig() {
	return useContext(ConfigStoreContext);
}

/** Resolves the nearest {@link ThemeStore} from context. */
export function useTheme() {
	return useContext(ThemeStoreContext);
}

/** Resolves the nearest {@link FeatureFlagsStore} from context. */
export function useFeatureFlags() {
	return useContext(FeatureFlagsStoreContext);
}

/** Resolves the nearest {@link AuthStore} from context. */
export function useAuth() {
	return useContext(AuthStoreContext);
}

/** Resolves the nearest {@link LocaleStore} from context. */
export function useLocale() {
	return useContext(LocaleStoreContext);
}

/** Resolves the nearest {@link TenantStore} from context. */
export function useTenant() {
	return useContext(TenantStoreContext);
}
