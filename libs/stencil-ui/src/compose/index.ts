export { createCompositionRegistry, compositionRegistry } from "./registry/registry";
export { CompositionRegistryContext } from "./registry/context";
export { provideCompositionRegistry, useCompositionRegistry } from "./registry/provide-registry";
export type {
	CompositionDef,
	CompositionDefInternal,
	ComposeEventDetail,
	CompositionDefsList,
	CompositionDefsMap,
	CompositionRegistry,
	CompositionRegistrySetup,
	ProvideCompositionRegistryOptions,
} from "./types";
