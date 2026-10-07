import type { Milestone } from '#lib/plan-types.js';

export interface OutlineBlock {
	index: number;
	startDay: number;
	endDay: number;
	theme: string;
	objective: string;
	covers: string[];
	notCovers: string[];
	milestone: Milestone;
}

export interface Outline {
	title: string;
	overview: string;
	finalOutcome: string;
	topicTag: string;
	blocks: OutlineBlock[];
}

export interface DayOutput {
	day: number;
	title: string;
	learn: string;
	practice: string;
	review: string;
	minutes: number;
	topics: string[];
}

export interface BlockOutput {
	days: DayOutput[];
}
