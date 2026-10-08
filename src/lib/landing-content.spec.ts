import { describe, expect, it } from 'vitest';
import { BENEFITS, FAQ, PROOF_POINTS, STEPS } from './landing-content.js';

describe('landing content', () => {
	it('has eight FAQ entries with unique questions and real answers', () => {
		expect(FAQ).toHaveLength(8);
		expect(new Set(FAQ.map((entry) => entry.question)).size).toBe(FAQ.length);
		for (const entry of FAQ) {
			expect(entry.question.trim().endsWith('?')).toBe(true);
			expect(entry.answer.trim().length).toBeGreaterThan(20);
		}
	});

	it('has four benefits and three steps with no empty text', () => {
		expect(BENEFITS).toHaveLength(4);
		expect(STEPS).toHaveLength(3);
		for (const item of [...BENEFITS, ...STEPS]) {
			expect(item.title.trim()).not.toBe('');
			expect(item.text.trim()).not.toBe('');
		}
	});

	it('keeps the proof line to three short facts', () => {
		expect(PROOF_POINTS).toHaveLength(3);
	});
});
