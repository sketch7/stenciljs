import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
	name: "@ssv/stencil-signals",
	environment: 'node',
	include: ['tests/**/*.test.ts'],
	coverage: {
		provider: "v8",
		include: ["src/**/*.ts"],
		exclude: ["src/**/*.{spec,test}.ts"],
	},
  },
});
