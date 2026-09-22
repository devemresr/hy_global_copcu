import pino, { type Logger, type LoggerOptions } from 'pino';

// import.meta.env only exists under Vite, and its type only exists under a
// tsconfig that includes vite/client - neither holds when this module is
// imported transitively by the DB seed script, which type-checks under
// tsconfig.server.json and runs under plain Node/tsx.
type ViteEnv = { VITE_ENV?: string; VITE_LOG_LEVEL?: string };
const viteEnv = (import.meta as unknown as { env?: ViteEnv }).env;
const env = viteEnv?.VITE_ENV ?? 'development';

const isDev = env === 'development';
const isTest = env === 'test';

function safeStringify(o: unknown): string {
	return JSON.stringify(
		o,
		(_, value) => {
			if (value instanceof Map) {
				return Object.fromEntries(value);
			}
			if (value instanceof Set) {
				return Array.from(value);
			}
			if (value instanceof Error) {
				return { message: value.message, stack: value.stack };
			}
			return value;
		},
		2,
	);
}

const loggerOptions: LoggerOptions = {
	level: viteEnv?.VITE_LOG_LEVEL || (isDev || isTest ? 'debug' : 'info'),

	base: {
		app: 'global-copcu',
		env,
	},

	timestamp: pino.stdTimeFunctions.isoTime,

	formatters: {
		level(label) {
			return {
				level: label.toUpperCase(),
			};
		},
	},

	serializers: {
		// pino's browser build serializer isn't null-safe (unlike the Node one) -
		// react-query result objects always carry an `error` key that's `null`
		// until something actually fails so skip serializing it in that case to avoid a crash.
		err: (err) => (err ? pino.stdSerializers.err(err) : err),
		error: (err) => (err ? pino.stdSerializers.err(err) : err),
	},

	redact: {
		paths: [
			'authorization',
			'token',
			'accessToken',
			'refreshToken',
			'password',
			'headers.authorization',
			'headers.cookie',
			'user.password',
		],
		remove: true,
	},

	browser: {
		asObject: true,
		serialize: true,

		write: {
			fatal(o) {
				console.error('[FATAL]', JSON.stringify(o, null, 2));
			},
			error(o) {
				console.error('[ERROR]', JSON.stringify(o, null, 2));
			},
			warn(o) {
				console.warn('[WARN]', JSON.stringify(o, null, 2));
			},
			info(o) {
				console.info('[INFO]', JSON.stringify(o, null, 2));
			},
			debug(o) {
				console.debug(safeStringify(o));
			},
			trace(o) {
				console.trace('[TRACE]', JSON.stringify(o, null, 2));
			},
		},
	},
};

const logger: Logger = pino(loggerOptions);

export default logger;
