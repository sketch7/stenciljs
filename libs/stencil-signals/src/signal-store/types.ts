import type { Signal, WritableSignal } from "../adapters/types";
import type { StateSignals, StateSource } from "./state-source";

export type AnyMethod = (...args: never[]) => unknown;

export type ComputedDict = Record<string, Signal<unknown>>;

/** Loose upper bound for a methods record. */
export type MethodsDict = Record<string, AnyMethod>;

/**
 * The accumulated shape of a store as features compose. Each `withX` feature
 * contributes a partial of this; `signalStore` folds them left to right.
 */
export type StoreShape = {
	state: object;
	computed: ComputedDict;
	methods: MethodsDict;
	isStateWritable: boolean;
};

/** The starting shape before any feature runs. */
export type EmptyShape = {
	state: Record<never, never>;
	computed: Record<never, never>;
	methods: Record<never, never>;
	isStateWritable: true; // todo: default to false and require opt-in for writable stores?
};

type WritableStateMembers<State extends object> = {
	[K in keyof State]: WritableSignal<State[K]>;
};

type ReadonlyStateMembers<State extends object> = {
	[K in keyof State]: Signal<State[K]>;
};

/**
 * The store passed to `withComputed` / `withMethods` factories. State is
 * ALWAYS writable here so methods can mutate via `.set` / `.update`, regardless
 * of the public `isStateWritable` mode.
 */
export type StoreApi<Sh extends StoreShape> = WritableStateMembers<Sh["state"]> &
	Sh["computed"] &
	Sh["methods"] &
	StateSource<Sh["state"]>;

/**
 * The public store instance returned by `signalStore`. State keys are exposed
 * as `WritableSignal` (open, default) or read-only `Signal` when
 * `withConfig({ isStateWritable: false })` is composed in.
 */
export type Store<Sh extends StoreShape> = (Sh["isStateWritable"] extends false
	? ReadonlyStateMembers<Sh["state"]>
	: WritableStateMembers<Sh["state"]>) &
	Sh["computed"] &
	Sh["methods"] &
	StateSource<Sh["state"]>;

/** Configuration accepted by `withConfig`. */
export type StoreConfig = {
	/** When `false`, the public store exposes state as read-only. Defaults to `true`. */
	isStateWritable?: boolean;
};

/** Mutable accumulator threaded through every feature at runtime. */
export type MutableStoreInternals = {
	stateSignals: Record<string, WritableSignal<unknown>>;
	computedSignals: Record<string, Signal<unknown>>;
	methods: Record<string, AnyMethod>;
	initial: Record<string, unknown>;
	config: StoreConfig;
};

/**
 * A composable store feature. At runtime it contributes to the shared
 * accumulator; the `Input` / `Output` phantom types drive composition inference.
 */
export type SignalStoreFeature<
	Input extends StoreShape = StoreShape,
	Output extends Partial<StoreShape> = Partial<StoreShape>,
> = {
	(internals: MutableStoreInternals, store: StoreApi<Input>): void;
	readonly __output?: Output;
};

type OutputOf<F> = F extends SignalStoreFeature<infer _In, infer Out> ? Out : Record<never, never>;

/** Merge one feature's output partial onto the accumulated shape. */
export type MergeShape<Acc extends StoreShape, Out extends Partial<StoreShape>> = {
	state: Acc["state"] & (Out extends { state: infer S extends object } ? S : Record<never, never>);
	computed: Acc["computed"] & (Out extends { computed: infer C extends ComputedDict } ? C : Record<never, never>);
	methods: Acc["methods"] & (Out extends { methods: infer M extends MethodsDict } ? M : Record<never, never>);
	isStateWritable: Out extends { isStateWritable: infer W extends boolean } ? W : Acc["isStateWritable"];
};

/** Fold a tuple of features into the final accumulated shape, from `Base`. */
export type FoldShape<
	Features extends readonly SignalStoreFeature[],
	Base extends StoreShape = EmptyShape,
> = Features extends readonly [infer Head, ...infer Tail extends readonly SignalStoreFeature[]]
	? FoldShape<Tail, MergeShape<Base, OutputOf<Head>>>
	: Base;

/**
 * Fold a tuple of feature *output* partials onto `Base`. Used by the
 * `signalStore` / `signalStoreFeature` overloads: each parameter pins a
 * concrete `Input` shape (computed from prior outputs) so factory callbacks get
 * contextual types, while only the per-feature `Output` is inferred.
 */
export type FoldOuts<
	Outs extends readonly Partial<StoreShape>[],
	Base extends StoreShape = EmptyShape,
> = Outs extends readonly [infer Head extends Partial<StoreShape>, ...infer Tail extends readonly Partial<StoreShape>[]]
	? FoldOuts<Tail, MergeShape<Base, Head>>
	: Base;

export type SignalStoreFeatureOutputs<
	Outs extends readonly Partial<StoreShape>[],
	Acc extends StoreShape = EmptyShape,
> = Outs extends readonly [infer Head extends Partial<StoreShape>, ...infer Tail extends readonly Partial<StoreShape>[]]
	? [SignalStoreFeature<Acc, Head>, ...SignalStoreFeatureOutputs<Tail, FoldOuts<[Head], Acc>>]
	: [];

/** Merge two output partials together (used to type the result of `signalStoreFeature`). */
export type MergeOutput<A extends Partial<StoreShape>, B extends Partial<StoreShape>> = {
	state: (A extends { state: infer S1 extends object } ? S1 : Record<never, never>) &
		(B extends { state: infer S2 extends object } ? S2 : Record<never, never>);
	computed: (A extends { computed: infer C1 extends ComputedDict } ? C1 : Record<never, never>) &
		(B extends { computed: infer C2 extends ComputedDict } ? C2 : Record<never, never>);
	methods: (A extends { methods: infer M1 extends MethodsDict } ? M1 : Record<never, never>) &
		(B extends { methods: infer M2 extends MethodsDict } ? M2 : Record<never, never>);
} & (B extends { isStateWritable: infer W extends boolean }
	? { isStateWritable: W }
	: A extends { isStateWritable: infer W extends boolean }
		? { isStateWritable: W }
		: Record<never, never>);

/** Fold a tuple of features into a single combined output partial. */
export type FoldOutput<Features extends readonly SignalStoreFeature[]> = Features extends readonly [
	infer Head,
	...infer Tail extends readonly SignalStoreFeature[],
]
	? MergeOutput<OutputOf<Head>, FoldOutput<Tail>>
	: Record<never, never>;

/** Merge a tuple of output partials into a single combined output partial. */
export type MergeOutputs<Outs extends readonly Partial<StoreShape>[]> = Outs extends readonly [
	infer Head extends Partial<StoreShape>,
	...infer Tail extends readonly Partial<StoreShape>[],
]
	? MergeOutput<Head, MergeOutputs<Tail>>
	: Record<never, never>;

export type { StateSignals, StateSource };
