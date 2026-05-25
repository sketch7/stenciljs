import { SsvElement } from "@ssv/stencil-core";
import { useLifecycleLogger } from "@ssv/stencil-core/dev";
import { Component, h } from "@stencil/core";

import { useTranslations } from "./translations.api";

@Component({
	tag: "app-translation-shell",
	styleUrl: "translation-shell.css",
	shadow: true,
})
export class AppTranslationShell extends SsvElement {
	readonly _lifecycle = useLifecycleLogger({ name: "translation-shell" });
	readonly #tr = useTranslations();

	render() {
		const { tr } = this.#tr;

		return (
			<div class="shell">
				<nav class="shell-nav" aria-label="Application navigation">
					<ul class="shell-nav-list">
						<li class="shell-nav-item shell-nav-item--active">{tr("nav.dashboard")}</li>
						<li class="shell-nav-item">{tr("nav.profile")}</li>
						<li class="shell-nav-item">{tr("nav.settings")}</li>
					</ul>
				</nav>
				<div class="shell-content">
					<app-translation-profile />
				</div>
			</div>
		);
	}
}
