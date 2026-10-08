export const PROVIDERS = ['google', 'openrouter', 'anthropic', 'openai'] as const;

export type Provider = (typeof PROVIDERS)[number];

export interface ProviderInfo {
	id: Provider;
	name: string;
	keyUrl: string;
	pricingUrl: string;
}

export const PROVIDER_INFO: Record<Provider, ProviderInfo> = {
	google: {
		id: 'google',
		name: 'Google Gemini',
		keyUrl: 'https://aistudio.google.com/apikey',
		pricingUrl: 'https://ai.google.dev/gemini-api/docs/pricing'
	},
	openrouter: {
		id: 'openrouter',
		name: 'OpenRouter',
		keyUrl: 'https://openrouter.ai/keys',
		pricingUrl: 'https://openrouter.ai/models'
	},
	anthropic: {
		id: 'anthropic',
		name: 'Anthropic',
		keyUrl: 'https://console.anthropic.com/settings/keys',
		pricingUrl: 'https://platform.claude.com/docs/en/about-claude/pricing'
	},
	openai: {
		id: 'openai',
		name: 'OpenAI',
		keyUrl: 'https://platform.openai.com/api-keys',
		pricingUrl: 'https://developers.openai.com/api/docs/pricing'
	}
};

export function isProvider(value: unknown): value is Provider {
	return typeof value === 'string' && (PROVIDERS as readonly string[]).includes(value);
}
