import type { StartupContext } from "./startup-context.types";

/**
 * Resolves the theme mode from a raw `Cookie` HTTP header value.
 *
 * Looks for `ssv-theme=light|dark|system`. Defaults to `"dark"` (matches the
 * CSS `:root` dark-first design) when the cookie is absent or set to `"system"`.
 */
function resolveThemeFromCookie(cookieHeader: string | undefined): "light" | "dark" {
	if (cookieHeader) {
		for (const part of cookieHeader.split(";")) {
			const [name, value] = part.trim().split("=");
			if (name === "ssv-theme") {
				return value === "light" ? "light" : "dark";
			}
		}
	}
	return "dark";
}

/**
 * Collects the startup context from server-side environment variables.
 *
 * **Server-only** — never imported in browser bundles (only consumed inside
 * `Build.isServer` branches, which Stencil tree-shakes from client output).
 *
 * This is the single source of truth for env → `StartupContext` mapping.
 * Adding a field to a domain type (e.g. `ConfigContext`) only requires updating
 * that type and this function — context/provider/store files need no changes.
 *
 * @param cookieHeader - Optional raw `Cookie` HTTP header. When provided, the
 *   `ssv-theme` cookie is parsed to resolve the user's persisted theme preference.
 *   Defaults to `"dark"` when absent (matches the CSS `:root` dark-first design).
 *
 * ### Environment variables
 *
 * | Variable          | Default                      | Description              |
 * | ----------------- | ---------------------------- | ------------------------ |
 * | `PORT`            | `3100`                       | Vike server port         |
 * | `API_BASE_URL`    | `http://localhost:{PORT}`    | Override API base URL    |
 * | `APP_LOCALE`      | `en-US`                      | Default locale           |
 * | `APP_TIMEZONE`    | _(empty)_                    | IANA timezone            |
 * | `APP_TENANT_ID`   | `default`                    | Tenant identifier        |
 * | `APP_TENANT_NAME` | _(empty)_                    | Tenant display name      |
 */
export function collectStartupContext(cookieHeader?: string): StartupContext {
	const port = process.env["PORT"] ?? "3100";
	const baseUrl = process.env["API_BASE_URL"] ?? `http://localhost:${port}`;

	return {
		config: { baseUrl },
		theme: { mode: resolveThemeFromCookie(cookieHeader) },
		featureFlags: { flags: {} },
		auth: { isAuthenticated: false },
		locale: {
			locale: process.env["APP_LOCALE"] ?? "en-US",
			timezone: process.env["APP_TIMEZONE"] ?? undefined,
		},
		tenant: {
			tenantId: process.env["APP_TENANT_ID"] ?? "default",
			tenantName: process.env["APP_TENANT_NAME"] ?? undefined,
		},
	};
}
