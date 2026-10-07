<script lang="ts">
	import { toggleMode } from 'mode-watcher';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { Button } from '#lib/components/ui/button/index.js';
</script>

<Button variant="ghost" size="icon" onclick={toggleMode} aria-label="Toggle light and dark theme">
	<SunIcon class="dark:hidden" />
	<MoonIcon class="hidden dark:block" />
</Button>
