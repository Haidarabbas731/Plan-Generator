<script lang="ts">
	import { untrack } from 'svelte';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import type { ChatState } from '#lib/client/chat.svelte.js';
	import { cn } from '#lib/utils.js';

	interface Props {
		chat: ChatState;
		class?: string;
	}

	let { chat, class: className }: Props = $props();

	let open = $state(false);
	let confirming = $state<string | null>(null);
	let deleting = $state<string | null>(null);

	const time = new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});

	$effect(() => {
		if (!open) {
			confirming = null;
			return;
		}
		untrack(() => void chat.loadChats());
	});

	async function choose(id: string) {
		open = false;
		await chat.select(id);
	}

	async function remove(id: string) {
		if (confirming !== id) {
			confirming = id;
			return;
		}
		confirming = null;
		deleting = id;
		const removed = await chat.remove(id);
		deleting = null;
		if (removed && chat.chats.length === 0) open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger
		type="button"
		disabled={!chat.canSwitch}
		title={chat.busy ? 'Wait for the reply to finish' : undefined}
		aria-label="Chat: {chat.title}. Switch chat"
		class={cn(
			buttonVariants({ variant: 'ghost' }),
			'h-9 min-w-0 flex-1 justify-start gap-1.5 px-2 text-sm font-semibold',
			className
		)}
	>
		<span class="min-w-0 truncate">{chat.title}</span>
		<ChevronDownIcon
			class="size-4 shrink-0 text-muted-foreground transition-transform duration-(--dur-fast) ease-(--ease-out) motion-reduce:transition-none {open
				? 'rotate-180'
				: ''}"
			aria-hidden="true"
		/>
	</Popover.Trigger>
	<Popover.Content class="w-80 gap-0 p-0" align="start">
		<div class="border-b px-3 py-2.5">
			<p class="text-sm font-medium">Chats</p>
			<p class="text-caption text-muted-foreground">Each chat starts fresh. Newest first.</p>
		</div>
		<div class="max-h-72 overflow-y-auto p-1.5">
			{#if chat.listStatus === 'loading' && chat.chats.length === 0}
				<div class="flex flex-col gap-2 p-1.5" aria-hidden="true">
					<Skeleton class="h-10 w-full" />
					<Skeleton class="h-10 w-full" />
				</div>
			{:else if chat.listStatus === 'error' && chat.chats.length === 0}
				<p class="px-3 py-6 text-center text-sm text-muted-foreground">
					Could not load your chats.
				</p>
			{:else if chat.chats.length === 0}
				<p class="px-3 py-6 text-center text-sm text-muted-foreground">
					Your chats show up here once you send a message.
				</p>
			{:else}
				<ul class="flex flex-col">
					{#each chat.chats as item (item.id)}
						<li class="flex items-center gap-1 rounded-md">
							<button
								type="button"
								class="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40"
								aria-current={item.id === chat.conversationId ? 'true' : undefined}
								onclick={() => choose(item.id)}
							>
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate text-sm font-medium">{item.title}</span>
									<span class="text-caption text-muted-foreground">
										{time.format(new Date(item.lastMessageAt))}
									</span>
								</span>
								{#if item.id === chat.conversationId}
									<CheckIcon class="size-4 shrink-0 text-primary" aria-label="Current chat" />
								{/if}
							</button>
							<Button
								type="button"
								variant="destructive"
								size="sm"
								class={cn(
									'h-9 shrink-0 px-2.5',
									confirming === item.id &&
										'bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90'
								)}
								disabled={deleting !== null}
								aria-label="{confirming === item.id ? 'Confirm delete' : 'Delete'} {item.title}"
								onclick={() => remove(item.id)}
							>
								{confirming === item.id ? 'Confirm' : 'Delete'}
							</Button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		{#if chat.switchError}
			<p class="border-t px-3 py-2 text-caption text-destructive" role="alert">
				{chat.switchError}
			</p>
		{/if}
		<p class="border-t px-3 py-2 text-caption text-muted-foreground">
			Deleting a chat does not change your plan.
		</p>
	</Popover.Content>
</Popover.Root>
