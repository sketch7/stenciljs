import { createContext } from "@ssv/stencil.core";

import type { WidgetRegistry } from "../types";
import { widgetRegistry } from "./registry";

export const WidgetRegistryContext = createContext<WidgetRegistry>(() => widgetRegistry, {
	name: "widget-registry",
});
