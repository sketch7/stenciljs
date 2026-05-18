import { AppTranslationsHost } from "@app/stencil-playground/react";
import type { JSX } from "react";

export default function Page(): JSX.Element {
	return (
		<div className="flex flex-col gap-6">
			<h1>Translations</h1>
			<p className="text-sm text-(--color-muted-fg)">
				Three levels of Stencil components sharing translations cached via TanStack Query with SSR hydration. Each level
				calls <code>useTranslations()</code> — only the root fetches (via <code>provideTransferState</code>); child
				components hit the cache. The <code>tr(key, params?)</code> closure handles plain keys and{" "}
				<code>{"{{token}}"}</code> interpolation.
			</p>
			<AppTranslationsHost />
		</div>
	);
}
