import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RevisionHistory from './revision-history.svelte';

const revisions = [
	{
		id: 'r3',
		number: 3,
		source: 'chat',
		summary: 'Rewrote block 2: make it easier',
		createdAt: '2026-10-07T10:00:00Z'
	},
	{
		id: 'r2',
		number: 2,
		source: 'chat',
		summary: 'Start date set to 2026-11-02',
		createdAt: '2026-10-07T09:00:00Z'
	},
	{ id: 'r1', number: 1, source: 'generation', summary: null, createdAt: '2026-10-07T08:00:00Z' }
];

function stubFetch(ok = true) {
	const fetchMock = vi.fn(async () =>
		ok
			? new Response(JSON.stringify({ current: 3, revisions }), { status: 200 })
			: new Response('nope', { status: 500 })
	);
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

async function openHistory() {
	await fireEvent.click(screen.getByRole('button', { name: 'Plan versions' }));
}

afterEach(() => vi.unstubAllGlobals());

describe('RevisionHistory', () => {
	it('does not load anything until it is opened', () => {
		const fetchMock = stubFetch();
		render(RevisionHistory, { props: { planId: 'p1', currentRevision: 3, onrestore: () => {} } });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('lists the revisions, newest first, and marks the current one', async () => {
		const fetchMock = stubFetch();
		render(RevisionHistory, { props: { planId: 'p1', currentRevision: 3, onrestore: () => {} } });
		await openHistory();
		expect(await screen.findByText('Rewrote block 2: make it easier')).toBeInTheDocument();
		expect(fetchMock).toHaveBeenCalledWith('/plans/p1/revisions', expect.anything());
		expect(screen.getByText('Current')).toBeInTheDocument();
		expect(screen.getByText('Start date set to 2026-11-02')).toBeInTheDocument();
		expect(screen.getByText('Generated', { selector: 'span.truncate' })).toBeInTheDocument();
	});

	it('asks for confirmation before restoring', async () => {
		stubFetch();
		const onrestore = vi.fn();
		render(RevisionHistory, { props: { planId: 'p1', currentRevision: 3, onrestore } });
		await openHistory();
		await screen.findByText('Rewrote block 2: make it easier');

		const restoreButtons = screen.getAllByRole('button', { name: 'Restore' });
		await fireEvent.click(restoreButtons[0]);
		expect(onrestore).not.toHaveBeenCalled();
		await fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
		expect(onrestore).toHaveBeenCalledWith(2);
	});

	it('does not offer to restore the revision that is already current', async () => {
		stubFetch();
		render(RevisionHistory, { props: { planId: 'p1', currentRevision: 3, onrestore: () => {} } });
		await openHistory();
		await screen.findByText('Rewrote block 2: make it easier');
		expect(screen.getAllByRole('button', { name: 'Restore' })).toHaveLength(2);
	});

	it('says so when the history cannot be loaded', async () => {
		stubFetch(false);
		render(RevisionHistory, { props: { planId: 'p1', currentRevision: 3, onrestore: () => {} } });
		await openHistory();
		expect(await screen.findByText('Could not load the plan versions.')).toBeInTheDocument();
	});

	it('cannot be opened while the plan is being written', () => {
		stubFetch();
		render(RevisionHistory, {
			props: { planId: 'p1', currentRevision: 3, disabled: true, onrestore: () => {} }
		});
		expect(screen.getByRole('button', { name: 'Plan versions' })).toBeDisabled();
	});
});
