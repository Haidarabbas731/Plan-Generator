import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as schema from '../db/schema.js';
import { buildUserExport, exportFilename } from './user-data.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('user data export and account deletion (real database)', () => {
	const client = postgres(url ?? '', { max: 2 });
	const db = drizzle(client, { schema });
	const userId = `ex-${randomBytes(6).toString('hex')}`;
	const otherId = `ex-${randomBytes(6).toString('hex')}`;
	let planId = '';
	let otherPlanId = '';

	beforeAll(async () => {
		for (const id of [userId, otherId]) {
			await db.insert(schema.user).values({ id, name: `Export ${id}`, email: `${id}@example.com` });
		}
		await db.insert(schema.userPrefs).values({
			userId,
			defaultProvider: 'google',
			defaultModel: 'gemini-test'
		});
		await db.insert(schema.providerKeys).values({
			userId,
			provider: 'google',
			encryptedKey: 'SECRET-CIPHERTEXT',
			last4: 'abcd'
		});
		await db.insert(schema.usageEvents).values({ userId, kind: 'chat' });
		await db.insert(schema.session).values({
			id: `s-${userId}`,
			userId,
			token: `t-${userId}`,
			expiresAt: new Date(Date.now() + 60_000)
		});
		await db.insert(schema.account).values({
			id: `a-${userId}`,
			userId,
			accountId: userId,
			providerId: 'credential'
		});

		const inputs = {
			goal: 'Learn Rust',
			level: null,
			studyDays: [1],
			doneLooksLike: null,
			daysTotal: 1,
			minutesPerDay: 30,
			blockSize: 3
		};
		const [plan] = await db
			.insert(schema.plans)
			.values({
				userId,
				title: 'Rust basics',
				goal: 'Learn Rust',
				inputs,
				startDate: '2026-10-05',
				provider: 'google',
				model: 'gemini-test'
			})
			.returning();
		planId = plan.id;
		const [block] = await db
			.insert(schema.planBlocks)
			.values({
				planId,
				idx: 0,
				startDay: 1,
				endDay: 1,
				theme: 'Start',
				objective: 'Begin',
				milestone: { title: 'm', description: 'd', successCriteria: 's' }
			})
			.returning();
		await db.insert(schema.planDays).values({
			planId,
			blockId: block.id,
			day: 1,
			title: 'Day one',
			learn: 'learn',
			practice: 'practice',
			review: 'review',
			minutes: 30,
			completedAt: new Date()
		});
		await db
			.insert(schema.planRevisions)
			.values({ planId, number: 1, snapshot: {}, source: 'generation' });
		const [conversation] = await db
			.insert(schema.conversations)
			.values({ planId, userId })
			.returning();
		await db.insert(schema.messages).values({
			conversationId: conversation.id,
			role: 'user',
			parts: [{ type: 'text', text: 'hello' }]
		});

		const [other] = await db
			.insert(schema.plans)
			.values({
				userId: otherId,
				title: 'Someone else',
				goal: 'Private',
				inputs,
				startDate: '2026-10-05',
				provider: 'google',
				model: 'gemini-test'
			})
			.returning();
		otherPlanId = other.id;
	});

	afterAll(async () => {
		for (const id of [userId, otherId]) {
			await db.delete(schema.user).where(eq(schema.user.id, id));
		}
		await client.end();
	});

	it('exports profile, defaults, plans with sessions and chat, and never the key', async () => {
		const data = await buildUserExport(db, userId, new Date('2026-10-08T10:00:00Z'));
		expect(data).not.toBeNull();
		expect(data!.profile.email).toBe(`${userId}@example.com`);
		expect(data!.preferences).toEqual({ defaultProvider: 'google', defaultModel: 'gemini-test' });
		expect(data!.providerKeys).toEqual([
			expect.objectContaining({ provider: 'google', last4: 'abcd' })
		]);
		expect(data!.plans).toHaveLength(1);
		const [plan] = data!.plans;
		expect(plan.blocks[0].sessions[0]).toMatchObject({ day: 1, title: 'Day one' });
		expect(plan.blocks[0].sessions[0].completedAt).toBeInstanceOf(Date);
		expect(plan.conversation).toEqual([expect.objectContaining({ role: 'user' })]);

		const text = JSON.stringify(data);
		expect(text).not.toContain('SECRET-CIPHERTEXT');
		expect(text).not.toContain('Someone else');
	});

	it('returns null for a user that does not exist', async () => {
		expect(await buildUserExport(db, 'missing-user')).toBeNull();
	});

	it('names the file after the export date', () => {
		expect(exportFilename(new Date('2026-10-08T23:59:00Z'))).toBe(
			'plan-generator-export-2026-10-08.json'
		);
	});

	it('every table that points at a user deletes with the user', async () => {
		const links = await client<{ table: string; column: string; action: string }[]>`
			select c.conrelid::regclass::text as "table", a.attname as "column", c.confdeltype as action
			from pg_constraint c
			join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
			where c.contype = 'f' and c.confrelid = '"user"'::regclass`;
		expect(links.length).toBeGreaterThan(5);
		expect(links.filter((link) => link.action !== 'c')).toEqual([]);

		await db.delete(schema.user).where(eq(schema.user.id, userId));

		for (const link of links) {
			const rows = await client.unsafe(
				`select 1 from ${link.table} where "${link.column}" = $1 limit 1`,
				[userId]
			);
			expect(rows, `${link.table} still has rows for the deleted user`).toHaveLength(0);
		}
		const leftovers = await Promise.all(
			[schema.planBlocks, schema.planDays, schema.planRevisions, schema.conversations].map(
				(table) => db.select().from(table).where(eq(table.planId, planId))
			)
		);
		expect(leftovers.flat()).toEqual([]);
		const [other] = await db.select().from(schema.plans).where(eq(schema.plans.id, otherPlanId));
		expect(other).toBeDefined();
	});
});
