<script lang="ts">
	import { enhance } from '$app/forms';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Spinner } from '#lib/components/ui/spinner/index.js';

	interface Props {
		open: boolean;
		title: string;
		action?: string;
		planId?: string;
		ondeleted?: () => void;
	}

	let { open = $bindable(false), title, action = '?/delete', planId, ondeleted }: Props = $props();

	let deleting = $state(false);
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete this plan?</AlertDialog.Title>
			<AlertDialog.Description>
				“{title}” and your progress will be removed. This cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form
			method="POST"
			{action}
			use:enhance={() => {
				deleting = true;
				return async ({ result, update }) => {
					await update();
					deleting = false;
					if (result.type === 'success') {
						open = false;
						ondeleted?.();
					}
				};
			}}
		>
			{#if planId}<input type="hidden" name="planId" value={planId} />{/if}
			<AlertDialog.Footer>
				<AlertDialog.Cancel type="button" disabled={deleting}>Keep plan</AlertDialog.Cancel>
				<Button type="submit" variant="destructive" disabled={deleting}>
					{#if deleting}<Spinner data-icon="inline-start" />{/if}
					Delete plan
				</Button>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>
