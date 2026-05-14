import { defineConfig } from "oxlint";

export default defineConfig({
	plugins: ["typescript", "import", "react", "react-perf", "jsx-a11y", "vitest", "unicorn"],
	env: {
		browser: true,
		es2022: true,
		node: true,
	},
	categories: {
		correctness: "error",
		suspicious: "error",
		perf: "error",
		restriction: "warn",
		style: "warn",
		pedantic: "warn",
	},
	rules: {
		// ── General ────────────────────────────────────────────────────────────
		curly: ["error", "all", "consistent"],
		"prefer-const": "error",
		"prefer-template": "error",
		"sort-keys": "off",
		eqeqeq: "error",
		"no-var": "error",
		"no-console": ["warn", { allow: ["warn", "error"] }],
		"no-process-exit": "off",
		"no-unused-vars": "off", // handled by typescript/no-unused-vars
		"no-ternary": "off",
		"no-nested-ternary": "off",
		"no-continue": "off",
		"no-plusplus": "off",
		"no-underscore-dangle": "off",
		"no-magic-numbers": "off",
		"no-use-before-define": "off",
		"no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
		"init-declarations": "off",
		"max-statements": ["warn", { max: 40 }],
		"max-params": ["warn", { max: 4 }],
		"max-classes-per-file": "off",
		"no-undefined": "off",
		"no-warning-comments": "off",
		"func-style": "off",
		"new-cap": "off",
		"require-await": "off",
		"eslint/max-lines": "off",
		"id-length": "off",
		"capitalized-comments": "off",
		"sort-imports": [
			"warn",
			{
				ignoreCase: true,
				ignoreDeclarationSort: true,
				ignoreMemberSort: true,
				memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
			},
		],
		"object-shorthand": "error",
		"prefer-destructuring": "off",

		// ── Import ─────────────────────────────────────────────────────────────
		"import/no-default-export": "error",
		"import/no-relative-parent-imports": "off",
		"import/exports-last": "off",
		"import/no-nodejs-modules": "off",
		"import/no-unassigned-import": ["error", { allow: ["**/*.css"] }],
		"import/extensions": [
			"error",
			{
				ts: "never",
				tsx: "never",
				js: "never",
				jsx: "never",
			},
		],
		"import/no-namespace": "error",
		"import/group-exports": "off",
		"import/no-named-export": "off",
		"import/no-cycle": "warn",
		"import/no-self-import": "error",
		"import/prefer-default-export": "off",

		// ── TypeScript ─────────────────────────────────────────────────────────
		"typescript/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
		"typescript/consistent-type-imports": ["error", { prefer: "type-imports" }],
		"typescript/no-explicit-any": "error",
		"typescript/explicit-function-return-type": ["warn", { allowExpressions: true }],
		"typescript/no-non-null-assertion": "warn",
		"typescript/consistent-type-definitions": ["warn", "type"],
		"typescript/no-require-imports": "error",
		"typescript/no-import-type-side-effects": "error",
		"typescript/prefer-nullish-coalescing": "warn",
		"typescript/prefer-optional-chain": "warn",
		"typescript/explicit-member-accessibility": "off",
		"typescript/explicit-module-boundary-types": "off",
		"typescript/prefer-readonly-parameter-types": "off",
		"typescript/require-await": "off",
		"typescript/strict-boolean-expressions": "off",
		"typescript/no-floating-promises": "error",
		"typescript/await-thenable": "error",
		"typescript/no-misused-promises": "error",
		"typescript/no-invalid-void-type": "off",
		"typescript/restrict-template-expressions": "warn",
		"typescript/no-unnecessary-type-assertion": "error",
		"typescript/no-wrapper-object-types": "error",
		"typescript/parameter-properties": ["error", { prefer: "parameter-property" }],

		// ── React (disabled globally — enabled in app overrides as needed) ─────
		"react/react-in-jsx-scope": "off",
		"react/jsx-filename-extension": "off",
		"react/no-multi-comp": "off",
		"react/jsx-max-depth": "off",
		"react/forbid-component-props": "off",

		// ── React Perf (disabled globally — enabled in app overrides as needed) ─
		"react-perf/jsx-no-new-array-as-prop": "off",
		"react-perf/jsx-no-new-object-as-prop": "off",
		"react-perf/jsx-no-new-function-as-prop": "off",
		"react-perf/jsx-no-jsx-as-prop": "off",

		// ── JSX A11y (disabled globally — enabled in app overrides as needed) ──
		"jsx-a11y/alt-text": "off",
		"jsx-a11y/anchor-has-content": "off",
		"jsx-a11y/anchor-is-valid": "off",
		"jsx-a11y/aria-props": "off",
		"jsx-a11y/aria-role": "off",
		"jsx-a11y/click-events-have-key-events": "off",
		"jsx-a11y/html-has-lang": "off",
		"jsx-a11y/img-redundant-alt": "off",
		"jsx-a11y/no-autofocus": "off",
		"jsx-a11y/no-redundant-roles": "off",
		"jsx-a11y/iframe-has-title": "off",
		"jsx-a11y/label-has-associated-control": "off",
		"jsx-a11y/tabindex-no-positive": "off",

		// ── Eslint ─────────────────────────────────────────────────────────────
		"eslint/max-lines-per-function": "off",

		// ── Vitest ─────────────────────────────────────────────────────────────
		"vitest/no-focused-tests": "error",
		"vitest/no-disabled-tests": "warn",
		"vitest/expect-expect": "warn", // helper assertion wrappers won't always have direct expect() calls
		"vitest/valid-expect": "error",
		"vitest/no-standalone-expect": "warn", // too strict in shared test-helper patterns
		"vitest/consistent-test-it": ["warn", { fn: "it" }],
		"vitest/require-hook": "off",
		"vitest/no-hooks": "off",
		"vitest/prefer-expect-assertions": "off",
		"vitest/max-expects": "off",

		// ── Unicorn ────────────────────────────────────────────────────────────
		"unicorn/no-array-for-each": "off",
		"unicorn/prefer-module": "off",
		"unicorn/no-null": "off",
		"unicorn/filename-case": "off",
		"unicorn/no-abusive-eslint-disable": "error",
		"unicorn/no-nested-ternary": "off",
		"unicorn/prefer-node-protocol": "error",
		"unicorn/throw-new-error": "error",
		"unicorn/no-useless-undefined": "warn",
		"unicorn/prefer-ternary": "off",
	},
	overrides: [
		{
			// StencilJS components — class-based, uses h() not React, HTML attrs not React attrs
			files: ["libs/*/src/**/*.tsx", "libs/*/src/**/*.ts", "libs/*/tests/**/*.tsx", "libs/*/tests/**/*.ts"],
			rules: {
				"react/rules-of-hooks": "off",
				"react/prefer-function-component": "off",
				// Stencil uses h() imported from @stencil/core, not React.createElement
				"react/react-in-jsx-scope": "off",
				// Stencil uses .tsx extension by convention
				"react/jsx-filename-extension": "off",
				// Stencil uses HTML class= attribute, not React className=
				"react/no-unknown-property": "off",
				// @Component, @Prop etc. are TS decorators, not constructor calls
				"new-cap": "off",
				// render() is a Stencil lifecycle method
				"class-methods-use-this": "off",

				// @Prop() requires explicit types for Stencil compiler type generation
				"typescript/no-inferrable-types": "off",
				// render() return type is implicit JSX; Stencil convention omits it
				"typescript/explicit-function-return-type": "off",
				"typescript/explicit-module-boundary-types": "off",
				// EventEmitter is referenced by emitDecoratorMetadata for @Event() — must be a runtime import
				"typescript/consistent-type-imports": "off",
				// Stencil's h JSX factory returns a loose type
				"typescript/no-unsafe-return": "off",
				// react-perf rules target React reconciliation; Stencil uses its own renderer
				"react-perf/jsx-no-new-array-as-prop": "off",
				"react-perf/jsx-no-new-object-as-prop": "off",
				"react-perf/jsx-no-new-function-as-prop": "off",
				"react-perf/jsx-no-jsx-as-prop": "off",
			},
		},
		{
			// Example apps with React — enable react/a11y/react-perf rules
			files: ["apps/*/src/**/*.tsx", "apps/*/src/**/*.ts"],
			rules: {
				"react/jsx-key": "error",
				"react/jsx-no-duplicate-props": "error",
				"react/jsx-no-undef": "error",
				"react/no-danger": "error",
				"react/no-danger-with-children": "error",
				"react/no-direct-mutation-state": "error",
				"react/no-string-refs": "error",
				"react/no-children-prop": "error",
				"react/exhaustive-deps": "warn",
				"react/jsx-fragments": ["warn", "syntax"],
				"react/jsx-boolean-value": ["warn", "never"],
				"react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],
				"react/jsx-no-constructed-context-values": "error",
				"react/no-array-index-key": "warn",
				"react/self-closing-comp": "warn",
				"react/iframe-missing-sandbox": "error",
				"react/no-namespace": "error",
				"react/jsx-props-no-spread-multi": "error",
				"react-perf/jsx-no-new-array-as-prop": "warn",
				"react-perf/jsx-no-new-object-as-prop": "warn",
				"react-perf/jsx-no-new-function-as-prop": "warn",
				"react-perf/jsx-no-jsx-as-prop": "warn",
				"jsx-a11y/alt-text": "error",
				"jsx-a11y/anchor-has-content": "error",
				"jsx-a11y/anchor-is-valid": "error",
				"jsx-a11y/aria-props": "error",
				"jsx-a11y/aria-role": "error",
				"jsx-a11y/click-events-have-key-events": "warn",
				"jsx-a11y/html-has-lang": "error",
				"jsx-a11y/img-redundant-alt": "warn",
				"jsx-a11y/no-autofocus": "warn",
				"jsx-a11y/no-redundant-roles": "warn",
				"jsx-a11y/iframe-has-title": "error",
				"jsx-a11y/label-has-associated-control": "error",
				"jsx-a11y/tabindex-no-positive": "warn",
			},
		},
		{
			// Storybook config — not a test environment; suppress vitest rules
			files: ["**/.storybook/**/*.ts", "**/.storybook/**/*.tsx"],
			rules: {
				"vitest/require-hook": "off",
			},
		},
		{
			// Storybook stories — allow default exports
			files: ["**/*.stories.tsx", "**/*.stories.ts"],
			rules: {
				"import/no-default-export": "off",
			},
		},
		{
			// Test files — relax some rules
			files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
			rules: {
				"typescript/no-explicit-any": "off",
				"typescript/no-non-null-assertion": "off",
				"typescript/no-extraneous-class": "off",
				"max-statements": "off",
				// jest plugin rules that fire via pedantic category — too opinionated for vitest usage
				"jest/prefer-lowercase-title": "off", // PascalCase describe names are idiomatic
				"jest/prefer-expect-assertions": "off", // requiring expect.assertions() in every test is excessive
				"jest/max-expects": "off", // splitting tests just to stay under 5 assertions is counter-productive
				// vitest — opinionated style rules
				"vitest/prefer-called-times": "off", // toHaveBeenCalledOnce() is readable vitest API
				"vitest/prefer-strict-boolean-matchers": "off", // toBeTruthy/toBeFalsy are idiomatic for non-boolean checks
				"vitest/no-importing-vitest-globals": "off", // explicit imports are preferred over globals
				"vitest/require-test-timeout": "off", // requiring a timeout on every unit test is excessive
				"vitest/consistent-test-filename": "off", // .spec.ts is a valid convention
				"vitest/prefer-describe-function-title": "off", // describe title matching an imported name is fine
				"jest/no-hooks": "off", // beforeEach/afterEach are standard vitest setup patterns
			},
		},
		// config files - vitest/tsdown and co
		{
			files: ["vitest.config.ts", "vitest.*.config.ts", "tsdown.config.ts"],
			rules: {
				"import/no-default-export": "off",
			},
		},
		{
			// Vike convention files — require default exports for pages, layouts, config
			files: ["**/pages/+*.ts", "**/pages/+*.tsx", "**/pages/**/+*.ts", "**/pages/**/+*.tsx"],
			rules: {
				"import/no-default-export": "off",
				// Page/Layout/Head components return JSX — explicit return type is noise
				"typescript/explicit-function-return-type": "off",
			},
		},
		{
			// Stencil globalScript — requires a default export and side-effect imports
			files: ["apps/stencil-playground/src/global.ts"],
			rules: {
				"import/no-default-export": "off",
				"import/no-unassigned-import": "off",
			},
		},
		{
			// StencilJS app components — override the general apps override (later wins)
			// Stencil uses h() not React, class components, HTML attributes (not React attrs)
			files: ["apps/stencil-playground/src/**/*.tsx", "apps/stencil-playground/src/**/*.ts"],
			rules: {
				"react/rules-of-hooks": "off",
				"react/prefer-function-component": "off",
				"react/no-unknown-property": "off",
				"new-cap": "off",
				"class-methods-use-this": "off",
				"typescript/no-inferrable-types": "off",
				"typescript/explicit-function-return-type": "off",
				"typescript/explicit-module-boundary-types": "off",
				"typescript/consistent-type-imports": "off",
				"typescript/no-unsafe-return": "off",
				"react-perf/jsx-no-new-array-as-prop": "off",
				"react-perf/jsx-no-new-object-as-prop": "off",
				"react-perf/jsx-no-new-function-as-prop": "off",
				"react-perf/jsx-no-jsx-as-prop": "off",
			},
		},
	],
	ignorePatterns: [
		"dist/**",
		"build/**",
		"coverage/**",
		"node_modules/**",
		"*.min.js",
		"pnpm-lock.yaml",
		// Stencil autogenerated files
		"components.d.ts",
		"libs/*/src/react/**",
		"libs/*/src/vue/**",
		"libs/*/src/angular/**",
		"apps/stencil-playground/src/react/**",
		"apps/stencil-playground/src/components.d.ts",
		"loader/**",
		"hydrate/**",
	],
});
