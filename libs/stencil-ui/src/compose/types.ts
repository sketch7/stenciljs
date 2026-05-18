/**
 * Public-facing definition type. Pass TData to constrain the mapData signature.
 * TOutput is declared separately on wrapper components via @Event() ssvComposeOutput.
 */
export type ComposeDefinition<TData = unknown> = {
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
	 * Useful to decouple consumer type strings from tag names.
	 * @example aliases: ["countdown", "kitchen-timer"]
	 */
	aliases?: string[];
};

/**
 * Type-erased version stored in the registry.
 * `unknown` for mapData's input is intentional — ssv-compose receives
 * data as unknown at runtime, and each wrapper validates the shape via its own
 * `@Prop() data: TData`.
 * @internal
 */
export type ComposeDefinitionInternal = {
	tag: string;
	mapData?: (data: unknown) => Record<string, unknown>;
};

export type ComposeRegistry = {
	register<TData>(type: string, definition: ComposeDefinition<TData>): ComposeRegistry;
	resolve(type: string): ComposeDefinitionInternal | undefined;
};

/** Normalized output event detail emitted by ssv-compose. */
export type ComposeEventDetail<TOutput = unknown> = {
	/** The widget name string that produced the event. */
	name: string;
	/** The output payload from the wrapper component. */
	data: TOutput;
};
