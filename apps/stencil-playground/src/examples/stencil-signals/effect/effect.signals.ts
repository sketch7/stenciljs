import { signal } from "@ssv/stencil-signals";

export const count = signal(0);
export const history = signal<number[]>([]);
export const milestones = signal<string[]>([]);
