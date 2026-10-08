import type { Attachment } from 'svelte/attachments';

export function inview(): Attachment<HTMLElement> {
	return (node) => {
		if (typeof IntersectionObserver === 'undefined') return;
		if (node.getBoundingClientRect().top < window.innerHeight * 0.9) return;

		node.dataset.reveal = 'pending';

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				node.dataset.reveal = 'shown';
				observer.disconnect();
			},
			{ rootMargin: '0px 0px -12% 0px' }
		);
		observer.observe(node);

		return () => {
			observer.disconnect();
			delete node.dataset.reveal;
		};
	};
}
