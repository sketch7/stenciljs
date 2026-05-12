import { createStore } from "@stencil/store";

const { state } = createStore({
	count: 0,
	additionalValue: 0,
});

export const counterStore = state;
