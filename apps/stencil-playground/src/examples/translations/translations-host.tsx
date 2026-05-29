import { SsvElement } from "@ssv/stencil-core";
import { useLifecycleLogger } from "@ssv/stencil-core/dev";
import { provideTransferState } from "@ssv/stencil-core/transfer-state";
import { provideQueryClient, useQueryHydration } from "@ssv/tanstack.stencil-query";
import { Component, h } from "@stencil/core";

import { useTranslations } from "./translations.api";

@Component({
	tag: "app-translations-host",
	styleUrl: "translations-host.css",
	shadow: true,
})
export class AppTranslationsHost extends SsvElement {
	readonly #queryClient = provideQueryClient();
	readonly #tr = useTranslations(this.#queryClient);
	readonly _ = this.setup(() => {
		provideTransferState("translations");
		useLifecycleLogger({ name: "translations-host" });
		useQueryHydration();
	});

	render() {
		const {
			query: { isPending, isError, error },
			tr,
		} = this.#tr;

		return (
			<div class="host">
				<header class="host-header">
					<span class="host-badge">i18n</span>
					<h1 class="host-title">{tr("authshell-dashboard.message")}</h1>
				</header>
				{isPending && <p class="host-status">Loading translations…</p>}
				{isError && <p class="host-status host-status--error">Error: {String(error)}</p>}
				{!isPending && !isError && <app-translation-shell />}
			</div>
		);
	}
}
