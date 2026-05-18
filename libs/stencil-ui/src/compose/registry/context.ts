import { createContext } from "@ssv/stencil.core";

import type { CompositionRegistry } from "../types";
import { compositionRegistry } from "./registry";

export const CompositionRegistryContext = createContext<CompositionRegistry>(() => compositionRegistry, {
	name: "composition-registry",
});
