import { untrack } from 'svelte';
import { MediaQuery } from 'svelte/reactivity';
import {
	SHEET,
	computeStops,
	draggedHeight,
	isSettled,
	nearestStop,
	releaseVelocity,
	springConfigFor,
	springState,
	stopAbove,
	stopBelow,
	type Stop,
	type Stops
} from './sheet-physics.js';

export const PEEK_BASE = 104;
const KEYBOARD_MIN = 120;
const COMPACT_SLACK = 24;
const SPRING_LIMIT_S = 2;

interface Drag {
	id: number;
	startY: number;
	startHeight: number;
	samples: { y: number; t: number }[];
	moved: boolean;
}

export class ChatSheet {
	stop = $state<Stop>('peek');
	height = $state(PEEK_BASE);
	dragging = $state(false);
	bottomOffset = $state(0);
	viewportHeight = $state(800);
	restInset = $state(PEEK_BASE);

	readonly #reduced = new MediaQuery('(prefers-reduced-motion: reduce)');
	#safe = 0;
	#frame = 0;
	#velocity = 0;
	#drag: Drag | null = null;
	#element: HTMLElement | null = null;

	get peek(): number {
		return PEEK_BASE + this.#safe;
	}

	get stops(): Stops {
		return computeStops(this.peek, this.viewportHeight);
	}

	get compact(): boolean {
		return this.height <= this.peek + COMPACT_SLACK;
	}

	get expanded(): boolean {
		return this.stop !== 'peek';
	}

	get label(): string {
		return this.stop === 'peek'
			? 'Collapsed'
			: this.stop === 'medium'
				? 'Half height'
				: 'Full height';
	}

	attach = (element: HTMLElement) => {
		this.#element = element;
		untrack(() => {
			this.#safe = parseFloat(getComputedStyle(element).paddingBottom) || 0;
			this.refresh();
		});
		const viewport = window.visualViewport;
		element.addEventListener('keydown', this.#escape);
		viewport?.addEventListener('resize', this.refresh);
		viewport?.addEventListener('scroll', this.refresh);
		window.addEventListener('resize', this.refresh);
		return () => {
			element.removeEventListener('keydown', this.#escape);
			viewport?.removeEventListener('resize', this.refresh);
			viewport?.removeEventListener('scroll', this.refresh);
			window.removeEventListener('resize', this.refresh);
			cancelAnimationFrame(this.#frame);
			this.#frame = 0;
			this.#element = null;
		};
	};

	refresh = () => {
		const viewport = window.visualViewport;
		const inner = window.innerHeight;
		this.viewportHeight = viewport ? viewport.height : inner;
		this.bottomOffset = viewport ? Math.max(0, inner - viewport.offsetTop - viewport.height) : 0;
		if (!this.dragging && !this.#frame) this.height = this.stops[this.stop];
		this.#rest();

		const keyboardOpen = viewport ? inner - viewport.height > KEYBOARD_MIN : false;
		if (keyboardOpen && this.stop !== 'large' && this.#focusInside()) this.go('large');
	};

	go(stop: Stop) {
		cancelAnimationFrame(this.#frame);
		this.#frame = 0;
		this.stop = stop;
		const target = this.stops[stop];
		if (this.#reduced.current || Math.abs(target - this.height) < SHEET.settleDistance) {
			this.height = target;
			this.#velocity = 0;
			this.#rest();
			return;
		}

		const from = this.height;
		const velocity = this.#velocity;
		const config = springConfigFor(velocity / 1000);
		const start = performance.now();
		const tick = (now: number) => {
			const elapsed = (now - start) / 1000;
			const { x, v } = springState(elapsed, from, target, velocity, config);
			const stops = this.stops;
			this.height = Math.min(Math.max(x, stops.peek), stops.large + 8);
			this.#velocity = v;
			if (isSettled(x, v, target) || elapsed > SPRING_LIMIT_S) {
				this.height = this.stops[this.stop];
				this.#velocity = 0;
				this.#frame = 0;
				this.#rest();
				return;
			}
			this.#frame = requestAnimationFrame(tick);
		};
		this.#frame = requestAnimationFrame(tick);
	}

	expand() {
		this.go(stopAbove(this.stop));
	}

	collapse() {
		this.go(stopBelow(this.stop));
	}

	tap() {
		if (this.stop === 'large') this.collapse();
		else this.expand();
	}

	composerFocused() {
		if (this.stop === 'peek') this.go('medium');
	}

	down(event: PointerEvent) {
		if (!event.isPrimary || this.#drag) return;
		try {
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		} catch {
			// the pointer may already be gone; dragging still works without capture
		}
		cancelAnimationFrame(this.#frame);
		this.#frame = 0;
		this.#drag = {
			id: event.pointerId,
			startY: event.clientY,
			startHeight: this.height,
			samples: [{ y: event.clientY, t: event.timeStamp }],
			moved: false
		};
	}

	move(event: PointerEvent) {
		const drag = this.#drag;
		if (!drag || event.pointerId !== drag.id) return;
		const delta = event.clientY - drag.startY;
		if (!drag.moved) {
			if (Math.abs(delta) < SHEET.hysteresis) return;
			drag.moved = true;
			this.dragging = true;
		}
		drag.samples.push({ y: event.clientY, t: event.timeStamp });
		if (drag.samples.length > 12) drag.samples.shift();
		this.height = draggedHeight(drag.startHeight - delta, this.stops);
	}

	up(event: PointerEvent) {
		const drag = this.#drag;
		if (!drag || event.pointerId !== drag.id) return;
		this.#drag = null;
		try {
			(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
		} catch {
			// nothing to release
		}
		if (!drag.moved) {
			if (event.type === 'pointerup') this.tap();
			return;
		}
		this.dragging = false;
		const speed = event.type === 'pointerup' ? releaseVelocity(drag.samples, event.timeStamp) : 0;
		const heightSpeed = -speed;
		this.#velocity = heightSpeed * 1000;
		this.go(nearestStop(this.height, heightSpeed, this.stops));
	}

	keydown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp') this.expand();
		else if (event.key === 'ArrowDown') this.collapse();
		else if (event.key === 'Home') this.go('large');
		else if (event.key === 'End') this.go('peek');
		else return;
		event.preventDefault();
	}

	#escape = (event: KeyboardEvent) => {
		if (event.key !== 'Escape' || !this.expanded) return;
		event.stopPropagation();
		this.collapse();
	};

	#rest() {
		const stops = this.stops;
		this.restInset = this.stop === 'large' ? stops.medium : stops[this.stop];
	}

	#focusInside(): boolean {
		const active = document.activeElement;
		return Boolean(this.#element && active && this.#element.contains(active));
	}
}
