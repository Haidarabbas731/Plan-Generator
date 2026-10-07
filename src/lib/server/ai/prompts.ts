import type { LedgerEntry, PlanInputs } from '#lib/plan-types.js';
import type { BlockRange } from './blocks.js';
import { windowLedger } from './ledger.js';
import type { BlockOutput, Outline, OutlineBlock } from './types.js';

const LEVEL_LABEL: Record<string, string> = {
	beginner: 'beginner',
	some: 'has some experience',
	returning: 'returning after a break'
};

export const OUTLINER_INSTRUCTIONS =
	"You are an experienced coach who designs realistic learning roadmaps. You plan so that every block has its own scope and nothing is taught twice. Write in the same language as the learner's goal.";

export const BLOCK_WRITER_INSTRUCTIONS =
	"You are an experienced coach writing one block of a day-by-day learning plan. Every task is something the learner can start immediately and know when it is finished. You never re-teach what was already taught. Write in the same language as the learner's goal.";

function context(inputs: PlanInputs): string {
	return [
		`<goal>${inputs.goal}</goal>`,
		`<level>${inputs.level ? LEVEL_LABEL[inputs.level] : 'not given'}</level>`,
		`<done_looks_like>${inputs.doneLooksLike ?? 'not given'}</done_looks_like>`,
		`<time>${inputs.daysTotal} days, ${inputs.minutesPerDay} minutes per day</time>`
	].join('\n');
}

export function outlinerPrompt(inputs: PlanInputs, ranges: BlockRange[]): string {
	const blocks = ranges
		.map((r) => `<block index="${r.index}" start="${r.startDay}" end="${r.endDay}" />`)
		.join('\n');
	return `<task>outline</task>
${context(inputs)}
<blocks>
${blocks}
</blocks>

Design the roadmap as exactly these blocks, in this order, using these exact index, start and end values.

For each block give: theme, objective (one sentence), covers (3 to 8 specific topics that only this block teaches), notCovers (topics that belong to other blocks), and a milestone (a small project or test, with success criteria the learner can check).

Rules:
- No topic may appear in the covers of two blocks.
- Each block builds on the previous one, moving from fundamentals to the stated goal.
- Be concrete and specific. No motivational filler.

Also give: title (under 70 characters), overview (two sentences), finalOutcome (what the learner can do on the last day) and topicTag (one or two words).`;
}

function formatLedger(ledger: LedgerEntry[]): string {
	const { recent, earlierTopics } = windowLedger(ledger);
	const lines: string[] = [];
	if (earlierTopics.length > 0) lines.push(`Earlier topics: ${earlierTopics.join('; ')}`);
	for (const entry of recent) {
		lines.push(`Day ${entry.day}: ${entry.title} [${entry.topics.join('; ')}]`);
	}
	return lines.length > 0 ? lines.join('\n') : 'Nothing yet. This is the first block.';
}

function formatPreviousBlock(previous: BlockOutput | null): string {
	if (!previous) return 'None. This is the first block.';
	return previous.days
		.map(
			(d) =>
				`Day ${d.day}: ${d.title} | Learn: ${d.learn} | Practice: ${d.practice} | Review: ${d.review}`
		)
		.join('\n');
}

export function blockWriterPrompt(args: {
	inputs: PlanInputs;
	outline: Outline;
	block: OutlineBlock;
	ledger: LedgerEntry[];
	previous: BlockOutput | null;
}): string {
	const { inputs, outline, block, ledger, previous } = args;
	const days = block.endDay - block.startDay + 1;
	return `<task>block</task>
${context(inputs)}
<plan_overview>${outline.overview}</plan_overview>
<this_block index="${block.index}" start="${block.startDay}" end="${block.endDay}">
<theme>${block.theme}</theme>
<objective>${block.objective}</objective>
<covers>${block.covers.join('; ')}</covers>
<not_covers>${block.notCovers.join('; ')}</not_covers>
<milestone>${block.milestone.title}: ${block.milestone.description} (success: ${block.milestone.successCriteria})</milestone>
</this_block>
<minutes_per_day>${inputs.minutesPerDay}</minutes_per_day>
<already_taught>
${formatLedger(ledger)}
</already_taught>
<previous_block>
${formatPreviousBlock(previous)}
</previous_block>

Write exactly days ${block.startDay} to ${block.endDay} (${days} days), one entry per day.

Each day has: title (specific and different from every title in already_taught), learn (what to study), practice (a concrete exercise with a result the learner can check; the largest part of the time), review (what to recall from earlier days, by name), minutes (about ${inputs.minutesPerDay}; together about ${days * inputs.minutesPerDay}) and topics (1 to 3 short labels for what the day teaches).

Rules:
- Do not teach anything listed in already_taught as if it were new. Review may revisit earlier topics by name.
- Stay within this block's covers and never teach its not_covers.
- Continue naturally from the previous block. The last day of the block includes work toward the milestone.
- No motivational filler.`;
}

export function withFeedback(prompt: string, issues: string[]): string {
	return `${prompt}

Your previous answer had these problems. Write the whole answer again and fix every one of them:
${issues.map((issue) => `- ${issue}`).join('\n')}`;
}
