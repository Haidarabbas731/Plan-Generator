import type { Attachment } from 'svelte/attachments';

export const DISMISS_DISTANCE_RATIO = 0.3;
export const DISMISS_VELOCITY = 0.5;
const VELOCITY_WINDOW_MS = 100;
const RUBBER_BAND = 0.55;

export function rubberband(overshoot: number, dimension: number, constant = RUBBER_BAND): number {
	if (overshoot === 0) return 0;
	const sign = Math.sign(overshoot);
	const distance = Math.abs(overshoot);
	return (sign * (distance * dimension * constant)) / (dimension + constant * distance);
}

export function dragOffset(delta: number, height: number): number {
	return delta >= 0 ? delta : rubberband(delta, height);
}

export function shouldDismiss(delta: number, velocity: number, height: number): boolean {
	if (velocity > DISMISS_VELOCITY) return true;
	if (velocity < -DISMISS_VELOCITY) return false;
	return delta > height * DISMISS_DISTANCE_RATIO;
}

export function releaseVelocity(samples: { y: number; t: number }[], now: number): number {
	const recent = samples.filter((sample) => now - sample.t <= VELOCITY_WINDOW_MS);
	if (recent.length < 2) return 0;
	const first = recent[0];
	const last = recent[recent.length - 1];
	const elapsed = last.t - first.t;
	return elapsed > 0 ? (last.y - first.y) / elapsed : 0;
}

function captureOrIgnore(element: HTMLElement, pointerId: number) {
	try {
		element.setPointerCapture(pointerId);
	} catch {
		// the pointer may already be gone; dragging still works without capture
	}
}

function releaseCapture(element: HTMLElement, pointerId: number) {
	try {
		element.releasePointerCapture(pointerId);
	} catch {
		// nothing to release
	}
}

const reducedMotion = () =>
	typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function dragToDismiss(options: {
	target: () => HTMLElement | null;
	ondismiss: () => void;
}): Attachment<HTMLElement> {
	return (handle) => {
		let pointerId: number | null = null;
		let startY = 0;
		let samples: { y: number; t: number }[] = [];

		const sheet = () => options.target();

		function move(event: PointerEvent) {
			const element = sheet();
			if (event.pointerId !== pointerId || !element) return;
			const delta = event.clientY - startY;
			samples.push({ y: event.clientY, t: event.timeStamp });
			if (samples.length > 12) samples.shift();
			element.style.transform = `translateY(${dragOffset(delta, element.offsetHeight)}px)`;
		}

		function finish(event: PointerEvent) {
			const element = sheet();
			if (event.pointerId !== pointerId) return;
			pointerId = null;
			releaseCapture(handle, event.pointerId);
			if (!element) return;

			const delta = event.clientY - startY;
			const velocity = releaseVelocity(samples, event.timeStamp);
			const dismiss = shouldDismiss(delta, velocity, element.offsetHeight);
			const duration = reducedMotion() ? 0 : 280;

			element.style.transition = `transform ${duration}ms var(--ease-drawer)`;
			element.style.transform = dismiss ? 'translateY(100%)' : 'translateY(0)';
			window.setTimeout(
				() => {
					if (dismiss) options.ondismiss();
					element.style.transition = '';
					element.style.transform = '';
				},
				dismiss ? duration : duration + 20
			);
		}

		function down(event: PointerEvent) {
			if (pointerId !== null || !event.isPrimary) return;
			const element = sheet();
			if (!element) return;
			pointerId = event.pointerId;
			startY = event.clientY;
			samples = [{ y: event.clientY, t: event.timeStamp }];
			captureOrIgnore(handle, event.pointerId);
			element.style.transition = 'none';
		}

		handle.addEventListener('pointerdown', down);
		handle.addEventListener('pointermove', move);
		handle.addEventListener('pointerup', finish);
		handle.addEventListener('pointercancel', finish);
		return () => {
			handle.removeEventListener('pointerdown', down);
			handle.removeEventListener('pointermove', move);
			handle.removeEventListener('pointerup', finish);
			handle.removeEventListener('pointercancel', finish);
		};
	};
}
