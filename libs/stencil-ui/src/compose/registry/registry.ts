import type { ComposeDefinition, ComposeDefinitionInternal, ComposeRegistry, CompositionDefsMap } from "../types";
import { isComposeDevEnv } from "./is-compose-dev";

export function createComposeRegistry(): ComposeRegistry {
	const map = new Map<string, ComposeDefinitionInternal>();
	const primaryKeys = new Set<string>();

	const warnOverwrite = (key: string): void => {
		if (isComposeDevEnv() && map.has(key)) {
			console.warn(`[compose] Overwriting existing registry entry for "${key}"`);
		}
	};

	const registry: ComposeRegistry = {
		register<TData>(type: string, definition: ComposeDefinition<TData>): ComposeRegistry {
			warnOverwrite(type);
			const internal = definition as unknown as ComposeDefinitionInternal;
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
		resolve(type: string): ComposeDefinitionInternal | undefined {
			return map.get(type);
		},
		listTypes(): string[] {
			return [...primaryKeys];
		},
	};
	return registry;
}

// Store the global singleton on globalThis so all module copies (duplicated by
// Rollup across lazy chunks) share the same instance. Without this, app code
// registering into `composeRegistry` and ssv-compose reading from it would each
// hit their own isolated Map.
const GLOBAL_REGISTRY_KEY = Symbol.for("@ssv/stencil-ui:composeRegistry");
type GlobalWithRegistry = typeof globalThis & { [GLOBAL_REGISTRY_KEY]?: ComposeRegistry };
const g = globalThis as GlobalWithRegistry;
if (!g[GLOBAL_REGISTRY_KEY]) {
	g[GLOBAL_REGISTRY_KEY] = createComposeRegistry();
}
export const composeRegistry: ComposeRegistry = g[GLOBAL_REGISTRY_KEY]!;
