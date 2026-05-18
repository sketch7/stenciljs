import type { JSX } from "react";
import "../app.css";

export default function Layout({ children }: { children: React.ReactNode }): JSX.Element {
	return (
		<div className="flex min-h-screen bg-(--color-bg) text-(--color-fg)">
			<Sidebar />
			<main className="max-w-3xl min-w-0 flex-1 px-6 py-8">{children}</main>
		</div>
	);
}

type NavItem = { href: string; label: string };
type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
	{
		title: "SSV / Core / Hooks",
		items: [
			{ href: "/ssv-stencil/core/hooks/lifecycle", label: "Lifecycle Explorer" },
			{ href: "/ssv-stencil/core/hooks/mouse", label: "Mouse Controller" },
			{ href: "/ssv-stencil/core/hooks/timer", label: "Timer Controller" },
		],
	},
	{
		title: "SSV / Core / Context",
		items: [{ href: "/ssv-stencil/core/context/counter", label: "Counter" }],
	},
	{
		title: "SSV / Core / Transfer State",
		items: [{ href: "/ssv-stencil/core/transfer-state", label: "Transfer State" }],
	},
	{
		title: "SSV Stencil / TanStack Store",
		items: [
			{ href: "/ssv-stencil/ts-store/counter", label: "Counter" },
			{ href: "/ssv-stencil/ts-store/todo", label: "Todo List" },
		],
	},
	{
		title: "SSV Stencil / TanStack Query",
		items: [{ href: "/ssv-stencil/ts-query/posts", label: "Posts" }],
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
		<aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-(--color-border) bg-(--color-surface)">
			<div className="border-b border-(--color-border) px-4 py-5">
				<a
					href="/"
					className="font-semibold tracking-tight text-(--color-fg) transition-colors hover:text-(--color-primary)">
					Vike Playground
				</a>
			</div>
			<nav className="flex flex-1 flex-col gap-5 px-3 py-4">
				{navSections.map(section => (
					<div key={section.title} className="flex flex-col gap-1">
						<span className="mb-1 px-2 text-[0.65rem] font-semibold tracking-widest text-(--color-muted-fg) uppercase">
							{section.title}
						</span>
						{section.items.map(item => (
							<a
								key={item.href}
								href={item.href}
								className="rounded-md px-2 py-1.5 text-sm text-(--color-muted-fg) transition-colors hover:bg-(--color-surface-hover) hover:text-(--color-fg)">
								{item.label}
							</a>
						))}
					</div>
				))}
			</nav>
		</aside>
	);
}
