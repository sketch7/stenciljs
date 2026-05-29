import { SsvElement, provideContext, useLoadEffect } from "@ssv/stencil-core";
import { patchState } from "@ssv/stencil-signals/store";
import { Component, Prop, Watch, h } from "@stencil/core";

import {
	AuthStoreContext,
	ConfigStoreContext,
	FeatureFlagsStoreContext,
	LocaleStoreContext,
	TenantStoreContext,
	ThemeStoreContext,
} from "./startup-context.context";
import {
	createAuthStore,
	createConfigStore,
	createFeatureFlagsStore,
	createLocaleStore,
	createTenantStore,
	createThemeStore,
} from "./startup-context.stores";
import type { StartupContext } from "./startup-context.types";

/**
 * Infrastructure bridge that transfers Vike's server-collected startup context into
 * granular Stencil signal stores, making them available to all descendant components
 * via `useConfig()`, `useTheme()`, `useFeatureFlags()`, `useAuth()`, `useLocale()`, `useTenant()`.
 *
 * Place this component at the root of the Stencil component tree (e.g. in `+Layout.tsx`).
 * It has no visual output — renders only a `<slot />`.
 *
 * @example
 * ```tsx
 * // +Layout.tsx
 * <AppStartupContextProvider startupContext={startupContext}>
 *   {children}
 * </AppStartupContextProvider>
 * ```
 */
@Component({
	tag: "app-startup-context-provider",
	shadow: true,
})
export class AppStartupContextProvider extends SsvElement {
	/** Full startup context object transferred from the Vike server. */
	@Prop() startupContext!: StartupContext;

	readonly #config = createConfigStore();
	readonly #theme = createThemeStore();
	readonly #featureFlags = createFeatureFlagsStore();
	readonly #auth = createAuthStore();
	readonly #locale = createLocaleStore();
	readonly #tenant = createTenantStore();

	readonly _ = this.setup(() => {
		provideContext(ConfigStoreContext, this.#config);
		provideContext(ThemeStoreContext, this.#theme);
		provideContext(FeatureFlagsStoreContext, this.#featureFlags);
		provideContext(AuthStoreContext, this.#auth);
		provideContext(LocaleStoreContext, this.#locale);
		provideContext(TenantStoreContext, this.#tenant);

		// Seed all stores from the prop once it is set (hostWillLoad — after @Prop() is resolved).
		// Guard: during hydration, React sets DOM properties after Stencil's hostWillLoad fires,
		// so startupContext may be undefined here. @Watch handles the late-arriving prop.
		useLoadEffect(() => {
			if (!this.startupContext) {
				return;
			}
			this.#applyStartupContext(this.startupContext);
		});
	});

	/** Handles the prop arriving after hostWillLoad (hydration mode). */
	@Watch("startupContext")
	protected onStartupContextChange(ctx: StartupContext): void {
		if (!ctx) {
			return;
		}
		this.#applyStartupContext(ctx);
	}

	#applyStartupContext(ctx: StartupContext): void {
		patchState(this.#config, ctx.config);
		patchState(this.#theme, ctx.theme);
		patchState(this.#featureFlags, ctx.featureFlags);
		patchState(this.#auth, ctx.auth);
		patchState(this.#locale, ctx.locale);
		patchState(this.#tenant, ctx.tenant);
	}

	render() {
		return <slot />;
	}
}
