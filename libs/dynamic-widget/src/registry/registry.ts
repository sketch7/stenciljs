import type { WidgetDefinition, WidgetDefinitionInternal, WidgetRegistry } from "../types";

export function createWidgetRegistry(): WidgetRegistry {
	const map = new Map<string, WidgetDefinitionInternal>();

	return {
		register<TData>(type: string, definition: WidgetDefinition<TData>): void {
			const internal = definition as unknown as WidgetDefinitionInternal;
			map.set(type, internal);
			for (const alias of definition.aliases ?? []) {
				map.set(alias, internal);
			}
		},
		resolve(type: string): WidgetDefinitionInternal | undefined {
			return map.get(type);
		},
	};
}

export const widgetRegistry = createWidgetRegistry();
