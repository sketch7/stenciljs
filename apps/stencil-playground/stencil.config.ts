import type { Config } from "@stencil/core";
import { reactOutputTarget } from "@stencil/react-output-target";

export const config: Config = {
	namespace: "app-playground",
	globalScript: "src/global.ts",
	sourceMap: true,
	buildEs5: false,
	outputTargets: [
		reactOutputTarget({
			outDir: "src/react",
			hydrateModule: "@app/stencil-playground/hydrate",
			clientModule: "@app/stencil-playground/react",
		}),
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
		// {
		// 	type: "docs-readme",
		// },
	],
};
