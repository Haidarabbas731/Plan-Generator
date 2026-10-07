import { describe, expect, it } from 'vitest';
import { LIMITS } from '#lib/limits.js';
import type { LedgerEntry, PlanInputs } from '#lib/plan-types.js';
import { planBlockRanges } from '#lib/plan-blocks.js';
import { runBlockWriter } from './block-writer.js';
import { createFakeModel } from './fake-model.js';
import { GenerationError } from './generate.js';
import { appendToLedger } from './ledger.js';
import { runOutliner } from './outliner.js';

const inputs: PlanInputs = {
	goal: 'Learn Rust well enough to build a CLI',
	level: 'beginner',
	studyDays: [1, 2, 3, 4, 5],
	doneLooksLike: null,
	daysTotal: 30,
	minutesPerDay: 90,
	blockSize: 5
};

const ranges = planBlockRanges(inputs.daysTotal, inputs.blockSize);

function promptsOf(model: ReturnType<typeof createFakeModel>) {
	return model.doGenerateCalls.map((call) =>
		(call.prompt as { role: string; content: { text?: string }[] }[])
			.filter((m) => m.role === 'user')
			.flatMap((m) => m.content.map((c) => c.text ?? ''))
			.join('\n')
	);
}

describe('runOutliner', () => {
	it('returns an outline that matches the planned blocks', async () => {
		const model = createFakeModel();
		const outline = await runOutliner({ model, inputs, ranges });
		expect(outline.blocks).toHaveLength(6);
		expect(outline.blocks[5]).toMatchObject({ index: 5, startDay: 26, endDay: 30 });
		expect(model.doGenerateCalls).toHaveLength(1);
	});

	it('sends the goal, time and block ranges in the prompt', async () => {
		const model = createFakeModel();
		await runOutliner({ model, inputs, ranges });
		const prompt = promptsOf(model)[0];
		expect(prompt).toContain('<goal>Learn Rust well enough to build a CLI</goal>');
		expect(prompt).toContain('<time>30 study days, 90 minutes per day</time>');
		expect(prompt).toContain('<block index="0" start="1" end="5" />');
	});

	it('retries once with the problems when the first answer is wrong', async () => {
		const model = createFakeModel({ outlineFirstAttemptFails: true });
		const outline = await runOutliner({ model, inputs, ranges });
		expect(outline.blocks).toHaveLength(6);
		expect(model.doGenerateCalls).toHaveLength(2);
		expect(promptsOf(model)[1]).toContain('Expected 6 blocks but got 5');
	});

	it('gives up with a clear error after the allowed attempts', async () => {
		const model = createFakeModel({ outlineAlwaysFails: true });
		await expect(runOutliner({ model, inputs, ranges })).rejects.toBeInstanceOf(GenerationError);
		expect(model.doGenerateCalls).toHaveLength(2);
	});

	it('stops when cancelled', async () => {
		const controller = new AbortController();
		controller.abort();
		const model = createFakeModel();
		await expect(
			runOutliner({ model, inputs, ranges, abortSignal: controller.signal })
		).rejects.toThrow();
	});
});

describe('runBlockWriter', () => {
	async function setup(options = {}) {
		const model = createFakeModel(options);
		const outline = await runOutliner({ model: createFakeModel(), inputs, ranges });
		return { model, outline };
	}

	it('writes every day of the block with the requested time', async () => {
		const { model, outline } = await setup();
		const result = await runBlockWriter({
			model,
			inputs,
			outline,
			block: outline.blocks[0],
			ledger: [],
			previous: null
		});
		expect(result.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
		expect(result.days.every((d) => d.minutes === 90)).toBe(true);
	});

	it('tells the model what was already taught', async () => {
		const { model, outline } = await setup();
		const first = await runBlockWriter({
			model,
			inputs,
			outline,
			block: outline.blocks[0],
			ledger: [],
			previous: null
		});
		const ledger: LedgerEntry[] = appendToLedger([], first.days);
		await runBlockWriter({
			model,
			inputs,
			outline,
			block: outline.blocks[1],
			ledger,
			previous: first
		});
		const secondPrompt = promptsOf(model)[1];
		expect(secondPrompt).toContain('Day 1: Lesson 1 [topic 1]');
		expect(secondPrompt).toContain('Day 5: Lesson 5');
		expect(secondPrompt).toContain('Write exactly days 6 to 10');
		expect(secondPrompt).toContain('Learn: Study material for day 5.');
	});

	it('retries when the model repeats an earlier title', async () => {
		const { model, outline } = await setup({ blockFirstAttemptFails: { 1: 'duplicate-title' } });
		const first = await runBlockWriter({
			model: createFakeModel(),
			inputs,
			outline,
			block: outline.blocks[0],
			ledger: [],
			previous: null
		});
		const result = await runBlockWriter({
			model,
			inputs,
			outline,
			block: outline.blocks[1],
			ledger: appendToLedger([], first.days),
			previous: first
		});
		expect(result.days[0].title).toBe('Lesson 6');
		expect(model.doGenerateCalls).toHaveLength(2);
		expect(promptsOf(model)[1]).toContain('repeats the title of day 1');
	});

	it('retries when a day is missing', async () => {
		const { model, outline } = await setup({ blockFirstAttemptFails: { 0: 'missing-day' } });
		const result = await runBlockWriter({
			model,
			inputs,
			outline,
			block: outline.blocks[0],
			ledger: [],
			previous: null
		});
		expect(result.days).toHaveLength(5);
		expect(promptsOf(model)[1]).toContain('Day 5 is missing');
	});

	it('retries and names the field when a day is longer than allowed', async () => {
		const { model, outline } = await setup({ blockFirstAttemptFails: { 0: 'too-long' } });
		const result = await runBlockWriter({
			model,
			inputs,
			outline,
			block: outline.blocks[0],
			ledger: [],
			previous: null
		});
		expect(result.days).toHaveLength(5);
		const retryPrompt = promptsOf(model)[1];
		expect(retryPrompt).toContain('days.1.practice');
		expect(retryPrompt).toContain(String(LIMITS.dayPracticeMax));
	});

	it('tells the model the length limits up front', async () => {
		const { model, outline } = await setup();
		await runBlockWriter({
			model,
			inputs,
			outline,
			block: outline.blocks[0],
			ledger: [],
			previous: null
		});
		const instructions = JSON.stringify(model.doGenerateCalls[0].prompt);
		expect(instructions).toContain(`At most ${LIMITS.dayPracticeMax} characters`);
	});

	it('retries when the answer is not valid JSON', async () => {
		const { model, outline } = await setup({ blockFirstAttemptFails: { 0: 'invalid-json' } });
		const result = await runBlockWriter({
			model,
			inputs,
			outline,
			block: outline.blocks[0],
			ledger: [],
			previous: null
		});
		expect(result.days).toHaveLength(5);
		expect(model.doGenerateCalls).toHaveLength(2);
	});

	it('fails with the collected problems when every attempt is wrong', async () => {
		const { model, outline } = await setup({ blockAlwaysFails: [0] });
		const error = await runBlockWriter({
			model,
			inputs,
			outline,
			block: outline.blocks[0],
			ledger: [],
			previous: null
		}).catch((e) => e);
		expect(error).toBeInstanceOf(GenerationError);
		expect((error as GenerationError).issues.join(' ')).toContain('Day 5 is missing');
	});
});
