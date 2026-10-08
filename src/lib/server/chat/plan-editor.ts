import type { Db } from '../db/types.js';
import type { PlanStore } from '../plans/plan-store.js';
import { createPlanViewer } from './plan-view.js';
import { createOutlineRestructurer } from './restructure-outline.js';
import { createBlockReviser } from './revise-blocks.js';
import { createScheduleUpdater } from './update-schedule.js';

export type { EditResult } from './edit-shared.js';
export type { PlanView } from './plan-view.js';

export function createPlanEditor(deps: { db: Db; store: PlanStore }) {
	return {
		getPlanView: createPlanViewer(deps),
		reviseBlocks: createBlockReviser(deps),
		restructureOutline: createOutlineRestructurer(deps),
		updateSchedule: createScheduleUpdater(deps)
	};
}

export type PlanEditor = ReturnType<typeof createPlanEditor>;
