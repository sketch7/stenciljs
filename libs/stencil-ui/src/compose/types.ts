/**
 * Public-facing definition type. Pass TData to constrain the mapData signature.
 * TOutput is declared separately on wrapper components via @Event() ssvComposeOutput.
 */
export type CompositionDef<TData = unknown> = {
	/** Custom element tag name the registry passes to h(). */
	tag: string;
	/**
	 * Optional prop mapper. When provided, the mapped object is passed directly
	 * as props to `tag`. When omitted, `{ data }` is passed verbatim — the wrapper
	 * component is expected to accept `@Prop() data: TData`.
	 */
	mapData?: (data: TData) => Record<string, unknown>;
	/**
	 * Optional aliases that resolve to this same definition.
	 * @example aliases: ["countdown", "kitchen-timer"]
	 */
	aliases?: string[];
};

/**
 * Type-erased version stored in the registry.
 * @internal
 */
export type CompositionDefInternal = {
	tag: string;
	mapData?: (data: unknown) => Record<string, unknown>;
};

export type CompositionRegistry = {
	register<TData>(name: string, definition: CompositionDef<TData>): CompositionRegistry;
	resolve(name: string): CompositionDefInternal | undefined;
};

/** Name → definition record for declarative registration. */
export type CompositionDefsMap = Record<string, CompositionDef>;

/** Ordered [name, definition] tuples for declarative registration. */
export type CompositionDefsList = readonly (readonly [string, CompositionDef])[];

export type CompositionRegistrySetup = (registry: CompositionRegistry) => CompositionRegistry | void;

export type ProvideCompositionRegistryOptions = {
	/** Start from this registry instead of a new empty one. */
	registry?: CompositionRegistry;
	/** Static definitions applied via `.register()` before `setup`. */
	definitions?: CompositionDefsMap | CompositionDefsList;
	/** Additional fluent registration after `definitions`. */
	setup?: CompositionRegistrySetup;
};

/** Normalized output event detail emitted by ssv-compose. */
export type ComposeEventDetail<TOutput = unknown> = {
	/** The composition name string that produced the event. */
	name: string;
	/** The output payload from the wrapper component. */
	data: TOutput;
};
