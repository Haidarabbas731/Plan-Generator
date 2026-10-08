<script lang="ts">
	import { cn } from '#lib/utils.js';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		children: Snippet;
	}

	let { class: className, children, ...restProps }: Props = $props();
</script>

<div
	class={cn(
		'flex w-fit max-w-full min-w-0 flex-col gap-2 overflow-hidden text-sm',
		'group-[.is-user]:ml-auto group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-md group-[.is-user]:bg-accent group-[.is-user]:px-4 group-[.is-user]:py-2.5 group-[.is-user]:text-accent-foreground',
		'group-[.is-assistant]:leading-relaxed group-[.is-assistant]:text-foreground',
		className
	)}
	{...restProps}
>
	{@render children()}
</div>
