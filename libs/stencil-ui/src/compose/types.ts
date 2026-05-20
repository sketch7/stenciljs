/**
 * Public-facing definition type. Pass TData to constrain the mapProps signature.
 * TOutput is declared separately on wrapper components via @Event() ssvComposeOutput.
 */
export type ComposeDef<TData = unknown> = {
	/** Custom element tag name the registry passes to h(). */
	tag: string;
	/**
	 * Optional prop mapper. When provided, the mapped object is passed directly
	 * as props to `tag`. When omitted, `{ props }` is passed verbatim — the wrapper
	 * component is expected to accept `@Prop() props: TData`.
	 */
	mapProps?: (props: TData) => Record<string, unknown>;
	/**
	 * Optional event mapper for direct component composition without a wrapper.
	 * Keys are event names emitted by `tag`; values map event payload to composeEvent data.
	 */
	mapOutputs?: Record<string, (event: CustomEvent) => unknown>;
	/**
	 * Optional aliases that resolve to this same definition.
	 * Useful to decouple consumer type strings from tag names.
	 * @example aliases: ["countdown", "kitchen-timer"]
	 */
	aliases?: string[];
};

/**
 * Type-erased version stored in the registry.
 * `unknown` for mapProps's input is intentional — ssv-compose receives
 * props as unknown at runtime, and each wrapper validates the shape via its own
 * `@Prop() props: TData`.
 * @internal
 */
export type ComposeDefInternal = {
	tag: string;
	mapProps?: (props: unknown) => Record<string, unknown>;
	mapOutputs?: Record<string, (event: CustomEvent) => unknown>;
};

/** Static catalog of compose types keyed by primary name. */
export type CompositionDefsMap = Record<string, ComposeDef>;

/** Alias strings from a single definition entry. */
export type AliasesOf<TDef extends ComposeDef> = TDef extends { aliases: infer A }
	? A extends readonly string[]
		? A[number]
		: never
	: never;

/** Keys of the defs map plus every entry's alias strings. */
export type CompositionNameOf<TDefs extends CompositionDefsMap> =
	| (keyof TDefs & string)
	| AliasesOf<TDefs[keyof TDefs]>;

export function createCompositionDefs<const T extends CompositionDefsMap>(defs: T): T {
	return defs;
}

export type ComposeRegistry = {
	register<TData>(type: string, definition: ComposeDef<TData>): ComposeRegistry;
	registerFromDefs(defs: CompositionDefsMap): ComposeRegistry;
	resolve(type: string): ComposeDefInternal | undefined;
	/** @internal Dev-only; lists registered primary keys (not every alias). */
	listTypes(): string[];
};

/** Normalized output event detail emitted by ssv-compose. */
export type ComposeEventDetail<TOutput = unknown> = {
	/** The widget name string that produced the event. */
	name: string;
	/** Event name from the direct component (omitted for wrapper components). */
	eventName?: string;
	/** The output payload from wrapper `ssvComposeOutput`, `mapOutputs`, or direct component event detail. */
	data: TOutput;
};
