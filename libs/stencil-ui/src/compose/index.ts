export {
	createComposeRegistry,
	provideCompositionRegistry,
	useCompositionRegistry,
	type CompositionRegistryRef,
} from "./registry/registry";
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
