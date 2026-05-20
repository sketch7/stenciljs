import { SsvElement, useEffect } from "@ssv/stencil.core";
import { Component, State, h } from "@stencil/core";

@Component({
	tag: "app-effect-demo",
	styleUrl: "effect.css",
	shadow: true,
})
export class AppEffectDemo extends SsvElement {
	@State() private _keystrokes = 0;
	@State() private _forceCount = 0;

	// mount-only [] — persistent keydown listener; updates @State to trigger re-renders
	_ = useEffect(() => {
		const onKeydown = () => {
			this._keystrokes++;
		};
		globalThis.addEventListener("keydown", onKeydown);
		return () => globalThis.removeEventListener("keydown", onKeydown);
	}, []);

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
				</p>
			</div>
		);
	}
}
