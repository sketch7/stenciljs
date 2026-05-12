import vikeReact from "vike-react/config";
import type { Config } from "vike/types";

const config: Config = {
	title: "Vike Playground",
	description: "StencilJS + Vike + @stencil/store demo with SSR hydration",
	extends: [vikeReact],
	ssr: true,
	// @stencil/ssr renders components asynchronously (via the hydrate module),
	// which causes the React tree to suspend. stream: "web" switches vike-react
	// to React web-streaming SSR so Suspense + async components are supported.
	stream: "web",
};

export default config;
