import { asc, eq, inArray } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { Db } from '../db/types.js';

const { user, userPrefs, providerKeys, plans, planBlocks, planDays, conversations, messages } =
	schema;

export async function buildUserExport(db: Db, userId: string, now = new Date()) {
	const [profile] = await db
		.select({
			name: user.name,
			email: user.email,
			emailVerified: user.emailVerified,
			createdAt: user.createdAt
		})
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	if (!profile) return null;

	const [prefs] = await db
		.select({
			defaultProvider: userPrefs.defaultProvider,
			defaultModel: userPrefs.defaultModel
		})
		.from(userPrefs)
		.where(eq(userPrefs.userId, userId))
		.limit(1);

	const keys = await db
		.select({
			provider: providerKeys.provider,
			last4: providerKeys.last4,
			savedAt: providerKeys.updatedAt
		})
		.from(providerKeys)
		.where(eq(providerKeys.userId, userId));

	const planRows = await db
		.select()
		.from(plans)
		.where(eq(plans.userId, userId))
		.orderBy(asc(plans.createdAt));
	const planIds = planRows.map((plan) => plan.id);

	const [blockRows, dayRows, conversationRows] = planIds.length
		? await Promise.all([
				db
					.select()
					.from(planBlocks)
					.where(inArray(planBlocks.planId, planIds))
					.orderBy(asc(planBlocks.idx)),
				db
					.select()
					.from(planDays)
					.where(inArray(planDays.planId, planIds))
					.orderBy(asc(planDays.day)),
				db.select().from(conversations).where(eq(conversations.userId, userId))
			])
		: [[], [], []];

	const conversationIds = conversationRows.map((conversation) => conversation.id);
	const messageRows = conversationIds.length
		? await db
				.select()
				.from(messages)
				.where(inArray(messages.conversationId, conversationIds))
				.orderBy(asc(messages.createdAt))
		: [];

	return {
		exportedAt: now.toISOString(),
		profile,
		preferences: prefs ?? { defaultProvider: null, defaultModel: null },
		providerKeys: keys,
		plans: planRows.map((plan) => {
			const conversation = conversationRows.find((entry) => entry.planId === plan.id);
			return {
				id: plan.id,
				title: plan.title,
				goal: plan.goal,
				status: plan.status,
				startDate: plan.startDate,
				provider: plan.provider,
				model: plan.model,
				overview: plan.overview,
				finalOutcome: plan.finalOutcome,
				inputs: plan.inputs,
				createdAt: plan.createdAt,
				blocks: blockRows
					.filter((block) => block.planId === plan.id)
					.map((block) => ({
						number: block.idx + 1,
						days: `${block.startDay}-${block.endDay}`,
						theme: block.theme,
						objective: block.objective,
						covers: block.covers,
						notCovers: block.notCovers,
						milestone: block.milestone,
						status: block.status,
						sessions: dayRows
							.filter((day) => day.blockId === block.id)
							.map((day) => ({
								day: day.day,
								title: day.title,
								learn: day.learn,
								practice: day.practice,
								review: day.review,
								minutes: day.minutes,
								completedAt: day.completedAt
							}))
					})),
				conversation: conversation
					? messageRows
							.filter((message) => message.conversationId === conversation.id)
							.map((message) => ({
								role: message.role,
								parts: message.parts,
								provider: message.provider,
								model: message.model,
								createdAt: message.createdAt
							}))
					: []
			};
		})
	};
}

export function exportFilename(now = new Date()): string {
	return `plan-generator-export-${now.toISOString().slice(0, 10)}.json`;
}
