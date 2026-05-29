/**
 * Re-exports `collectStartupContext` from `@app/stencil-playground`.
 *
 * The implementation lives in stencil-playground so it is co-located with the
 * `StartupContext` type it produces. Adding a field to any domain type only
 * requires updating the type and `collectStartupContext` — nothing else changes.
 *
 * @example
 * ```ts
 * // +onBeforeRender.server.ts
 * import { collectStartupContext } from "../../startup.server";
 * export function onBeforeRender() {
 *   return { pageContext: { startupContext: collectStartupContext() } };
 * }
 * ```
 */
export { collectStartupContext } from "../../stencil-playground/src/startup-context/startup-context.server";
