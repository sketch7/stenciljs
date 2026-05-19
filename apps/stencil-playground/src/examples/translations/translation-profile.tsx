import { SsvElement } from "@ssv/stencil.core";
import { useLifecycleLogger } from "@ssv/stencil.core/dev";
import { Component, State, h } from "@stencil/core";

import { useTranslations } from "./translations.api";

type ProfileStatus = "idle" | "success" | "error" | "empty";

@Component({
	tag: "app-translation-profile",
	styleUrl: "translation-profile.css",
	shadow: true,
})
export class AppTranslationProfile extends SsvElement {
	readonly _lifecycle = useLifecycleLogger({ name: "translation-profile" });
	readonly #tr = useTranslations();

	@State() name = "Alice";
	@State() status: ProfileStatus = "idle";

	private handleNameInput(e: Event) {
		this.name = (e.target as HTMLInputElement).value;
	}

	private save() {
		this.status = "success";
	}

	private clear() {
		this.status = "empty";
	}

	private triggerError() {
		this.status = "error";
	}

	private reset() {
		this.status = "idle";
	}

	render() {
		const { tr } = this.#tr;

		return (
			<div class="profile">
				<h2 class="profile-title">{tr("profile.title")}</h2>

				<div class="profile-field">
					<label class="profile-label">{tr("profile.display-name")}</label>
					<input class="profile-input" type="text" value={this.name} onInput={e => this.handleNameInput(e)} />
				</div>

				<div class="profile-actions">
					<button class="btn btn-primary" type="button" onClick={() => this.save()}>
						{tr("profile.save")}
					</button>
					<button class="btn btn-secondary" type="button" onClick={() => this.clear()}>
						Clear
					</button>
					<button class="btn btn-danger" type="button" onClick={() => this.triggerError()}>
						Simulate Error
					</button>
					{this.status !== "idle" && (
						<button class="btn btn-ghost" type="button" onClick={() => this.reset()}>
							Reset
						</button>
					)}
				</div>

				{this.status === "success" && (
					<p class="notice notice--success">{tr("profile.save:success", { name: this.name })}</p>
				)}
				{this.status === "error" && <p class="notice notice--error">{tr("general.error")}</p>}
				{this.status === "empty" && <p class="notice notice--empty">{tr("general.no-data")}</p>}

				<div class="profile-activity">
					<h3 class="profile-activity-title">{tr("profile.activity")}</h3>
					<p class="profile-activity-empty">{tr("profile.activity:no-data")}</p>
				</div>
			</div>
		);
	}
}
