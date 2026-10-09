import type { ModelOption, ModelPricing } from '#lib/model-options.js';

const NON_CHAT_OPENAI_MARKERS = [
	'embedding',
	'whisper',
	'tts',
	'dall-e',
	'moderation',
	'image',
	'audio',
	'realtime',
	'transcribe',
	'sora',
	'davinci',
	'babbage'
];

interface GoogleModel {
	name?: string;
	displayName?: string;
	supportedGenerationMethods?: string[];
}
interface AnthropicModel {
	id?: string;
	display_name?: string;
}
interface OpenAiModel {
	id?: string;
}
interface OpenRouterModel {
	id?: string;
	name?: string;
	architecture?: { input_modalities?: string[]; output_modalities?: string[] };
	pricing?: { prompt?: unknown; completion?: unknown };
}

const PER_MILLION = 1_000_000;

function perMillion(value: unknown): number | undefined {
	const perToken = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
	if (!Number.isFinite(perToken) || perToken < 0) return undefined;
	return Math.round(perToken * PER_MILLION * 1_000_000) / 1_000_000;
}

function openRouterPricing(pricing: OpenRouterModel['pricing']): ModelPricing | undefined {
	const input = perMillion(pricing?.prompt);
	const output = perMillion(pricing?.completion);
	return input === undefined || output === undefined ? undefined : { input, output };
}

const isText = (value: string | undefined): value is string =>
	typeof value === 'string' && value.length > 0;

const asList = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const byName = (a: ModelOption, b: ModelOption) => a.name.localeCompare(b.name);

export function parseGoogleModels(body: unknown): ModelOption[] {
	const root = (body ?? {}) as { models?: unknown };
	return asList<GoogleModel>(root.models)
		.filter(
			(model) => isText(model.name) && model.supportedGenerationMethods?.includes('generateContent')
		)
		.map((model) => {
			const id = model.name!.replace(/^models\//, '');
			return { id, name: model.displayName || id };
		})
		.sort(byName);
}

export function parseAnthropicModels(body: unknown): ModelOption[] {
	const root = (body ?? {}) as { data?: unknown };
	return asList<AnthropicModel>(root.data)
		.filter((model) => isText(model.id))
		.map((model) => ({ id: model.id!, name: model.display_name || model.id! }))
		.sort(byName);
}

export function parseOpenAiModels(body: unknown): ModelOption[] {
	const root = (body ?? {}) as { data?: unknown };
	return asList<OpenAiModel>(root.data)
		.filter(
			(model) =>
				isText(model.id) && !NON_CHAT_OPENAI_MARKERS.some((marker) => model.id!.includes(marker))
		)
		.map((model) => ({ id: model.id!, name: model.id! }))
		.sort(byName);
}

export function parseOpenRouterModels(body: unknown): ModelOption[] {
	const root = (body ?? {}) as { data?: unknown };
	return asList<OpenRouterModel>(root.data)
		.filter(
			(model) =>
				isText(model.id) &&
				model.architecture?.input_modalities?.includes('text') !== false &&
				model.architecture?.output_modalities?.includes('text') !== false
		)
		.map((model) => {
			const pricing = openRouterPricing(model.pricing);
			return {
				id: model.id!,
				name: model.name || model.id!,
				...(pricing ? { pricing } : {})
			};
		})
		.sort(byName);
}
