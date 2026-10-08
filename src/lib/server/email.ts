import { EMAIL_LOGO } from './email-logo.js';
import { APP_NAME } from './email-templates.js';
import { logger } from './logger.js';

export interface EmailMessage {
	to: string;
	subject: string;
	text: string;
	html?: string;
	inlineLogo?: boolean;
}

export interface EmailOutbox {
	save(message: EmailMessage): Promise<void>;
}

export interface EmailSenderOptions {
	apiKey: string | undefined;
	from: string | undefined;
	fetch?: typeof fetch;
	outbox?: EmailOutbox;
}

export const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const RESERVED_TEST_DOMAINS = ['example.com', 'example.org', 'example.net'];
const RESERVED_TEST_SUFFIXES = ['.test', '.example', '.invalid', '.localhost'];

export function formatFrom(from: string, name = APP_NAME): string {
	const address = from.trim();
	return address.includes('<') ? address : `${name} <${address}>`;
}

export function isReservedTestAddress(address: string): boolean {
	const domain = address.trim().toLowerCase().split('@').pop() ?? '';
	return (
		RESERVED_TEST_DOMAINS.includes(domain) ||
		RESERVED_TEST_SUFFIXES.some((suffix) => domain.endsWith(suffix))
	);
}

export function createEmailSender(options: EmailSenderOptions) {
	const { apiKey, outbox } = options;
	const from = options.from ? formatFrom(options.from) : undefined;
	const doFetch = options.fetch ?? fetch;
	const enabled = Boolean(apiKey && from);

	async function send(message: EmailMessage): Promise<boolean> {
		if (!enabled) return false;

		if (isReservedTestAddress(message.to)) {
			await outbox?.save(message).catch((error) => {
				logger.warn({ err: error }, 'Could not keep a test email in the outbox');
			});
			return true;
		}

		try {
			const response = await doFetch(RESEND_ENDPOINT, {
				method: 'POST',
				headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
				body: JSON.stringify({
					from,
					to: [message.to],
					subject: message.subject,
					text: message.text,
					...(message.html ? { html: message.html } : {}),
					...(message.inlineLogo
						? {
								attachments: [
									{
										filename: EMAIL_LOGO.filename,
										content: EMAIL_LOGO.base64,
										content_type: EMAIL_LOGO.contentType,
										content_id: EMAIL_LOGO.contentId
									}
								]
							}
						: {})
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
