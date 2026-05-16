import type { JSX } from "react";
import "../app.css";

export default function Layout({ children }: { children: React.ReactNode }): JSX.Element {
	return (
		<div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
			<Sidebar />
			<main className="flex-1 min-w-0 px-6 py-8 max-w-3xl">{children}</main>
		</div>
	);
}

type NavItem = { href: string; label: string };
type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
	{
		title: "SSV / Core / Hooks",
		items: [
			{ href: "/ssv-stencil/core/hooks/mouse", label: "Mouse Controller" },
			{ href: "/ssv-stencil/core/hooks/timer", label: "Timer Controller" },
		],
	},
	{
		title: "SSV / Core / Context",
		items: [{ href: "/ssv-stencil/core/context/counter", label: "Counter" }],
	},
	{
		title: "SSV Stencil / TanStack Store",
		items: [
			{ href: "/ssv-stencil/ts-store/counter", label: "Counter" },
			{ href: "/ssv-stencil/ts-store/todo", label: "Todo List" },
		],
	},
	{
		title: "Stencil Signals",
		items: [
			{ href: "/stencil-signals/counter", label: "Counter" },
			{ href: "/stencil-signals/todo", label: "Todo List" },
			{ href: "/stencil-signals/timer", label: "Timer" },
			{ href: "/stencil-signals/derived-async", label: "Derived Async" },
			{ href: "/stencil-signals/computed-previous", label: "Computed Previous" },
			{ href: "/stencil-signals/mouse-event", label: "Mouse event (signalFromEvent)" },
		],
	},
	{
		title: "Stencil",
		items: [
			{ href: "/stencil/counter", label: "Counter" },
			{ href: "/stencil/todo", label: "Todo List" },
		],
	},
];

function Sidebar(): JSX.Element {
	return (
		<aside className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col sticky top-0 h-screen overflow-y-auto">
			<div className="px-4 py-5 border-b border-[var(--color-border)]">
				<a
					href="/"
					className="font-semibold tracking-tight text-[var(--color-fg)] hover:text-[var(--color-primary)] transition-colors">
					Vike Playground
				</a>
			</div>
			<nav className="flex flex-col gap-5 px-3 py-4 flex-1">
				{navSections.map(section => (
					<div key={section.title} className="flex flex-col gap-1">
						<span className="px-2 mb-1 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--color-muted-fg)]">
							{section.title}
						</span>
						{section.items.map(item => (
							<a
								key={item.href}
								href={item.href}
								className="px-2 py-1.5 rounded-md text-sm text-[var(--color-muted-fg)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface-hover)] transition-colors">
								{item.label}
							</a>
						))}
					</div>
				))}
			</nav>
		</aside>
	);
}
