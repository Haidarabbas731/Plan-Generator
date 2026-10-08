import { generateText, NoObjectGeneratedError, Output, streamText, type LanguageModel } from 'ai';
import type { z } from 'zod';
import { GENERATION_ATTEMPTS } from '../config.js';
import { withFeedback } from './prompts.js';

export class GenerationError extends Error {
	constructor(
		message: string,
		readonly issues: string[]
	) {
		super(message);
		this.name = 'GenerationError';
	}
}

export interface GenerateValidatedArgs<T> {
	model: LanguageModel;
	instructions: string;
	prompt: string;
	schema: z.ZodType<T>;
	validate: (value: T) => string[];
	abortSignal?: AbortSignal;
	attempts?: number;
}

const NOT_JSON = 'The answer was not valid JSON in the required format.';
const MAX_REPORTED_ISSUES = 8;

interface SchemaIssue {
	path: (string | number)[];
	message: string;
}

export function schemaIssues(error: NoObjectGeneratedError): string[] {
	const validation = error.cause as { cause?: { issues?: SchemaIssue[] } } | undefined;
	const issues = validation?.cause?.issues;
	if (!Array.isArray(issues) || issues.length === 0) return [NOT_JSON];
	return issues
		.slice(0, MAX_REPORTED_ISSUES)
		.map((issue) => `${issue.path.join('.') || 'answer'}: ${issue.message}`);
}

export interface StreamValidatedArgs<E> {
	model: LanguageModel;
	instructions: string;
	prompt: string;
	element: z.ZodType<E>;
	minItems?: number;
	maxItems?: number;
	validate: (value: E[]) => string[];
	onElement?: (element: E) => void;
	onRestart?: () => void;
	abortSignal?: AbortSignal;
	attempts?: number;
}

export async function streamValidated<E>(args: StreamValidatedArgs<E>): Promise<E[]> {
	const { model, instructions, element, validate, abortSignal } = args;
	const attempts = args.attempts ?? GENERATION_ATTEMPTS;

	let prompt = args.prompt;
	let issues: string[] = [];

	for (let attempt = 1; attempt <= attempts; attempt++) {
		if (attempt > 1) args.onRestart?.();
		let streamError: unknown;
		try {
			const result = streamText({
				model,
				instructions,
				prompt,
				output: Output.array({ element, minItems: args.minItems, maxItems: args.maxItems }),
				abortSignal,
				onError: ({ error }) => {
					streamError = error;
				}
			});
			for await (const item of result.elementStream) args.onElement?.(item);
			if (streamError) throw streamError;
			const output = await result.output;
			issues = validate(output);
			if (issues.length === 0) return output;
		} catch (error) {
			if (!NoObjectGeneratedError.isInstance(error)) throw error;
			issues = schemaIssues(error);
		}
		prompt = withFeedback(args.prompt, issues);
	}

	throw new GenerationError(
		`The model did not produce a valid answer after ${attempts} attempts.`,
		issues
	);
}

export async function generateValidated<T>(args: GenerateValidatedArgs<T>): Promise<T> {
	const { model, instructions, schema, validate, abortSignal } = args;
	const attempts = args.attempts ?? GENERATION_ATTEMPTS;

	let prompt = args.prompt;
	let issues: string[] = [];

	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			const result = await generateText({
				model,
				instructions,
				prompt,
				output: Output.object({ schema }),
				abortSignal
			});
			issues = validate(result.output);
			if (issues.length === 0) return result.output;
		} catch (error) {
			if (!NoObjectGeneratedError.isInstance(error)) throw error;
			issues = schemaIssues(error);
		}
		prompt = withFeedback(args.prompt, issues);
	}

	throw new GenerationError(
		`The model did not produce a valid answer after ${attempts} attempts.`,
		issues
	);
}
