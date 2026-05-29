/** Configuration context — server-derived runtime config (e.g. API base URL). */
export type ConfigContext = {
	baseUrl: string;
};

/** Theme context — visual appearance settings. */
export type ThemeContext = {
	mode: "light" | "dark";
};

/** Feature flags context — key/value boolean flags. */
export type FeatureFlagsContext = {
	flags: Record<string, boolean>;
};

/** Auth context — authentication state. */
export type AuthContext = {
	isAuthenticated: boolean;
};

/** Locale context — language and regional settings. */
export type LocaleContext = {
	locale: string;
	timezone?: string;
};

/** Tenant context — multi-tenant identity. */
export type TenantContext = {
	tenantId: string;
	tenantName?: string;
};

/**
 * Full startup context transferred from the Vike server to Stencil components.
 *
 * @example
 * ```ts
 * // In a Stencil component (via useConfig, useTheme, etc.):
 * const config = useConfig();
 * // config().baseUrl()  →  reactive read
 * ```
 */
export type StartupContext = {
	config: ConfigContext;
	theme: ThemeContext;
	featureFlags: FeatureFlagsContext;
	auth: AuthContext;
	locale: LocaleContext;
	tenant: TenantContext;
};
