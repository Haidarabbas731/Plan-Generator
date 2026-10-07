import { z } from 'zod';
import type { BlockOutput, DayOutput, Outline, OutlineBlock } from './types.js';

const text = (max: number) => z.string().min(1).max(max);

export const milestoneSchema = z.object({
	title: text(120),
	description: text(600),
	successCriteria: text(400)
});

export const outlineBlockSchema = z.object({
	index: z.number().int().min(0).max(200),
	startDay: z.number().int().min(1).max(365),
	endDay: z.number().int().min(1).max(365),
	theme: text(120),
	objective: text(400),
	covers: z.array(text(120)).min(1).max(12),
	notCovers: z.array(text(120)).max(12),
	milestone: milestoneSchema
}) satisfies z.ZodType<OutlineBlock>;

export const outlineSchema = z.object({
	title: text(120),
	overview: text(900),
	finalOutcome: text(600),
	topicTag: text(40),
	blocks: z.array(outlineBlockSchema).min(1).max(200)
}) satisfies z.ZodType<Outline>;

export const daySchema = z.object({
	day: z.number().int().min(1).max(365),
	title: text(120),
	learn: text(600),
	practice: text(600),
	review: text(400),
	minutes: z.number().int().min(5).max(720),
	topics: z.array(text(80)).min(1).max(3)
}) satisfies z.ZodType<DayOutput>;

export const blockOutputSchema = z.object({
	days: z.array(daySchema).min(1).max(60)
}) satisfies z.ZodType<BlockOutput>;
