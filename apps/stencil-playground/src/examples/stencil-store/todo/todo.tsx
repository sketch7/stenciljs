import { Component, h, State } from "@stencil/core";

import { todoStore } from "./todo.store";

@Component({
	tag: "app-todo",
	styleUrl: "todo.css",
	shadow: true,
})
export class AppTodo {
	@State() todos = todoStore.todos;
	@State() inputValue = "";
	/** Mirrored from store but intentionally NOT rendered — proves store mutations outside UI still cause rerenders. */
	@State() hiddenTick = todoStore.hiddenTick;

	#renderCount = 0;

	componentDidRender() {
		this.#renderCount++;
		console.warn(
			`[app-todo] render #${this.#renderCount} — hiddenTick: ${this.hiddenTick} | todos: ${this.todos.length} | ⚠️ hiddenTick is NOT rendered in JSX`,
		);
	}

	private mutateHiddenOnly() {
		todoStore.hiddenTick++;
		this.hiddenTick = todoStore.hiddenTick;
		console.warn(
			`[app-signals-todo] button click mutated hiddenTick to ${todoStore.hiddenTick} — this does NOT cause a rerender because hiddenTick is not read in render()`,
		);
	}

	private handleInput(event: Event) {
		this.inputValue = (event.target as HTMLInputElement).value;
	}

	private handleKeyDown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			this.addTodo();
		}
	}

	private addTodo() {
		const text = this.inputValue.trim();
		if (!text) {
			return;
		}

		todoStore.todos = [
			...todoStore.todos,
			{
				id: todoStore.nextId,
				text,
				completed: false,
			},
		];
		todoStore.nextId++;
		this.todos = todoStore.todos;
		this.inputValue = "";
	}

	private toggleTodo(id: number) {
		todoStore.todos = todoStore.todos.map(t => (t.id === id ? { ...t, completed: !t.completed } : t));
		this.todos = todoStore.todos;
	}

	private deleteTodo(id: number) {
		todoStore.todos = todoStore.todos.filter(t => t.id !== id);
		this.todos = todoStore.todos;
	}

	render() {
		const completed = this.todos.filter(t => t.completed).length;
		const total = this.todos.length;

		return (
			<div class="todo">
				<div class="add-row">
					<input
						class="todo-input"
						type="text"
						placeholder="Add a new task…"
						value={this.inputValue}
						onInput={e => this.handleInput(e)}
						onKeyDown={e => this.handleKeyDown(e)}
					/>
					<button type="button" class="btn btn-primary" onClick={() => this.addTodo()}>
						Add
					</button>
					<button type="button" class="btn btn-secondary" onClick={() => this.mutateHiddenOnly()}>
						Mutate hidden (check console)
					</button>
				</div>

				{total > 0 && (
					<p class="stats">
						{completed} / {total} completed
					</p>
				)}

				{this.todos.length === 0 ? (
					<p class="empty">No tasks yet. Add one above!</p>
				) : (
					<ul class="list">
						{this.todos.map(todo => (
							<li key={todo.id} class={`item ${todo.completed ? "item--done" : ""}`}>
								<button
									type="button"
									class={`checkbox ${todo.completed ? "checkbox--checked" : ""}`}
									aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
									onClick={() => this.toggleTodo(todo.id)}>
									{todo.completed && (
										<svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
											<path
												d="M1 5l3.5 3.5L11 1"
												stroke="currentColor"
												stroke-width="1.8"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									)}
								</button>
								<span class="item-text">{todo.text}</span>
								<button
									type="button"
									class="delete-btn"
									aria-label="Delete task"
									onClick={() => this.deleteTodo(todo.id)}>
									<svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
										<path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
									</svg>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		);
	}
}
