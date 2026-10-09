export const MESSAGES = {
	planNotFound: 'Plan not found',
	dayNotFound: 'That day does not exist.',
	planNotWriting: 'The plan is not being written right now.',
	waitForWriting: 'Wait until the plan has finished writing.',
	modelListFailed: 'Could not load the model list.',
	chatLoadFailed: 'Could not load the conversation.',
	chatOpenFailed: 'Could not open that chat.',
	chatDeleteFailed: 'Could not delete that chat.',
	actionFailed: 'That did not work. Try again.',
	daySaveFailed: 'Could not save that day. Try again.',
	resumeFailed: 'Could not resume the plan.',
	switchModelFailed: 'Could not switch the model.'
} as const;

export const addProviderKey = (providerName: string) =>
	`Add a ${providerName} key in Settings first.`;
