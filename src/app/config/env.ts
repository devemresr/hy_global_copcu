import { cleanEnv, str, url } from 'envalid';

// import.meta.env instead of process.env - envalid works against either,
// since you pass the source object in explicitly.
const env = cleanEnv(import.meta.env, {
	VITE_ENV: str({
		choices: ['development', 'production', 'test'],
		default: 'development',
	}),
	VITE_LOG_LEVEL: str({ default: 'info' }),
	VITE_GATEWAY_URL: url({ default: 'http://localhost:3001' }),
	// Umami is optional - UmamiAnalytics only runs in production and no-ops
	// when either is unset.
	VITE_UMAMI_SCRIPT_URL: str({ default: '' }),
	VITE_UMAMI_WEBSITE_ID: str({ default: '' }),
});

export default env;
