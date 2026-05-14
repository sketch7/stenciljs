// The dist-custom-elements runtime calls performance.measure('...', 'st:app:start') in
// appDidLoad, but never sets the mark (that only happens in bootstrapLazy / lazy-loader).
// Pre-set it here to avoid an unhandled SyntaxError in the test environment.
performance.mark("st:app:start");

// Import test components compiled by stencil-test.
// test-parent.js auto-registers test-child as a nested dependency.
await import("./dist/components/test-counter.js");
await import("./dist/components/test-parent.js");

export {};
