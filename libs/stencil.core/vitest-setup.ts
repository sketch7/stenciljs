// The dist-custom-elements runtime calls performance.measure('...', 'st:app:start') in
// appDidLoad, but never sets the mark (that only happens in bootstrapLazy / lazy-loader).
// Pre-set it here to avoid an unhandled SyntaxError in the test environment.
performance.mark("st:app:start");

// dist/components/index.js is generated from src/index.ts (the public API) and
// does not include test-only components. Import each component file directly so
// auto-define-custom-elements triggers self-registration for each.
// test-parent.js also registers test-child as a nested dependency.
await import("./dist/components/test-counter.js");
await import("./dist/components/test-parent.js");

export {};
