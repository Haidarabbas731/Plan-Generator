import { describe, expect, it } from 'vitest';
import {
	CHAT_WIDTH,
	clampChatWidth,
	maxChatWidth,
	parseStoredWidth,
	widthFromKey,
	widthFromPointer
} from './chat-width.js';

describe('maxChatWidth', () => {
	it('is limited by the viewport on a small screen', () => {
		expect(maxChatWidth(1000)).toBe(550);
	});

	it('never goes above the absolute maximum', () => {
		expect(maxChatWidth(3000)).toBe(CHAT_WIDTH.max);
	});

	it('never goes below the minimum', () => {
		expect(maxChatWidth(400)).toBe(CHAT_WIDTH.min);
	});
});

describe('clampChatWidth', () => {
	it('keeps a value inside the allowed range', () => {
		expect(clampChatWidth(100, 1400)).toBe(CHAT_WIDTH.min);
		expect(clampChatWidth(5000, 1400)).toBe(maxChatWidth(1400));
		expect(clampChatWidth(450.6, 1400)).toBe(451);
	});

	it('falls back to the initial width for nonsense', () => {
		expect(clampChatWidth(Number.NaN, 1400)).toBe(CHAT_WIDTH.initial);
	});
});

describe('widthFromPointer', () => {
	it('is the distance from the pointer to the right edge', () => {
		expect(widthFromPointer(900, 1400)).toBe(500);
	});

	it('stops at the limits', () => {
		expect(widthFromPointer(1390, 1400)).toBe(CHAT_WIDTH.min);
		expect(widthFromPointer(10, 1400)).toBe(maxChatWidth(1400));
	});
});

describe('widthFromKey', () => {
	it('widens with the left arrow and narrows with the right arrow', () => {
		expect(widthFromKey('ArrowLeft', 400, 1400)).toBe(400 + CHAT_WIDTH.step);
		expect(widthFromKey('ArrowRight', 400, 1400)).toBe(400 - CHAT_WIDTH.step);
	});

	it('takes bigger steps with a modifier', () => {
		expect(widthFromKey('ArrowLeft', 400, 1400, true)).toBe(400 + CHAT_WIDTH.bigStep);
	});

	it('jumps to the limits with Home and End', () => {
		expect(widthFromKey('Home', 500, 1400)).toBe(CHAT_WIDTH.min);
		expect(widthFromKey('End', 500, 1400)).toBe(maxChatWidth(1400));
	});

	it('ignores other keys', () => {
		expect(widthFromKey('a', 400, 1400)).toBeNull();
	});
});

describe('parseStoredWidth', () => {
	it('reads a saved width and clamps it', () => {
		expect(parseStoredWidth('480', 1400)).toBe(480);
		expect(parseStoredWidth('99999', 1400)).toBe(maxChatWidth(1400));
	});

	it('ignores missing or broken values', () => {
		expect(parseStoredWidth(null, 1400)).toBeNull();
		expect(parseStoredWidth('wide', 1400)).toBeNull();
	});
});
