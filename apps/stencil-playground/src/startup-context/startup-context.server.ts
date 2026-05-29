import type { StartupContext } from "./startup-context.types";

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
export function collectStartupContext(): StartupContext {
	const port = process.env["PORT"] ?? "3100";
	const baseUrl = process.env["API_BASE_URL"] ?? `http://localhost:${port}`;

	return {
		config: { baseUrl },
		theme: { mode: "light" },
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
