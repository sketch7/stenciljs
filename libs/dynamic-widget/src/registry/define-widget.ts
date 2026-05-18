import type { WidgetDefinition, WidgetRegistry } from "../types";
import { widgetRegistry } from "./registry";

/**
 * Registers a widget type in a registry.
 *
 * TData constrains the `mapData` signature and the wrapper's `@Prop() data`.
 * The output shape is declared on the wrapper via `@Event() ssvWidgetOutput: EventEmitter<TOutput>`.
 *
 * @param type - String key used in `<ssv-dynamic-widget name="...">`.
 * @param options - Widget definition including tag, optional mapData, and optional aliases.
 * @param registry - Target registry. Defaults to the global singleton.
 *
 * @example — wrapper component targeting an explicit registry
 * const r = createWidgetRegistry();
 * defineWidget<TimerData>("timer", { tag: "ssv-timer-widget" }, r);
 *
 * @example — global registry (no third arg)
 * defineWidget<TimerData>("timer", { tag: "ssv-timer-widget" });
 *
 * @example — mapData shorthand
 * defineWidget<TimerData>("timer", {
 *   tag: "app-timer",
 *   mapData: (d) => ({ duration: d.duration }),
 * });
 *
 * @example — with aliases
 * defineWidget<TimerData>("timer", {
 *   tag: "ssv-timer-widget",
 *   aliases: ["countdown", "kitchen-timer"],
 * });
 */
export function defineWidget<TData>(
	type: string,
	options: WidgetDefinition<TData>,
	registry: WidgetRegistry = widgetRegistry,
): void {
	registry.register<TData>(type, options);
}
