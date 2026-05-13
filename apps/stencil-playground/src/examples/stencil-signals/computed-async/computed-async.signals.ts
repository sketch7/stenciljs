import { signal } from "@ssv/stencil-signals";

export type ApiUser = {
	id: number;
	name: string;
	username: string;
	email: string;
	phone: string;
	website: string;
	company: { name: string };
	address: { city: string };
};

export const userId = signal(1);
export const USER_COUNT = 10;
