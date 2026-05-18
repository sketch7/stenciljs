/**
 * Public-facing definition type. Pass TData to constrain the mapData signature.
 * TOutput is declared separately on wrapper components via @Event() ssvComposeOutput.
 */
export type CompositionDefinition<TData = unknown> = {
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
export type CompositionDefinitionInternal = {
	tag: string;
	mapData?: (data: unknown) => Record<string, unknown>;
};

export type CompositionRegistry = {
	register<TData>(name: string, definition: CompositionDefinition<TData>): CompositionRegistry;
	resolve(name: string): CompositionDefinitionInternal | undefined;
};

/** Normalized output event detail emitted by ssv-compose. */
export type ComposeEventDetail<TOutput = unknown> = {
	/** The composition name string that produced the event. */
	name: string;
	/** The output payload from the wrapper component. */
	data: TOutput;
};
