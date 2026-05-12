import type { JSX } from "react";
import "../app.css";

export default function Layout({ children }: { children: React.ReactNode }): JSX.Element {
	return (
		<div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
			<Nav />
			<main className="flex-1 container mx-auto px-4 py-10 max-w-2xl">{children}</main>
		</div>
	);
}

function Nav(): JSX.Element {
	return (
		<header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-10">
			<div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-2xl">
				<a href="/" className="font-semibold text-[var(--color-fg)] tracking-tight">
					Vike Playground
				</a>
				<nav className="flex items-center gap-5 text-sm text-[var(--color-muted-fg)]">
					<a href="/counter" className="hover:text-[var(--color-fg)] transition-colors">
						Counter
					</a>
					<a href="/todo" className="hover:text-[var(--color-fg)] transition-colors">
						Todo
					</a>
				</nav>
			</div>
		</header>
	);
}
