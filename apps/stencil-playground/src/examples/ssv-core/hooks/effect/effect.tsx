import { SsvElement, useEffect } from "@ssv/stencil.core";
import { Component, State, h } from "@stencil/core";

/**
 * Reusable hook — defined once outside any component.
 * Drop it into any `SsvElement` to get online/offline tracking without copy-pasting
 * `addEventListener` / `removeEventListener` boilerplate every time.
 */
function useOnlineStatus(onChanged: (online: boolean) => void): void {
	useEffect(() => {
		onChanged(navigator.onLine);
		const handleOnline = () => onChanged(true);
		const handleOffline = () => onChanged(false);
		globalThis.addEventListener("online", handleOnline);
		globalThis.addEventListener("offline", handleOffline);
		return () => {
			globalThis.removeEventListener("online", handleOnline);
			globalThis.removeEventListener("offline", handleOffline);
		};
	}, []);
}

@Component({
	tag: "app-effect-demo",
	styleUrl: "effect.css",
	shadow: true,
})
export class AppEffectDemo extends SsvElement {
	@State() private _keystrokes = 0;
	@State() private _forceCount = 0;
	@State() private _online = true;

	// mount-only [] — persistent keydown listener; updates @State to trigger re-renders
	_ = useEffect(() => {
		const onKeydown = () => {
			this._keystrokes++;
		};
		globalThis.addEventListener("keydown", onKeydown);
		return () => globalThis.removeEventListener("keydown", onKeydown);
	}, []);

	// reusable hook — same call works in any component; no event wiring needed here
	_online$ = useOnlineStatus(online => {
		this._online = online;
	});

	// every render (no deps) — syncs browser tab title; restores on disconnect or next render
	_titleSync = useEffect(() => {
		const prev = document.title;
		document.title = `keystrokes: ${this._keystrokes}`;
		return () => {
			document.title = prev;
		};
	});

	render() {
		return (
			<div class="effect-demo">
				<div class="stats">
					<div class="stat">
						<span class="stat-label">Keystrokes</span>
						<span class="stat-value">{this._keystrokes}</span>
					</div>
					<div class="stat">
						<span class="stat-label">Re-renders</span>
						<span class="stat-value">{this._forceCount}</span>
					</div>
					<div class="stat">
						<span class="stat-label">Network</span>
						<span class={`stat-value ${this._online ? "stat-value--online" : "stat-value--offline"}`}>
							{this._online ? "Online" : "Offline"}
						</span>
					</div>
				</div>

				<button
					type="button"
					class="btn"
					onClick={() => {
						this._forceCount++;
					}}>
					Force re-render
				</button>

				<p class="hint">
					Press any key to increment the keystrokes counter (<code>useEffect(fn, [])</code> — mount-only).
					<br />
					Watch the browser tab title update on each render (<code>useEffect(fn)</code> — every render).
					<br />
					<strong>Network</strong> uses <code>useOnlineStatus</code> — a custom hook defined outside this component.
					Toggle your devtools network throttle to offline to see it flip.
				</p>
			</div>
		);
	}
}
