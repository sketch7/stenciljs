import type { Config } from "@stencil/core";

/**
 * Minimal Stencil config used only by `stencil-test` to compile test-only
 * components defined in `*.spec.tsx` files. Not used in the library build
 * (which is handled by `tsdown`).
 */
export const config: Config = {
	namespace: "stencil-core-test",
	srcDir: "tests",
	tsconfig: "tsconfig.stencil.json",
	outputTargets: [
		{
			type: "dist-custom-elements",
			customElementsExportBehavior: "auto-define-custom-elements",
			externalRuntime: false,
		},
	],
};
