import { AppStartupContextProvider } from "@app/stencil-playground/react";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePageContext } from "vike-react/usePageContext";
import "../app.css";

import { EnvContext } from "../startup-context";

type ThemePref = "system" | "light" | "dark";

export default function Layout({ children }: { children: React.ReactNode }): JSX.Element {
	const { startupContext } = usePageContext();

	// SSR-safe defaults; effects below sync from localStorage + matchMedia on the client.
	// sysDark seeds from startupContext so resolvedTheme matches the server-rendered ctx on hydration.
	const [themePref, setThemePref] = useState<ThemePref>("system");
	const [sysDark, setSysDark] = useState(startupContext.theme.mode === "dark");

	const resolvedTheme = useMemo(
		() => (themePref === "system" ? (sysDark ? "dark" : "light") : themePref),
		[themePref, sysDark],
	);

	// On mount: read persisted preference + current OS setting.
	useEffect(() => {
		const stored = localStorage.getItem("ssv-theme") as ThemePref | null;
		if (stored === "light" || stored === "dark" || stored === "system") {
			setThemePref(stored);
		}
		setSysDark(globalThis.matchMedia("(prefers-color-scheme: dark)").matches);
	}, []);

	// Track OS theme changes while in system mode.
	useEffect(() => {
		if (themePref !== "system") {
			return;
		}
		const mq = globalThis.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) => setSysDark(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [themePref]);

	// Apply resolved theme to DOM + persist preference.
	useEffect(() => {
		document.documentElement.dataset["theme"] = resolvedTheme;
		localStorage.setItem("ssv-theme", themePref);
		// Write a cookie so the server can resolve the correct theme for SSR (no-JS support).
		// Cookie Store API (Chrome/Edge/Safari 17+). Browsers without it (Firefox) receive
		// the dark default on no-JS page renders — acceptable for a dev playground.
		if ("cookieStore" in globalThis) {
			cookieStore
				.set({
					name: "ssv-theme",
					value: themePref,
					path: "/",
					sameSite: "lax",
					expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
				})
				.catch(() => {
					// ignore — cookie is only a server-side SSR hint, not critical
				});
		}
	}, [resolvedTheme, themePref]);

	const handleThemePrefChange = useCallback((pref: ThemePref) => setThemePref(pref), []);

	const ctx = useMemo(() => ({ ...startupContext, theme: { mode: resolvedTheme } }), [startupContext, resolvedTheme]);

	return (
		<EnvContext.Provider value={ctx}>
			<AppStartupContextProvider startupContext={ctx}>
				<div className="flex min-h-screen bg-(--color-bg) text-(--color-fg)">
					<Sidebar themePref={themePref} onThemePrefChange={handleThemePrefChange} />
					<main className="max-w-5xl min-w-0 flex-1 px-6 py-8">{children}</main>
				</div>
			</AppStartupContextProvider>
		</EnvContext.Provider>
	);
}

type NavItem = { href: string; label: string };
type NavSection = { title: string; items: NavItem[] };
type SidebarProps = { themePref: ThemePref; onThemePrefChange: (pref: ThemePref) => void };

const THEME_OPTIONS: { pref: ThemePref; icon: string; label: string }[] = [
	{ pref: "system", icon: "◑", label: "System" },
	{ pref: "light", icon: "☀", label: "Light" },
	{ pref: "dark", icon: "☾", label: "Dark" },
];

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
		title: "@ssv / Core / Observer",
		items: [{ href: "/ssv-stencil/core/doms", label: "Observers" }],
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
			{ href: "/stencil-signals/observer-signals", label: "elementSize / intersect" },
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

function Sidebar({ themePref, onThemePrefChange }: SidebarProps): JSX.Element {
	const { urlPathname } = usePageContext();

	const handleThemeClick = useCallback(
		(e: React.MouseEvent<HTMLButtonElement>) => {
			onThemePrefChange((e.currentTarget as HTMLButtonElement).dataset["pref"] as ThemePref);
		},
		[onThemePrefChange],
	);

	return (
		<aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col overflow-y-auto border-r border-(--color-border) bg-(--color-surface)">
			<div className="flex items-center border-b border-(--color-border) px-4 py-4">
				<a
					href="/"
					className="text-sm font-semibold tracking-tight text-(--color-fg) transition-colors hover:text-(--color-primary)">
					Vike Playground
				</a>
				<fieldset className="ml-auto flex items-center gap-0.5 rounded-md border border-(--color-border) p-0.5">
					<legend className="sr-only">Color theme</legend>
					{THEME_OPTIONS.map(({ pref, icon, label }) => (
						<button
							key={pref}
							type="button"
							data-pref={pref}
							aria-pressed={themePref === pref}
							aria-label={label}
							title={label}
							onClick={handleThemeClick}
							className={`flex size-5 items-center justify-center rounded text-[0.65rem] transition-colors ${
								themePref === pref
									? "bg-(--color-primary) text-white"
									: "text-(--color-muted-fg) hover:bg-(--color-surface-hover) hover:text-(--color-fg)"
							}`}>
							{icon}
						</button>
					))}
				</fieldset>
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
