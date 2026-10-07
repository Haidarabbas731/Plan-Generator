import { generateText, NoObjectGeneratedError, Output, type LanguageModel } from 'ai';
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
			issues = ['The answer was not valid JSON in the required format.'];
		}
		prompt = withFeedback(args.prompt, issues);
	}

	throw new GenerationError(
		`The model did not produce a valid answer after ${attempts} attempts.`,
		issues
	);
}
