/**
 * Creates a Proxy where `primary` own-props take precedence; any miss falls back to `base`
 * with functions auto-bound to `base` so destructuring preserves `this`.
 */
export function mergeProxy<TBase extends object, TPrimary extends object>(
	base: TBase,
	primary: TPrimary,
): TBase & TPrimary {
	return new Proxy(primary as unknown as TBase & TPrimary, {
		get(target, prop, receiver) {
			if (Object.hasOwn(target, prop)) {
				return Reflect.get(target, prop, receiver);
			}
			const val = Reflect.get(base as object, prop, base);
			return typeof val === "function" ? val.bind(base) : val;
		},
	});
}
