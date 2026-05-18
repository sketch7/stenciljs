import { AppLifecycleDemo } from "@app/stencil-playground/react";
import { useState } from "react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	const [mounted, setMounted] = useState(true);

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-bold text-(--color-fg)">Lifecycle Hooks Explorer</h1>
				<p className="text-sm text-(--color-muted-fg)">
					Every <code>ReactiveController</code> hook fires and logs to the console. Mount, unmount, and force re-renders
					to see the full lifecycle sequence play out in real time.
				</p>
			</div>

			{/* Mount / Unmount toggle */}
			<div className="flex items-center gap-3">
				<button
					onClick={() => setMounted(m => !m)}
					className={[
						"inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
						mounted
							? "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)] hover:opacity-80"
							: "bg-[var(--color-primary)] text-white border-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
					].join(" ")}>
					<span>{mounted ? "⏏" : "⏺"}</span>
					{mounted ? "Unmount component" : "Mount component"}
				</button>

				<span
					className={[
						"inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
						mounted
							? "text-[#4ade80] bg-[#4ade8015] border-[#4ade8030]"
							: "text-[#f87171] bg-[#f8717115] border-[#f8717130]",
					].join(" ")}>
					<span className={`size-1.5 rounded-full ${mounted ? "animate-pulse bg-[#4ade80]" : "bg-[#f87171]"}`} />
					{mounted ? "connected" : "disconnected"}
				</span>
			</div>

			{/* Component sandbox */}
			<div className="rounded-xl border border-(--color-card-border) bg-(--color-card) p-5">
				{mounted ? (
					<AppLifecycleDemo />
				) : (
					<div className="flex items-center justify-center gap-2 py-10 text-sm text-(--color-muted-fg)">
						<span className="text-lg opacity-50">⬡</span>
						<span>Component is unmounted — click "Mount component" to reconnect it.</span>
					</div>
				)}
			</div>

			{/* Hook reference table */}
			<div className="flex flex-col gap-3">
				<h2 className="text-sm font-semibold text-(--color-fg)">Hook Reference</h2>
				<div className="overflow-hidden rounded-lg border border-(--color-border) text-xs">
					<table className="w-full">
						<thead>
							<tr className="border-b border-(--color-border) bg-(--color-surface)">
								<th className="px-3 py-2 text-left text-[0.65rem] font-semibold tracking-wider text-(--color-muted-fg) uppercase">
									Hook
								</th>
								<th className="px-3 py-2 text-left text-[0.65rem] font-semibold tracking-wider text-(--color-muted-fg) uppercase">
									Stencil lifecycle
								</th>
								<th className="px-3 py-2 text-left text-[0.65rem] font-semibold tracking-wider text-(--color-muted-fg) uppercase">
									When
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-(--color-border)">
							{hookRows.map(row => (
								<tr key={row.hook} className="transition-colors hover:bg-(--color-surface)">
									<td className="px-3 py-2">
										<span
											className="inline-block rounded px-2 py-0.5 font-mono text-[0.7rem] font-semibold"
											style={{ background: `${row.color}18`, color: row.color, border: `1px solid ${row.color}40` }}>
											{row.hook}
										</span>
									</td>
									<td className="px-3 py-2 font-mono text-(--color-muted-fg)">{row.stencil}</td>
									<td className="px-3 py-2 text-(--color-muted-fg)">{row.when}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Tips */}
			<div className="flex flex-col gap-2 text-xs text-(--color-muted-fg)">
				<p>
					Open DevTools and watch the <strong className="text-(--color-fg)">Console</strong> — each hook fires a styled{" "}
					<code>console.warn</code> so you can correlate the log entries with the timing in the browser.
				</p>
				<p>
					Click <strong className="text-(--color-fg)">Force Re-render</strong> inside the component to trigger an update
					cycle and see <code>hostWillUpdate</code>, <code>hostWillRender</code>, <code>hostDidRender</code>, and{" "}
					<code>hostDidUpdate</code> fire. Notice that <code>hostWillLoad</code> and <code>hostDidLoad</code> only fire
					once — on first load.
				</p>
				<p>
					Click <strong className="text-(--color-fg)">Unmount component</strong> above to remove the element from the
					DOM and see <code>hostDisconnected</code>. Re-mounting fires <code>hostConnected</code> again, followed by a
					fresh <code>hostWillLoad</code> / <code>hostDidLoad</code> sequence.
				</p>
			</div>
		</div>
	);
}

const hookRows = [
	{
		hook: "hostConnected",
		stencil: "connectedCallback",
		when: "Every time the element connects to the DOM",
		color: "#4ade80",
	},
	{
		hook: "hostDisconnected",
		stencil: "disconnectedCallback",
		when: "Every time the element disconnects",
		color: "#f87171",
	},
	{ hook: "hostWillLoad", stencil: "componentWillLoad", when: "Once — before the very first render", color: "#67e8f9" },
	{ hook: "hostDidLoad", stencil: "componentDidLoad", when: "Once — after the very first render", color: "#60a5fa" },
	{
		hook: "hostWillRender",
		stencil: "componentWillRender",
		when: "Before every render (first and subsequent)",
		color: "#fde047",
	},
	{
		hook: "hostDidRender",
		stencil: "componentDidRender",
		when: "After every render (first and subsequent)",
		color: "#fb923c",
	},
	{
		hook: "hostWillUpdate",
		stencil: "componentWillUpdate",
		when: "Before a re-render — never called on first render",
		color: "#a78bfa",
	},
	{
		hook: "hostDidUpdate",
		stencil: "componentDidUpdate",
		when: "After a re-render — never called on first render",
		color: "#f472b6",
	},
] as const;
