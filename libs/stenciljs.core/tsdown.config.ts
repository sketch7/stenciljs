import { defineConfig } from "tsdown";

export default defineConfig({
	entry: { index: "src/index.ts" },
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	external: ["@stencil/core"],
	hooks: {
		"build:done": async (ctx) => {
			const { promises: fs } = await import("node:fs");
			// rolldown-plugin-dts emits content-hashed chunk files; create stable index.d.ts redirects
			const distDir = new URL("dist/", import.meta.url);
			const files = await fs.readdir(new URL(".", distDir));
			const esm = files.find((f) => f !== "index.d.ts" && f.endsWith(".d.ts") && !f.endsWith(".d.cts"));
			const cjs = files.find((f) => f.endsWith(".d.cts") && !f.startsWith("index.d.cts"));
			if (esm) await fs.writeFile(new URL("index.d.ts", distDir), `export * from "./${esm}";\n`);
			if (cjs) await fs.writeFile(new URL("index.d.cts", distDir), `export * from "./${cjs}";\n`);
		},
	},
});
