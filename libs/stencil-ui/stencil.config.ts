import type { Config } from "@stencil/core";

import { externalizePeerDeps } from "../../scripts/stencil-external-deps";

export const config: Config = {
	namespace: "ssv-stencil-ui",
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
