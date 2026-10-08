import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatSheet, PEEK_BASE } from './chat-sheet.svelte.js';

function setup() {
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: query.includes('prefers-reduced-motion'),
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {}
	}));
	const element = document.createElement('aside');
	document.body.append(element);
	const sheet = new ChatSheet();
	const detach = sheet.attach(element);
	return { sheet, element, detach };
}

describe('ChatSheet', () => {
	let cleanup: (() => void) | null = null;

	beforeEach(() => {
		cleanup = null;
	});

	afterEach(() => {
		cleanup?.();
		document.body.innerHTML = '';
		vi.unstubAllGlobals();
	});

	it('starts collapsed at the peek height with the composer only', () => {
		const { sheet, detach } = setup();
		cleanup = detach;
		expect(sheet.stop).toBe('peek');
		expect(sheet.height).toBe(PEEK_BASE);
		expect(sheet.compact).toBe(true);
		expect(sheet.expanded).toBe(false);
	});

	it('expands one stop at a time and collapses back', () => {
		const { sheet, detach } = setup();
		cleanup = detach;
		sheet.expand();
		expect(sheet.stop).toBe('medium');
		expect(sheet.height).toBe(sheet.stops.medium);
		expect(sheet.compact).toBe(false);
		sheet.expand();
		expect(sheet.stop).toBe('large');
		sheet.expand();
		expect(sheet.stop).toBe('large');
		sheet.collapse();
		sheet.collapse();
		expect(sheet.stop).toBe('peek');
		expect(sheet.height).toBe(PEEK_BASE);
	});

	it('opens to half height when the composer gets focus, but not from a higher stop', () => {
		const { sheet, detach } = setup();
		cleanup = detach;
		sheet.composerFocused();
		expect(sheet.stop).toBe('medium');
		sheet.expand();
		sheet.composerFocused();
		expect(sheet.stop).toBe('large');
	});

	it('moves with the arrow keys, jumps with Home and End, and says what it did', () => {
		const { sheet, detach } = setup();
		cleanup = detach;
		const press = (key: string) => {
			const event = new KeyboardEvent('keydown', { key, cancelable: true });
			sheet.keydown(event);
			return event;
		};
		expect(press('ArrowUp').defaultPrevented).toBe(true);
		expect(sheet.label).toBe('Half height');
		press('Home');
		expect(sheet.label).toBe('Full height');
		press('ArrowDown');
		expect(sheet.stop).toBe('medium');
		press('End');
		expect(sheet.label).toBe('Collapsed');
		expect(press('Tab').defaultPrevented).toBe(false);
	});

	it('collapses one stop with Escape from inside the sheet', () => {
		const { sheet, element, detach } = setup();
		cleanup = detach;
		sheet.expand();
		element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		expect(sheet.stop).toBe('peek');
	});

	it('reports a bigger rest inset at half height than at peek', () => {
		const { sheet, detach } = setup();
		cleanup = detach;
		const peek = sheet.restInset;
		sheet.expand();
		expect(sheet.restInset).toBeGreaterThan(peek);
	});
});
