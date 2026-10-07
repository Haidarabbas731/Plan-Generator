import type { Handle } from '@sveltejs/kit/hooks';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.js';
import { planStore } from '#lib/server/plans/runtime.js';

if (!building) {
	void planStore.markGeneratingPlansPaused().catch((error) => {
		console.error('Could not recover interrupted plans', error);
	});
}

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;
	return svelteKitHandler({ event, resolve, auth, building });
};
