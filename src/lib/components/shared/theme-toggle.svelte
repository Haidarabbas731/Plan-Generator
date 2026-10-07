<script lang="ts">
	import { setMode, userPrefersMode } from 'mode-watcher';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
	import { cn } from '#lib/utils.js';

	type Mode = 'light' | 'dark' | 'system';

	function onValueChange(value: string) {
		setMode(value as Mode);
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
		aria-label="Change theme"
	>
		<SunIcon class="dark:hidden" />
		<MoonIcon class="hidden dark:block" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-40">
		<DropdownMenu.RadioGroup value={userPrefersMode.current} {onValueChange}>
			<DropdownMenu.RadioItem value="light">
				<SunIcon /> Light
			</DropdownMenu.RadioItem>
			<DropdownMenu.RadioItem value="dark">
				<MoonIcon /> Dark
			</DropdownMenu.RadioItem>
			<DropdownMenu.RadioItem value="system">
				<MonitorIcon /> System
			</DropdownMenu.RadioItem>
		</DropdownMenu.RadioGroup>
	</DropdownMenu.Content>
</DropdownMenu.Root>
