import { MediaQuery } from 'svelte/reactivity';
import {
	CHAT_WIDTH,
	CHAT_WIDTH_STORAGE_KEY,
	clampChatWidth,
	parseStoredWidth,
	widthFromKey,
	widthFromPointer
} from './chat-width.js';

export class ChatDock {
	open = $state(false);
	width = $state<number>(CHAT_WIDTH.initial);
	viewportWidth = $state(1280);
	dragging = $state(false);
	readonly desktop = new MediaQuery('(min-width: 1024px)');

	get docked(): boolean {
		return this.open && this.desktop.current;
	}

	get sheetOpen(): boolean {
		return this.open && !this.desktop.current;
	}

	toggle() {
		this.open = !this.open;
	}

	attach(): () => void {
		this.viewportWidth = window.innerWidth;
		try {
			const saved = parseStoredWidth(
				localStorage.getItem(CHAT_WIDTH_STORAGE_KEY),
				window.innerWidth
			);
			if (saved !== null) this.width = saved;
		} catch {
			// storage can be blocked
		}
		const onResize = () => {
			this.viewportWidth = window.innerWidth;
			this.width = clampChatWidth(this.width, window.innerWidth);
		};
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}

	setWidth(value: number) {
		this.width = clampChatWidth(value, window.innerWidth);
		this.#save();
	}

	resetWidth() {
		this.setWidth(CHAT_WIDTH.initial);
	}

	startResize(event: PointerEvent) {
		if (!event.isPrimary) return;
		this.dragging = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	resize(event: PointerEvent) {
		if (this.dragging) this.width = widthFromPointer(event.clientX, window.innerWidth);
	}

	endResize(event: PointerEvent) {
		if (!this.dragging) return;
		this.dragging = false;
		(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
		this.#save();
	}

	resizeKey(event: KeyboardEvent) {
		const next = widthFromKey(event.key, this.width, window.innerWidth, event.shiftKey);
		if (next === null) return;
		event.preventDefault();
		this.setWidth(next);
	}

	#save() {
		try {
			localStorage.setItem(CHAT_WIDTH_STORAGE_KEY, String(this.width));
		} catch {
			// storage can be blocked; the width then lasts for this visit only
		}
	}
}
