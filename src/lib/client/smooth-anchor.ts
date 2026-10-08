import { replaceState } from '$app/navigation';

const reducedMotion = () =>
	typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function smoothAnchorClick(event: MouseEvent) {
	if (event.defaultPrevented || event.button !== 0) return;
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

	const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
	if (!link) return;

	const hash = link.getAttribute('href') ?? '';
	if (hash.length < 2) return;

	const target = document.getElementById(decodeURIComponent(hash.slice(1)));
	if (!target) return;

	event.preventDefault();
	target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
	replaceState(hash, {});
}
