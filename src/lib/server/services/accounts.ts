import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { user } from '../db/schema.js';

export type AccountState = 'none' | 'unverified' | 'verified';

export async function accountState(address: string): Promise<AccountState> {
	const [row] = await db
		.select({ emailVerified: user.emailVerified })
		.from(user)
		.where(eq(user.email, address.trim().toLowerCase()))
		.limit(1);
	if (!row) return 'none';
	return row.emailVerified ? 'verified' : 'unverified';
}
