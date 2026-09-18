import replace from "@rollup/plugin-replace";
import type { Config } from "@stencil/core";
import { reactOutputTarget } from "@stencil/react-output-target";

const isDev = process.env.NODE_ENV === "development";
// Bake DEBUG into all Stencil output targets (custom elements + hydrate) at build time so
// that SSV loggers work in both browser and Node.js SSR contexts without requiring a
// bundler define from the consuming app.
const debugValue = process.env["SSV_DEBUG"] ?? (isDev ? "true" : "false");

export const config: Config = {
	namespace: "app-playground",
	globalScript: "src/global.ts",
	buildEs5: false,
	minifyJs: !isDev,
	minifyCss: !isDev,
	sourceMap: isDev,
	rollupPlugins: {
		before: [
			replace({
				preventAssignment: true,
				values: { DEBUG: JSON.stringify(debugValue) },
				// Only process project source files — avoids collisions with third-party code
				// (e.g. @logtape/logtape formatter) and Stencil's own virtual hydrate-factory
				// module, both of which use "DEBUG" as a string value.
				include: [/\/src\//, /\/libs\//],
			}),
		],
	},
	outputTargets: [
		reactOutputTarget({
			outDir: "src/react",
			hydrateModule: "@app/stencil-playground/hydrate",
			clientModule: "@app/stencil-playground/react-client",
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
