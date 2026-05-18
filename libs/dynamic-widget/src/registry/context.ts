import { createContext } from "@ssv/stencil.core";

import type { ComposeRegistry } from "../types";
import { composeRegistry } from "./registry";

export const ComposeRegistryContext = createContext<ComposeRegistry>(() => composeRegistry, {
	name: "compose-registry",
});
