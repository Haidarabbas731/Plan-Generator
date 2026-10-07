export const CHAT_WIDTH = {
	min: 320,
	max: 720,
	initial: 400,
	step: 24,
	bigStep: 96,
	maxViewportRatio: 0.55
} as const;

export const CHAT_WIDTH_STORAGE_KEY = 'plan-chat-width';

export function maxChatWidth(viewport: number): number {
	const byViewport = Math.floor(viewport * CHAT_WIDTH.maxViewportRatio);
	return Math.max(CHAT_WIDTH.min, Math.min(CHAT_WIDTH.max, byViewport));
}

export function clampChatWidth(width: number, viewport: number): number {
	if (!Number.isFinite(width)) return CHAT_WIDTH.initial;
	return Math.round(Math.min(maxChatWidth(viewport), Math.max(CHAT_WIDTH.min, width)));
}

export function widthFromPointer(pointerX: number, viewport: number): number {
	return clampChatWidth(viewport - pointerX, viewport);
}

export function widthFromKey(
	key: string,
	current: number,
	viewport: number,
	large = false
): number | null {
	const step = large ? CHAT_WIDTH.bigStep : CHAT_WIDTH.step;
	switch (key) {
		case 'ArrowLeft':
			return clampChatWidth(current + step, viewport);
		case 'ArrowRight':
			return clampChatWidth(current - step, viewport);
		case 'Home':
			return CHAT_WIDTH.min;
		case 'End':
			return maxChatWidth(viewport);
		default:
			return null;
	}
}

export function parseStoredWidth(raw: string | null, viewport: number): number | null {
	if (raw === null) return null;
	const value = Number(raw);
	return Number.isFinite(value) ? clampChatWidth(value, viewport) : null;
}
