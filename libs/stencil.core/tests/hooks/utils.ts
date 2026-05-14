import type { ReactiveController } from "../../src/hooks/reactive-controller";
import { use } from "../../src/hooks/use";

export function useTracker(): ReactiveController {
	const ctrl: ReactiveController = {};
	use(ctrl);
	return ctrl;
}
