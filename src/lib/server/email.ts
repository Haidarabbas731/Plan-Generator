import { logger } from './logger.js';

export interface EmailMessage {
	to: string;
	subject: string;
	text: string;
}

export interface EmailSenderOptions {
	apiKey: string | undefined;
	from: string | undefined;
	fetch?: typeof fetch;
}

export const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function createEmailSender(options: EmailSenderOptions) {
	const { apiKey, from } = options;
	const doFetch = options.fetch ?? fetch;
	const enabled = Boolean(apiKey && from);

	async function send(message: EmailMessage): Promise<boolean> {
		if (!enabled) return false;
		try {
			const response = await doFetch(RESEND_ENDPOINT, {
				method: 'POST',
				headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
				body: JSON.stringify({
					from,
					to: [message.to],
					subject: message.subject,
					text: message.text
				})
			});
			if (!response.ok) {
				logger.error({ status: response.status }, 'The email provider rejected a message');
				return false;
			}
			return true;
		} catch (error) {
			logger.error({ err: error }, 'Could not send an email');
			return false;
		}
	}

	return { enabled, send };
}

export type EmailSender = ReturnType<typeof createEmailSender>;
