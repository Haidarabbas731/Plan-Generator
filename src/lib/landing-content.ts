export interface Benefit {
	title: string;
	text: string;
}

export interface Step {
	title: string;
	text: string;
}

export interface FaqEntry {
	question: string;
	answer: string;
}

export const BENEFITS: Benefit[] = [
	{
		title: 'A task for every day',
		text: 'Learn, Practice and Review, with a milestone at the end of every block.'
	},
	{
		title: 'Start reading while it writes',
		text: 'The plan arrives block by block, so the first days are ready before the last are written.'
	},
	{
		title: 'Change it by talking',
		text: 'Say "make block 2 easier" or "I only have weekends now". Every change can be undone.'
	},
	{
		title: 'Your key, your data',
		text: 'Your AI key is stored encrypted and only its last four characters are ever shown. Export or delete everything.'
	}
];

export const STEPS: Step[] = [
	{
		title: 'Describe your goal',
		text: 'Write the goal in your own words, choose how many days and hours you have, and pick a start date.'
	},
	{
		title: 'Read the plan as it is written',
		text: 'The plan is written block by block, so you can start on the first days while the rest is still coming. No day repeats an earlier one.'
	},
	{
		title: 'Follow it and adjust',
		text: 'Tick days off and keep a streak. Ask the chat to make a week easier or to reschedule when your week changes. Every change can be undone.'
	}
];

export const FAQ: FaqEntry[] = [
	{
		question: 'Do I need my own AI key?',
		answer:
			'Yes. Plans are written with a key from Google Gemini, OpenRouter, Anthropic or OpenAI. You add it once in Settings.'
	},
	{
		question: 'Is Plan Generator free?',
		answer:
			'Yes. There is nothing to pay here. You only pay your AI provider for the calls your plans use, and the new-plan form shows how many calls a plan will make.'
	},
	{
		question: 'Which models can I use?',
		answer:
			'Any model your provider offers for your key. The list is loaded from the provider, and you can pick a different model for each plan or set a default.'
	},
	{
		question: 'Is my key safe?',
		answer:
			'Your key is encrypted before it is stored, only its last four characters are ever shown, and it is used only to write and change your plans. You can delete it any time.'
	},
	{
		question: 'Can I change a plan after it is written?',
		answer:
			'Yes. Ask the chat to make a block easier or to move your schedule. Each change is saved as a revision, so you can undo it or restore an earlier version.'
	},
	{
		question: 'What if I miss days?',
		answer:
			'Nothing breaks. The plan tells you how many sessions you are behind and keeps them open, so you can finish them at your own pace.'
	},
	{
		question: 'Can I take my plan with me?',
		answer:
			'Yes. Export a plan as Markdown or as a calendar file (ICS), or download all your data as JSON from Settings.'
	},
	{
		question: 'Can I delete my data?',
		answer:
			'Yes. Delete a single plan, or delete your account and everything in it, including your saved keys.'
	}
];

export const PROOF_POINTS = [
	'Free to use',
	'You bring your own AI key',
	'Export to Markdown or calendar'
] as const;
