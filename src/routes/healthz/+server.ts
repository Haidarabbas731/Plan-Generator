import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';

export async function GET() {
	try {
		await db.execute(sql`select 1`);
		return json({ status: 'ok' });
	} catch {
		return json({ status: 'unavailable' }, { status: 503 });
	}
}
