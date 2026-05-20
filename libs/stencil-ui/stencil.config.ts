import type { Config } from "@stencil/core";

import { externalizePeerDeps } from "../../scripts/stencil-external-deps";

const isDev = process.env.NODE_ENV === "development";

export const config: Config = {
	namespace: "ssv-stencil-ui",
	buildEs5: false,
	minifyJs: !isDev,
	minifyCss: !isDev,
	sourceMap: isDev,
	rollupConfig: {
		inputOptions: {
			external: externalizePeerDeps(),
		},
	},
	outputTargets: [
		{
			type: "dist",
			esmLoaderPath: "../loader",
		},
		{
			type: "dist-custom-elements",
			customElementsExportBehavior: "auto-define-custom-elements",
			externalRuntime: true,
		},
		{
			type: "dist-hydrate-script",
			dir: "./hydrate",
		},
	],
};
