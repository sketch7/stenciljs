import type { Config } from "@stencil/core";

export const config: Config = {
	namespace: "ssv-dynamic-widget",
	outputTargets: [
		{
			type: "dist",
			esmLoaderPath: "../loader",
		},
		{
			type: "dist-custom-elements",
			customElementsExportBehavior: "auto-define-custom-elements",
			externalRuntime: false,
		},
		{
			type: "dist-hydrate-script",
			dir: "./hydrate",
		},
	],
};
