import { describe, expect, it } from 'vitest';
import {
	describePricing,
	filterModels,
	formatPrice,
	isFreeModel,
	type ModelOption
} from './model-options.js';

const priced: ModelOption[] = [
	{ id: 'anthropic/claude-fable-5-1', name: 'Claude Fable 5.1', pricing: { input: 3, output: 15 } },
	{ id: 'meta/llama-4:free', name: 'Llama 4 (free)', pricing: { input: 0, output: 0 } },
	{ id: 'vendor/tiny', name: 'Tiny', pricing: { input: 0, output: 0 } },
	{ id: 'openai/gpt-cheap', name: 'GPT Cheap', pricing: { input: 0.075, output: 0.3 } }
];

const unpriced: ModelOption[] = [
	{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
	{ id: 'gemini-free-form', name: 'Free Form Model' }
];

describe('isFreeModel', () => {
	it('is true only when both prices are known and zero', () => {
		expect(isFreeModel(priced[1])).toBe(true);
		expect(isFreeModel(priced[0])).toBe(false);
		expect(isFreeModel(unpriced[0])).toBe(false);
	});
});

describe('formatPrice', () => {
	it('drops empty cents and keeps small prices precise', () => {
		expect(formatPrice(3)).toBe('$3');
		expect(formatPrice(15)).toBe('$15');
		expect(formatPrice(2.5)).toBe('$2.50');
		expect(formatPrice(0.075)).toBe('$0.075');
	});
});

describe('describePricing', () => {
	it('shows input and output per million tokens, or Free, or nothing', () => {
		expect(describePricing(priced[0])).toBe('$3 in · $15 out per 1M tokens');
		expect(describePricing(priced[1])).toBe('Free');
		expect(describePricing(unpriced[0])).toBeNull();
	});
});

describe('filterModels', () => {
	it('returns everything for an empty search', () => {
		expect(filterModels(priced, '  ')).toEqual(priced);
	});

	it('shows only free models for "free" when prices are known', () => {
		expect(filterModels(priced, 'free').map((option) => option.id)).toEqual([
			'meta/llama-4:free',
			'vendor/tiny'
		]);
	});

	it('combines free with other words', () => {
		expect(filterModels(priced, 'free llama').map((option) => option.id)).toEqual([
			'meta/llama-4:free'
		]);
	});

	it('does not fuzzy match unrelated names', () => {
		expect(filterModels(priced, 'free').some((option) => option.id.includes('claude'))).toBe(false);
	});

	it('treats free as plain text when the provider gives no prices', () => {
		expect(filterModels(unpriced, 'free').map((option) => option.id)).toEqual(['gemini-free-form']);
	});

	it('matches every word anywhere in the name or id', () => {
		expect(filterModels(priced, 'gpt cheap').map((option) => option.id)).toEqual([
			'openai/gpt-cheap'
		]);
	});
});
