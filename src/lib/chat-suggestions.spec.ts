import { describe, expect, it } from 'vitest';
import { chatSuggestions } from './chat-suggestions.js';

describe('chatSuggestions', () => {
	it('names block 2 and day 4 when the plan has them', () => {
		expect(chatSuggestions({ daysTotal: 30, blockSize: 5 })).toEqual([
			'Make block 2 easier',
			'I only have weekends now',
			'Explain day 4'
		]);
	});

	it('does not name a block or day the plan does not have', () => {
		expect(chatSuggestions({ daysTotal: 3, blockSize: 5 })).toEqual([
			'Make this plan easier',
			'I only have weekends now',
			'Explain day 3'
		]);
	});
});
