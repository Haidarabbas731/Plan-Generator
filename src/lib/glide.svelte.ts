export const GLIDE_DELAY_MS = 150;

export function useGlide(getNode: () => HTMLElement | null) {
	$effect(() => {
		const node = getNode();
		if (!node) return;
		const timer = setTimeout(() => node.setAttribute('data-glide', ''), GLIDE_DELAY_MS);
		return () => {
			clearTimeout(timer);
			node.removeAttribute('data-glide');
		};
	});
}
