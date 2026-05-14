import { use } from "#lib";
import type { ReactiveController } from "#lib";

export function useTracker(): ReactiveController {
	const ctrl: ReactiveController = {};
	use(ctrl);
	return ctrl;
}
