export interface ModelPricing {
	input: number;
	output: number;
}

export interface ModelOption {
	id: string;
	name: string;
	pricing?: ModelPricing;
}

const FREE_WORD = 'free';

export function isFreeModel(option: ModelOption): boolean {
	return option.pricing !== undefined && option.pricing.input === 0 && option.pricing.output === 0;
}

export function formatPrice(perMillion: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: Number.isInteger(perMillion) ? 0 : 2,
		maximumFractionDigits: 3
	}).format(perMillion);
}

export function describePricing(option: ModelOption): string | null {
	if (!option.pricing) return null;
	if (isFreeModel(option)) return 'Free';
	return `${formatPrice(option.pricing.input)} in · ${formatPrice(option.pricing.output)} out per 1M tokens`;
}

export function filterModels(models: ModelOption[], query: string): ModelOption[] {
	const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return models;
	const knowsPrices = models.some((option) => option.pricing !== undefined);

	return models.filter((option) => {
		const haystack = `${option.name} ${option.id}`.toLowerCase();
		return tokens.every((token) =>
			knowsPrices && token === FREE_WORD ? isFreeModel(option) : haystack.includes(token)
		);
	});
}
