import { z } from 'zod';
import { LIMITS } from '#lib/limits.js';

const text = (max: number) => z.string().min(1).max(max);

export const milestoneSchema = z.object({
	title: text(120),
	description: text(600),
	successCriteria: text(400)
});

export const outlineBlockSchema = z.object({
	index: z.number().int().min(0).max(LIMITS.maxBlocks),
	startDay: z.number().int().min(1).max(LIMITS.maxPlanDays),
	endDay: z.number().int().min(1).max(LIMITS.maxPlanDays),
	theme: text(120),
	objective: text(400),
	covers: z.array(text(120)).min(1).max(12),
	notCovers: z.array(text(120)).max(12),
	milestone: milestoneSchema
});

export const outlineSchema = z.object({
	title: text(120),
	overview: text(900),
	finalOutcome: text(600),
	topicTag: text(40),
	blocks: z.array(outlineBlockSchema).min(1).max(LIMITS.maxBlocks)
});

export const daySchema = z.object({
	day: z.number().int().min(1).max(LIMITS.maxPlanDays),
	title: text(120),
	learn: text(600),
	practice: text(600),
	review: text(400),
	minutes: z.number().int().min(LIMITS.minDayMinutes).max(LIMITS.maxMinutesPerDay),
	topics: z.array(text(80)).min(1).max(3)
});

export const blockOutputSchema = z.object({
	days: z.array(daySchema).min(1).max(LIMITS.maxDaysPerBlock)
});
