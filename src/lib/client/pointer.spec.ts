import { afterEach, describe, expect, it, vi } from 'vitest';
import { isCoarsePointer } from './pointer.js';

describe('isCoarsePointer', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('is true on a touch screen and false with a mouse', () => {
		vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)' }));
		expect(isCoarsePointer()).toBe(true);
		vi.stubGlobal('matchMedia', () => ({ matches: false }));
		expect(isCoarsePointer()).toBe(false);
	});

	it('is false where media queries do not exist', () => {
		vi.stubGlobal('matchMedia', undefined);
		expect(isCoarsePointer()).toBe(false);
	});
});
