<script lang="ts">
	import ClockIcon from '@lucide/svelte/icons/clock';
	import FolderLockIcon from '@lucide/svelte/icons/folder-lock';
	import MailIcon from '@lucide/svelte/icons/mail';

	interface Props {
		minutes: number;
	}

	let { minutes }: Props = $props();

	const points = $derived([
		{ icon: MailIcon, text: 'We email you a link to choose a new password.' },
		{ icon: ClockIcon, text: `The link works for ${minutes} minutes.` },
		{ icon: FolderLockIcon, text: 'Your plans and chats stay exactly as they are.' }
	]);
</script>

<div class="flex flex-col gap-3">
	<h2 class="text-display">Locked out? It happens.</h2>
	<p class="text-body text-muted-foreground">Getting back in takes a minute.</p>
</div>

<ul class="flex flex-col gap-4">
	{#each points as point, i (point.text)}
		<li class="flex reveal items-center gap-4" style="--reveal-i: {i}">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
				<point.icon class="size-5" aria-hidden="true" />
			</span>
			<span class="text-body text-muted-foreground">{point.text}</span>
		</li>
	{/each}
</ul>
