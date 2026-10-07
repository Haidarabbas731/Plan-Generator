import { formatDate } from '#lib/format.js';
import { scheduleDates } from '#lib/schedule.js';
import type { ExportData } from './types.js';

export function exportFileName(title: string, extension: string): string {
	const slug = title
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return `${slug || 'plan'}.${extension}`;
}

export function buildMarkdown(data: ExportData): string {
	const { plan, blocks, days } = data;
	const dates = scheduleDates(plan.startDate, plan.studyDays, plan.daysTotal);
	const lines: string[] = [`# ${plan.title}`, ''];

	lines.push(`**Goal:** ${plan.goal}`, '');
	lines.push(
		`${plan.daysTotal} sessions · ${plan.minutesPerDay} minutes a day · starts ${formatDate(plan.startDate, 'date')}`,
		''
	);

	if (plan.overview) lines.push('## Overview', '', plan.overview, '');
	if (plan.finalOutcome) lines.push('## Final outcome', '', plan.finalOutcome, '');

	for (const block of blocks) {
		const range =
			block.startDay === block.endDay
				? `Day ${block.startDay}`
				: `Days ${block.startDay}–${block.endDay}`;
		lines.push(
			`## Block ${block.idx + 1} · ${block.theme}`,
			'',
			`_${range}_`,
			'',
			block.objective,
			''
		);

		const blockDays = days.filter((day) => day.blockId === block.id);
		if (blockDays.length === 0) {
			lines.push('_This block has not been written yet._', '');
		}
		for (const day of blockDays) {
			const date = dates[day.day - 1];
			lines.push(
				`### Day ${day.day} · ${day.title}`,
				'',
				`${date ? `${formatDate(date, 'short')} · ` : ''}${day.minutes} min${day.completed ? ' · done' : ''}`,
				'',
				`- **Learn:** ${oneLine(day.learn)}`,
				`- **Practice:** ${oneLine(day.practice)}`,
				`- **Review:** ${oneLine(day.review)}`,
				''
			);
		}

		lines.push(
			`> **Milestone (day ${block.endDay}): ${block.milestone.title}**`,
			'>',
			`> ${oneLine(block.milestone.description)}`,
			'>',
			`> Done when: ${oneLine(block.milestone.successCriteria)}`,
			''
		);
	}

	return (
		lines
			.join('\n')
			.replace(/\n{3,}/g, '\n\n')
			.trimEnd() + '\n'
	);
}

function oneLine(text: string): string {
	return text.replace(/\s*\n\s*/g, ' ').trim();
}
