import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.js';
import { logger } from '#lib/server/logger.js';
import { planQueue } from '#lib/server/plans/runtime.js';

if (!building) {
	void planQueue.recoverInterruptedPlans().catch((error) => {
		logger.error({ err: error }, 'Could not recover interrupted plans');
	});
	process.on('sveltekit:shutdown' as NodeJS.Signals, async () => {
		await planQueue.close(true);
	});
}

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/api/auth/error') redirect(302, `/auth-error${event.url.search}`);

	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;
	return svelteKitHandler({ event, resolve, auth, building });
};
