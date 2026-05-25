import { SsvElement } from "@ssv/stencil-core";
import { Component, Prop, h } from "@stencil/core";

@Component({
	tag: "app-lol-draft-layout",
	styleUrl: "lol-draft-layout.css",
	shadow: true,
})
export class AppLolDraftLayout extends SsvElement {
	@Prop() sessionId: string | null = null;

	render() {
		return (
			<div class="layout">
				<header class="layout-header">
					<div class="header-brand">
						<span class="header-logo">⚔</span>
						<span class="header-title">Draft Lobby</span>
					</div>
					{this.sessionId && (
						<div class="header-session">
							<span class="session-dot" />
							<span class="session-live">LIVE</span>
						</div>
					)}
					{!this.sessionId && (
						<div class="header-session header-session--loading">
							<span class="spinner-sm" />
							<span>Starting session…</span>
						</div>
					)}
				</header>

				<div class="layout-body">
					<aside class="layout-champion-pool">
						<slot name="champion-pool" />
					</aside>

					<main class="layout-draft-area">
						<slot name="draft-area" />
					</main>

					<aside class="layout-draft-info">
						<slot name="draft-info" />
					</aside>
				</div>
			</div>
		);
	}
}
