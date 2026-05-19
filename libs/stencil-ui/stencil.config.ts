import type { Config } from "@stencil/core";

export const config: Config = {
	namespace: "ssv-stencil-ui",
	rollupConfig: {
		inputOptions: {
			external: [/^@ssv\/stencil\.core(\/.*)?$/],
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
