import { SsvElement } from "@ssv/stencil-core";
import { useAtom } from "@ssv/tanstack.stencil-store";
import { Component, h } from "@stencil/core";

import { notificationAtom } from "./notification.store";

@Component({
	tag: "app-lol-notification",
	styleUrl: "lol-notification.css",
	shadow: true,
})
export class AppLolNotification extends SsvElement {
	readonly #notification = useAtom(() => notificationAtom);

	render() {
		const notification = this.#notification.value;
		if (!notification) {
			return null;
		}

		return (
			<div class={`toast toast--${notification.type}`} role="alert" aria-live="assertive" aria-atomic="true">
				<span class="toast-icon">
					{notification.type === "error" ? "⚠" : notification.type === "success" ? "✓" : "ℹ"}
				</span>
				<span class="toast-message">{notification.message}</span>
				<button type="button" class="toast-close" aria-label="Dismiss" onClick={() => notificationAtom.set(null)}>
					✕
				</button>
			</div>
		);
	}
}
