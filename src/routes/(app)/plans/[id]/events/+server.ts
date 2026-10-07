import { error } from '@sveltejs/kit';
import { SSE_HEARTBEAT_MS } from '#lib/server/config.js';
import { requireUser } from '#lib/server/require-user.js';
import { planBus, planStore } from '#lib/server/plans/runtime.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, request }) => {
	const user = requireUser(locals);
	const plan = await planStore.getOwnedPlan(user.id, params.id);
	if (!plan) error(404, 'Plan not found');

	const encoder = new TextEncoder();
	let cleanup = () => {};

	const stream = new ReadableStream({
		async start(controller) {
			const send = (data: unknown) =>
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

			const unsubscribe = planBus.subscribe(plan.id, send);
			const heartbeat = setInterval(
				() => controller.enqueue(encoder.encode(': heartbeat\n\n')),
				SSE_HEARTBEAT_MS
			);
			cleanup = () => {
				clearInterval(heartbeat);
				unsubscribe();
			};
			request.signal.addEventListener('abort', () => {
				cleanup();
				try {
					controller.close();
				} catch {
					// the stream was already closed by the client
				}
			});

			const [current, blocks] = await Promise.all([
				planStore.getPlan(plan.id),
				planStore.listBlocks(plan.id)
			]);
			send({
				type: 'snapshot',
				planId: plan.id,
				status: current?.status ?? plan.status,
				error: current?.error ?? null,
				blocks: blocks.map((b) => ({ index: b.idx, status: b.status, error: b.error }))
			});
		},
		cancel() {
			cleanup();
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache, no-transform',
			connection: 'keep-alive'
		}
	});
};
