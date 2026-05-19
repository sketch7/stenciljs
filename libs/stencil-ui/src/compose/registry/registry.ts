import type { ComposeDef, ComposeDefInternal, ComposeRegistry, CompositionDefsMap } from "../types";
import { isComposeDevEnv } from "./is-compose-dev";

export function createComposeRegistry(): ComposeRegistry {
	const map = new Map<string, ComposeDefInternal>();
	const primaryKeys = new Set<string>();

	const warnOverwrite = (key: string): void => {
		if (isComposeDevEnv() && map.has(key)) {
			console.warn(`[compose] Overwriting existing registry entry for "${key}"`);
		}
	};

	const registry: ComposeRegistry = {
		register<TData>(type: string, definition: ComposeDef<TData>): ComposeRegistry {
			warnOverwrite(type);
			const internal = definition as unknown as ComposeDefInternal;
			primaryKeys.add(type);
			map.set(type, internal);
			for (const alias of definition.aliases ?? []) {
				warnOverwrite(alias);
				map.set(alias, internal);
			}
			return registry;
		},
		registerFromDefs(defs: CompositionDefsMap): ComposeRegistry {
			for (const [type, definition] of Object.entries(defs)) {
				registry.register(type, definition);
			}
			return registry;
		},
		resolve(type: string): ComposeDefInternal | undefined {
			return map.get(type);
		},
		listTypes(): string[] {
			return [...primaryKeys];
		},
	};
	return registry;
}

// Store the global singleton on globalThis so all module copies (split by
// Stencil/Rollup across lazy chunks) share the same instance. App code that
// registers into `composeRegistry` and `ssv-compose` reading from it would
// otherwise hit separate isolated Maps.
const GLOBAL_REGISTRY_KEY = Symbol.for("@ssv/stencil-ui:composeRegistry");
type GlobalWithRegistry = typeof globalThis & { [GLOBAL_REGISTRY_KEY]?: ComposeRegistry };
const g = globalThis as GlobalWithRegistry;
if (!g[GLOBAL_REGISTRY_KEY]) {
	g[GLOBAL_REGISTRY_KEY] = createComposeRegistry();
}
export const composeRegistry: ComposeRegistry = g[GLOBAL_REGISTRY_KEY]!;
