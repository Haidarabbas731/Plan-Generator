import pino, { type DestinationStream, type Logger } from 'pino';

const REDACTED_KEYS = [
	'apiKey',
	'key',
	'password',
	'token',
	'secret',
	'authorization',
	'cookie',
	'headers.authorization',
	'headers.cookie',
	'headers["x-api-key"]',
	'headers["x-goog-api-key"]'
];

const paths = [...REDACTED_KEYS, ...REDACTED_KEYS.map((key) => `*.${key}`)];

export function createLogger(
	options: { level?: string; pretty?: boolean } = {},
	destination?: DestinationStream
): Logger {
	return pino(
		{
			level: options.level ?? 'info',
			redact: { paths, censor: '[redacted]' },
			serializers: { err: pino.stdSerializers.errWithCause },
			timestamp: pino.stdTimeFunctions.isoTime,
			formatters: options.pretty ? undefined : { level: (label) => ({ level: label }) },
			transport: options.pretty
				? {
						target: 'pino-pretty',
						options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' }
					}
				: undefined
		},
		destination
	);
}

const holder = globalThis as unknown as { __planLogger?: Logger };

export const logger: Logger = (holder.__planLogger ??= createLogger({
	level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
	pretty: process.env.NODE_ENV === 'development'
}));
