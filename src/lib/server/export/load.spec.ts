import { describe, expect, it, vi } from 'vitest';
import type { PlanInputs } from '#lib/plan-types.js';
import type { PlanStore } from '../plans/plan-store.js';
import { loadExportData } from './load.js';

const inputs: PlanInputs = {
	goal: 'Learn Rust',
	level: null,
	studyDays: [1, 3, 5],
	doneLooksLike: null,
	daysTotal: 6,
	minutesPerDay: 45,
	blockSize: 3
};

function store(owned: boolean) {
	return {
		getOwnedPlan: vi.fn(async () =>
			owned
				? {
						id: 'p1',
						title: 'Rust',
						goal: 'Learn Rust',
						overview: 'o',
						finalOutcome: 'f',
						startDate: '2026-10-05',
						inputs
					}
				: undefined
		),
		listBlocks: vi.fn(async () => []),
		listDays: vi.fn(async () => [])
	} as unknown as Pick<PlanStore, 'getOwnedPlan' | 'listBlocks' | 'listDays'>;
}

describe('loadExportData', () => {
	it('returns nothing for a plan the user does not own, without reading its content', async () => {
		const fake = store(false);
		expect(await loadExportData(fake, 'u2', 'p1')).toBeNull();
		expect(fake.listBlocks).not.toHaveBeenCalled();
		expect(fake.listDays).not.toHaveBeenCalled();
	});

	it('maps the plan inputs the exports need', async () => {
		const data = await loadExportData(store(true), 'u1', 'p1');
		expect(data?.plan).toMatchObject({
			id: 'p1',
			startDate: '2026-10-05',
			studyDays: [1, 3, 5],
			daysTotal: 6,
			minutesPerDay: 45
		});
	});
});
