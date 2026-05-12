import { Config } from "@stencil/core";
import { reactOutputTarget } from "@stencil/react-output-target";

export const config: Config = {
	namespace: "ssv-playground",
	outputTargets: [
		reactOutputTarget({
			outDir: "src/react",
			hydrateModule: "@ssv/stencil-playground/hydrate",
			clientModule: "@ssv/stencil-playground/react",
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
		{
			type: "docs-readme",
		},
	],
};
