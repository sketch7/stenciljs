export { defineCompose } from "./registry/define-compose";
export { createComposeRegistry, composeRegistry } from "./registry/registry";
export { registerCompositionDefs } from "./registry/register-composition-defs";
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
