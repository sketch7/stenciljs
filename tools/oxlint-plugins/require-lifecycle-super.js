// ── Lifecycle methods that MUST call super when overridden ─────────────────
// Add method names here to extend enforcement to additional methods.
const LIFECYCLE_METHODS = new Set([
	"connectedCallback",
	"disconnectedCallback",
	"componentWillLoad",
	"componentDidLoad",
	"componentWillRender",
	"componentDidRender",
	"componentWillUpdate",
	"componentDidUpdate",
]);

/** @type {import("eslint").Rule.RuleDefinition} */
const requireLifecycleSuper = {
	meta: {
		type: "problem",
		docs: {
			description: "Require super call in overridden StencilJS lifecycle methods",
		},
		messages: {
			missingSuperCall:
				"Override of '{{name}}' must call super.{{name}}(). Reactive controllers will not receive lifecycle events without it.",
		},
	},
	create(context) {
		// Stack of frames for nested lifecycle overrides (rare but possible).
		// Each frame tracks whether a super call was seen inside that method.
		const stack = [];

		return {
			MethodDefinition(node) {
				if (!node.override) {
					return;
				}
				const name = node.key?.type === "Identifier" ? node.key.name : undefined;
				if (name && LIFECYCLE_METHODS.has(name)) {
					stack.push({ node, name, hasSuperCall: false });
				}
			},

			CallExpression(node) {
				if (stack.length === 0) {
					return;
				}
				if (node.callee?.type === "MemberExpression" && node.callee.object?.type === "Super") {
					stack.at(-1).hasSuperCall = true;
				}
			},

			"MethodDefinition:exit"(node) {
				if (!node.override) {
					return;
				}
				const name = node.key?.type === "Identifier" ? node.key.name : undefined;
				if (!name || !LIFECYCLE_METHODS.has(name)) {
					return;
				}

				const frame = stack.pop();
				if (frame && !frame.hasSuperCall) {
					context.report({
						node: frame.node,
						messageId: "missingSuperCall",
						data: { name: frame.name },
					});
				}
			},
		};
	},
};

// oxlint-disable-next-line import/no-anonymous-default-export import/no-default-export
export default {
	meta: { name: "stencil-lifecycle" },
	rules: { "require-lifecycle-super": requireLifecycleSuper },
};
