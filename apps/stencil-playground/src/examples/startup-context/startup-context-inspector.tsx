import { SsvElement } from "@ssv/stencil-core";
import { useSignalWatcher } from "@ssv/stencil-signals";
import { Component, h } from "@stencil/core";

import { useAuth, useConfig, useFeatureFlags, useLocale, useTenant, useTheme } from "../../startup-context";

@Component({
	tag: "app-startup-context-inspector",
	styleUrl: "startup-context-inspector.css",
	shadow: true,
})
export class AppStartupContextInspector extends SsvElement {
	readonly #config = useConfig();
	readonly #theme = useTheme();
	readonly #featureFlags = useFeatureFlags();
	readonly #auth = useAuth();
	readonly #locale = useLocale();
	readonly #tenant = useTenant();

	readonly signalWatcher = useSignalWatcher();

	render() {
		const c = this.#config.current;
		const t = this.#theme.current;
		const ff = this.#featureFlags.current;
		const a = this.#auth.current;
		const l = this.#locale.current;
		const te = this.#tenant.current;
		// todo: implement c() which gets state as signal
		const snapshot: Record<string, unknown> = {
			config: c ? { baseUrl: c.baseUrl() } : null,
			theme: t ? { mode: t.mode() } : null,
			featureFlags: ff ? { flags: ff.flags() } : null,
			auth: a ? { isAuthenticated: a.isAuthenticated() } : null,
			locale: l ? { locale: l.locale(), timezone: l.timezone() || undefined } : null,
			tenant: te ? { tenantId: te.tenantId(), tenantName: te.tenantName() || undefined } : null,
		};

		return (
			<div class="inspector">
				<div class="domains">
					{Object.entries(snapshot).map(([key, value]) => (
						<section class="domain" key={key}>
							<h3 class="domain-name">{key}</h3>
							<pre class="json-block">{JSON.stringify(value, null, 2)}</pre>
						</section>
					))}
				</div>
			</div>
		);
	}
}
