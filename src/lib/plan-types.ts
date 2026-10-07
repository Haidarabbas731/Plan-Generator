import type { Provider } from './providers.js';

export interface PlanInputs {
	goal: string;
	level: 'beginner' | 'some' | 'returning' | null;
	studyDays: number[];
	doneLooksLike: string | null;
	daysTotal: number;
	minutesPerDay: number;
	blockSize: number;
}

export interface Milestone {
	title: string;
	description: string;
	successCriteria: string;
}

export interface LedgerEntry {
	day: number;
	title: string;
	topics: string[];
}

export const PLAN_STATUSES = ['generating', 'paused', 'ready', 'failed'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const BLOCK_STATUSES = ['pending', 'writing', 'ready', 'failed', 'stale'] as const;
export type BlockStatus = (typeof BLOCK_STATUSES)[number];

export const REVISION_SOURCES = ['generation', 'chat', 'restore'] as const;
export type RevisionSource = (typeof REVISION_SOURCES)[number];

export const USAGE_KINDS = ['generation', 'chat'] as const;
export type UsageKind = (typeof USAGE_KINDS)[number];

export interface PlanBlockView {
	id: string;
	idx: number;
	startDay: number;
	endDay: number;
	theme: string;
	objective: string;
	milestone: Milestone;
	status: BlockStatus;
	error: string | null;
}

export interface PlanDayView {
	day: number;
	blockId: string;
	title: string;
	learn: string;
	practice: string;
	review: string;
	minutes: number;
	completed: boolean;
}

export interface PlanSummary {
	id: string;
	title: string;
	topicTag: string | null;
	status: PlanStatus;
	provider: Provider;
	model: string;
	startDate: string;
	updatedAt: Date;
	daysDone: number;
	daysWritten: number;
	daysTotal: number;
	studyDays: number[];
}
