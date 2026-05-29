import { SsvElement } from "@ssv/stencil-core";
import { signal, useSignalWatcher } from "@ssv/stencil-signals";
import { linkedSignal } from "@ssv/stencil-signals/extensions";
import { Component, h } from "@stencil/core";

type Course = {
	code: string;
	title: string;
	defaultQuantity: number;
};

const courses: Course[] = [
	{ code: "BEGINNERS", title: "Stencil for Beginners", defaultQuantity: 10 },
	{ code: "SIGNALS", title: "Stencil Signals In Depth", defaultQuantity: 20 },
	{ code: "SSR", title: "Stencil SSR In Depth", defaultQuantity: 30 },
];

@Component({
	tag: "app-signals-linked-signal",
	styleUrl: "linked-signal.css",
	shadow: true,
})
export class AppSignalsLinkedSignal extends SsvElement {
	readonly signalWatcher = useSignalWatcher();

	readonly selectedCourse = signal<string>("BEGINNERS");

	// Resets to the selected course's defaultQuantity whenever the selection
	// changes, but stays user-overridable in between.
	readonly quantity = linkedSignal({
		source: () => this.selectedCourse(),
		computation: code => courses.find(c => c.code === code)?.defaultQuantity ?? 1,
	});

	render() {
		const selected = this.selectedCourse();
		const qty = this.quantity();

		return (
			<div class="linked">
				<div class="courses">
					{courses.map(course => (
						<button
							type="button"
							key={course.code}
							class={`course ${course.code === selected ? "course-active" : ""}`}
							onClick={() => this.selectedCourse.set(course.code)}>
							<span class="course-title">{course.title}</span>
							<span class="course-default">default ×{course.defaultQuantity}</span>
						</button>
					))}
				</div>

				<div class="quantity">
					<span class="quantity-label">Quantity</span>
					<div class="stepper">
						<button type="button" class="btn btn-outline" onClick={() => this.quantity.update(n => Math.max(0, n - 1))}>
							−
						</button>
						<span class="quantity-num">{qty}</span>
						<button type="button" class="btn btn-primary" onClick={() => this.quantity.update(n => n + 1)}>
							+
						</button>
					</div>
				</div>

				<p class="hint">
					Change the quantity, then pick a different course — the quantity resets to that course's default. Pick the
					same course again to keep your edit.
				</p>
			</div>
		);
	}
}
