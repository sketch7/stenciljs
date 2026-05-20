import { SsvElement, useEffect } from "@ssv/stencil.core";
import { Component, Element, Event, EventEmitter, Listen, Prop, h } from "@stencil/core";
import type { VNode } from "@stencil/core";

import { ComposeWidget } from "./compose-widget";
import { isComposeDevEnv } from "./is-compose-dev";
import { useCompositionRegistry } from "./registry";
import type { ComposeEventDetail } from "./types";

function toListenerProp(eventName: string): string {
	return `on${eventName.replaceAll(/(^|-)([a-z0-9])/giu, (_separator, _prefix, char: string) => char.toUpperCase())}`;
}

@Component({
	tag: "ssv-compose",
	styleUrl: "compose.css",
	shadow: false,
})
export class SsvCompose extends SsvElement {
	/** Compose name string — looked up in the registry. */
	@Prop() name!: string;

	/** Props object passed to the resolved widget component. */
	@Prop() props: unknown = undefined;

	/** Normalized output event from any wrapper component in this compose's subtree. */
	@Event() composeEvent!: EventEmitter<ComposeEventDetail>;
	@Element() el!: HTMLElement;

	readonly #registry = useCompositionRegistry();

	#isAutoForwarding = false;

	readonly _forwardingEffect = useEffect((): (() => void) | void => {
		if (!this.#isAutoForwarding) {
			return;
		}
		const child = this.el.firstElementChild as HTMLElement | null;
		if (!child) {
			return;
		}
		const original = child.dispatchEvent.bind(child);
		child.dispatchEvent = (event: Event): boolean => {
			if (event instanceof CustomEvent) {
				this.composeEvent.emit({ name: this.name, eventName: event.type, data: event.detail });
			}
			return original(event);
		};
		return () => {
			child.dispatchEvent = original;
		};
	});

	@Listen("ssvComposeOutput")
	onComposeOutput(e: CustomEvent): void {
		e.stopPropagation();
		this.composeEvent.emit({ name: this.name, data: e.detail });
	}

	render(): VNode | null {
		if (!this.name) {
			return null;
		}
		const registry = this.#registry.current;
		const definition = registry.resolve(this.name);
		if (!definition) {
			if (isComposeDevEnv()) {
				const known = registry.listTypes();
				console.warn(
					`[compose] No definition for name "${this.name}". Known types: ${known.length > 0 ? known.join(", ") : "(none)"}`,
				);
			}
			return <slot name="error" />;
		}
		const ElementClass =
			customElements === null || customElements === undefined ? undefined : customElements.get(definition.tag);
		const isWrapper =
			ElementClass !== undefined && (ElementClass as unknown as typeof ComposeWidget).isComposeWrapper === true;
		let resolvedProps: Record<string, unknown>;
		if (definition.mapProps) {
			resolvedProps = definition.mapProps(this.props);
		} else if (isWrapper) {
			resolvedProps = { props: this.props };
		} else {
			resolvedProps = (this.props as Record<string, unknown>) ?? {};
		}
		if (definition.mapOutputs) {
			const outputListeners = Object.fromEntries(
				Object.entries(definition.mapOutputs).map(([eventName, mapper]) => [
					toListenerProp(eventName),
					(event: CustomEvent) => this.composeEvent.emit({ name: this.name, data: mapper(event) }),
				]),
			);
			resolvedProps = { ...resolvedProps, ...outputListeners };
		}
		this.#isAutoForwarding = !isWrapper && !definition.mapOutputs;
		return h(definition.tag, resolvedProps);
	}
}
