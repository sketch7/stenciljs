export { createComposeRegistry, composeRegistry } from "./registry/registry";
export { provideCompositionRegistry } from "./registry/provide-composition-registry";
export { useCompositionRegistry, type CompositionRegistryRef } from "./registry/use-composition-registry";
export { ComposeRegistryContext } from "./registry/context";
export type {
	AliasesOf,
	ComposeDef,
	ComposeDefInternal,
	ComposeEventDetail,
	ComposeRegistry,
	CompositionDefsMap,
	CompositionNameOf,
} from "./types";
export { createCompositionDefs } from "./types";
