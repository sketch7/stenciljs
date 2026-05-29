import { SsvElement } from "@ssv/stencil-core";
import { signal, useSignalWatcher } from "@ssv/stencil-signals";
import { createNotifier, effect } from "@ssv/stencil-signals/extensions";
import { Component, h } from "@stencil/core";

import { todoStore } from "./todo.store";

@Component({
	tag: "app-signals-todo",
	styleUrl: "todo.css",
	shadow: true,
})
export class AppSignalsTodo extends SsvElement {
	readonly _ = this.setup(useSignalWatcher());
	readonly inputText = signal("");
	readonly $addTodo = createNotifier();

	readonly _addTodo = effect(
		[this.$addTodo.listen],
		() => {
			const text = this.inputText().trim();
			if (text) {
				todoStore.add(text);
				this.inputText.set("");
			}
		},
		{ defer: true },
	);

	private handleInput(event: Event) {
		this.inputText.set((event.target as HTMLInputElement).value);
	}

	private handleKeyDown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			this.$addTodo.notify();
		}
	}

	render() {
		const todos = todoStore.todos();
		const completed = todoStore.completedCount();
		const total = todos.length;

		return (
			<div class="todo">
				<div class="add-row">
					<input
						class="todo-input"
						type="text"
						placeholder="Add a new task…"
						value={this.inputText()}
						onInput={e => this.handleInput(e)}
						onKeyDown={e => this.handleKeyDown(e)}
					/>
					<button type="button" class="btn btn-primary" onClick={() => this.$addTodo.notify()}>
						Add
					</button>
				</div>

				{total > 0 && (
					<p class="stats">
						{completed} / {total} completed
					</p>
				)}

				{todos.length === 0 ? (
					<p class="empty">No tasks yet. Add one above!</p>
				) : (
					<ul class="list">
						{todos.map(todo => (
							<li key={todo.id} class={`item ${todo.completed ? "item--done" : ""}`}>
								<button
									type="button"
									class={`checkbox ${todo.completed ? "checkbox--checked" : ""}`}
									aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
									onClick={() => todoStore.toggle(todo.id)}>
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
									onClick={() => todoStore.remove(todo.id)}>
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
