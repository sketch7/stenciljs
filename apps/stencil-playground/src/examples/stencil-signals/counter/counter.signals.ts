import { computed, signal } from "@ssv/stencil-signals";

export const count = signal(0);
export const additionalValue = signal(0);
export const doubled = computed(() => additionalValue() * 2);
export const total = computed(() => count() + doubled());
