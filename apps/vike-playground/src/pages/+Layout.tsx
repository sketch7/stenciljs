import { AppStartupContextProvider } from "@app/stencil-playground/react";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageContext } from "vike-react/usePageContext";
import "../app.css";

import { EnvContext } from "../startup-context";

export default function Layout({ children }: { children: React.ReactNode }): JSX.Element {
	const { startupContext } = usePageContext();
	const [themeMode, setThemeMode] = useState<"light" | "dark">(startupContext.theme.mode);

	const ctx = useMemo(() => ({ ...startupContext, theme: { mode: themeMode } }), [startupContext, themeMode]);

	useEffect(() => {
		document.documentElement.dataset["theme"] = themeMode;
	}, [themeMode]);

	const toggleTheme = useCallback(() => setThemeMode(prev => (prev === "dark" ? "light" : "dark")), []);

	return (
		<EnvContext.Provider value={ctx}>
			<AppStartupContextProvider startupContext={ctx}>
				<div className="flex min-h-screen bg-(--color-bg) text-(--color-fg)">
					<Sidebar themeMode={themeMode} onThemeToggle={toggleTheme} />
					<main className="max-w-5xl min-w-0 flex-1 px-6 py-8">{children}</main>
				</div>
			</AppStartupContextProvider>
		</EnvContext.Provider>
	);
}

type NavItem = { href: string; label: string };
type NavSection = { title: string; items: NavItem[] };
type SidebarProps = { themeMode: "light" | "dark"; onThemeToggle: () => void };

const navSections: NavSection[] = [
	{
		title: "Overview",
		items: [{ href: "/overview", label: "Presentation" }],
	},
	{
		title: "Demos",
		items: [{ href: "/demos/lol-draft-lobby-simulator", label: "LoL Draft Lobby" }],
	},
	{
		title: "@ssv / Core / Hooks",
		items: [
			{ href: "/ssv-stencil/core/hooks/lifecycle", label: "Lifecycle Explorer" },
			{ href: "/ssv-stencil/core/hooks/mouse", label: "Mouse Controller" },
			{ href: "/ssv-stencil/core/hooks/timer", label: "Timer Controller" },
			{ href: "/ssv-stencil/core/hooks/effect", label: "useEffect" },
		],
	},
	{
		title: "@ssv / Core / Context",
		items: [{ href: "/ssv-stencil/core/context/counter", label: "Counter" }],
	},
	{
		title: "@ssv / Core / Transfer State",
		items: [{ href: "/ssv-stencil/core/transfer-state", label: "Transfer State" }],
	},
	{
		title: "@ssv / TanStack Store",
		items: [
			{ href: "/ssv-stencil/ts-store/counter", label: "Counter" },
			{ href: "/ssv-stencil/ts-store/todo", label: "Todo List" },
		],
	},
	{
		title: "@ssv / TanStack Query",
		items: [
			{ href: "/ssv-stencil/ts-query/posts", label: "Posts" },
			{ href: "/ssv-stencil/ts-query/posts-signals", label: "Posts (Signals)" },
			{ href: "/ssv-stencil/ts-query/translations", label: "Translations" },
			{ href: "/ssv-stencil/ts-query/prefetch", label: "Prefetch" },
		],
	},
	{
		title: "@ssv / Stencil Signals",
		items: [
			{ href: "/stencil-signals/counter", label: "Counter" },
			{ href: "/stencil-signals/todo", label: "Todo List" },
			{ href: "/stencil-signals/timer", label: "Timer" },
			{ href: "/stencil-signals/derived-async", label: "derivedAsync" },
			{ href: "/stencil-signals/computed-previous", label: "computedPrevious" },
			{ href: "/stencil-signals/mouse-event", label: "signalFromEvent" },
		],
	},
	{
		title: "@ssv / Stencil UI",
		items: [{ href: "/stencil-ui/compose", label: "Compose" }],
	},
	{
		title: "App / Startup Context",
		items: [{ href: "/startup-context", label: "Inspector" }],
	},
	{
		title: "Stencil / Store",
		items: [
			{ href: "/stencil/counter", label: "Counter" },
			{ href: "/stencil/todo", label: "Todo List" },
		],
	},
];

function Sidebar({ themeMode, onThemeToggle }: SidebarProps): JSX.Element {
	const { urlPathname } = usePageContext();

	return (
		<aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col overflow-y-auto border-r border-(--color-border) bg-(--color-surface)">
			<div className="flex items-center border-b border-(--color-border) px-4 py-4">
				<a
					href="/"
					className="text-sm font-semibold tracking-tight text-(--color-fg) transition-colors hover:text-(--color-primary)">
					Vike Playground
				</a>
				<button
					type="button"
					title={`Switch to ${themeMode === "dark" ? "light" : "dark"} mode`}
					onClick={onThemeToggle}
					className="ml-auto flex size-6 items-center justify-center rounded-md text-sm text-(--color-muted-fg) transition-colors hover:bg-(--color-surface-hover) hover:text-(--color-fg)">
					{themeMode === "dark" ? "☀" : "☾"}
				</button>
			</div>
			<nav className="flex flex-1 flex-col gap-3 px-2 py-3">
				{navSections.map(section => (
					<div key={section.title} className="flex flex-col gap-0.5">
						<span className="mb-0.5 px-2 text-[0.6rem] font-semibold tracking-widest text-(--color-muted-fg) uppercase">
							{section.title}
						</span>
						{section.items.map(item => {
							const isActive = urlPathname === item.href;
							return (
								<a
									key={item.href}
									href={item.href}
									aria-current={isActive ? "page" : undefined}
									className={
										isActive
											? "rounded-r-md border-l-2 border-(--color-nav-active-border) bg-(--color-nav-active-bg) py-1 pr-2 pl-1.5 text-xs font-medium text-(--color-nav-active-text) transition-colors"
											: "rounded-r-md border-l-2 border-transparent py-1 pr-2 pl-1.5 text-xs text-(--color-muted-fg) transition-colors hover:bg-(--color-surface-hover) hover:text-(--color-fg)"
									}>
									{item.label}
								</a>
							);
						})}
					</div>
				))}
			</nav>
		</aside>
	);
}
