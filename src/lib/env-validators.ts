export function optionalString(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

export function requiredString(value: string | undefined): string {
	const trimmed = value?.trim();
	if (!trimmed) throw new Error('This variable is required');
	return trimmed;
}

export function positiveInt(fallback: number) {
	return (value: string | undefined): number => {
		const trimmed = value?.trim();
		if (!trimmed) return fallback;
		const parsed = Number(trimmed);
		if (!Number.isInteger(parsed) || parsed < 1) {
			throw new Error(`Expected a positive whole number, got "${trimmed}"`);
		}
		return parsed;
	};
}

export function booleanFlag(value: string | undefined): boolean {
	const trimmed = value?.trim().toLowerCase();
	return trimmed === '1' || trimmed === 'true';
}

export function base64Key32(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	if (!trimmed) return undefined;
	const bytes = Buffer.from(trimmed, 'base64');
	if (bytes.length !== 32 || bytes.toString('base64') !== trimmed) {
		throw new Error(
			'Expected 32 bytes encoded as base64 (generate one with: openssl rand -base64 32)'
		);
	}
	return trimmed;
}

export function httpUrl(value: string | undefined): string | undefined {
	const trimmed = optionalString(value);
	if (!trimmed) return undefined;
	const url = new URL(trimmed);
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error(`Expected an http or https URL, got "${trimmed}"`);
	}
	return trimmed;
}
