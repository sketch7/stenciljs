// The dist-custom-elements runtime calls performance.measure('...', 'st:app:start') in
// appDidLoad, but never sets the mark (that only happens in bootstrapLazy / lazy-loader).
// Pre-set it here to avoid an unhandled SyntaxError in the test environment.
performance.mark("st:app:start");

// dist/components/index.js is generated from src/index.ts (the public API) and
// does not include test-only components. Glob all test-* component files so
// new components are picked up automatically; import concurrently for speed.
const testComponents = import.meta.glob("./dist/components/test-*.js");
await Promise.all(Object.values(testComponents).map(load => load()));

// oxlint-disable-next-line unicorn/require-module-specifiers
export {};
