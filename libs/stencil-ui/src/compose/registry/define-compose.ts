import type { ComposeDefinition, ComposeRegistry } from "../types";
import { composeRegistry } from "./registry";

/**
 * Registers a compose type in a registry.
 *
 * TData constrains the `mapData` signature and the wrapper's `@Prop() data`.
 * The output shape is declared on the wrapper via `@Event() ssvComposeOutput: EventEmitter<TOutput>`.
 *
 * @param type - String key used in `<ssv-compose name="...">`.
 * @param options - Compose definition including tag, optional mapData, and optional aliases.
 * @param registry - Target registry. Defaults to the global singleton.
 *
 * @example — wrapper component targeting an explicit registry
 * const r = createComposeRegistry();
 * defineCompose<TimerData>("timer", { tag: "ssv-timer-widget" }, r);
 *
 * @example — global registry (no third arg)
 * defineCompose<TimerData>("timer", { tag: "ssv-timer-widget" });
 *
 * @example — mapData shorthand
 * defineCompose<TimerData>("timer", {
 *   tag: "app-timer",
 *   mapData: (d) => ({ duration: d.duration }),
 * });
 *
 * @example — with aliases
 * defineCompose<TimerData>("timer", {
 *   tag: "ssv-timer-widget",
 *   aliases: ["countdown", "kitchen-timer"],
 * });
 */
export function defineCompose<TData>(
	type: string,
	options: ComposeDefinition<TData>,
	registry: ComposeRegistry = composeRegistry,
): ComposeRegistry {
	return registry.register<TData>(type, options);
}
