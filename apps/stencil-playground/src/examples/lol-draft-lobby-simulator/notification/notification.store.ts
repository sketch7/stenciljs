import { createAtom } from "@ssv/tanstack.stencil-store";

export type LolNotification = {
	id: string;
	message: string;
	type: "error" | "success" | "info";
};

export const notificationAtom = createAtom<LolNotification | null>(null);

export function showNotification(message: string, type: LolNotification["type"] = "info", durationMs = 3500): void {
	const id = Math.random().toString(36).slice(2);
	notificationAtom.set({ id, message, type });
	setTimeout(() => {
		// Only clear if the same notification is still showing
		if (notificationAtom.get()?.id === id) {
			notificationAtom.set(null);
		}
	}, durationMs);
}
