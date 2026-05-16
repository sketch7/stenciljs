import { createContext } from "#lib";

export type TestCtxValue = { id: number };

let nextId = 1;

/** Each call to `createInstance()` (via `provideContext`) gets a unique `id`. */
export const TestContext = createContext<TestCtxValue>(() => ({ id: nextId++ }), { name: "test" });
