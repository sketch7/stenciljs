// oxlint-disable-next-line import/no-unassigned-import
import "@ssv/stencil-signals/tc39";
// oxlint-disable-next-line import/no-unassigned-import
import "./examples/compose/compose-defs";

// Stencil requires a default export from the globalScript entry.
// Side effects (registerCompositionDefs, etc.) run via the imports above.
export default function globalSetup(): void {}
