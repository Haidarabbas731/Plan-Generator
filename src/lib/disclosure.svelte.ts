export function createDisclosureMode() {
	let instant = $state(false);

	return {
		get instant() {
			return instant;
		},
		onkeydown(event: KeyboardEvent) {
			if (event.key === 'Enter' || event.key === ' ') instant = true;
		},
		onpointerdown() {
			instant = false;
		}
	};
}
