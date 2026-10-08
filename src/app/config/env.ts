import { cleanEnv, makeValidator, str, url } from 'envalid';

// URL segment the staff pages (login/admin) live under, so they aren't at a
// guessable /admin. Not a secret - it ships in the JS bundle - it only keeps
// path scanners off the login form; auth is still what protects the API.
const pathSegment = makeValidator((value) => {
	if (!/^[A-Za-z0-9_-]{16,}$/.test(value)) {
		throw new Error('must be one path segment of 16+ [A-Za-z0-9_-] chars');
	}
	return value;
});

// import.meta.env instead of process.env - envalid works against either,
// since you pass the source object in explicitly.
const env = cleanEnv(import.meta.env, {
	VITE_ENV: str({
		choices: ['development', 'production', 'test'],
		default: 'development',
	}),
	VITE_LOG_LEVEL: str({ default: 'info' }),
	VITE_GATEWAY_URL: url({ default: 'http://localhost:3001' }),
	VITE_STAFF_PATH_PREFIX: pathSegment(),
	// Umami is optional - UmamiAnalytics only runs in production and no-ops
	// unless the script URL is http(s) and the website ID is a UUID.
	VITE_UMAMI_SCRIPT_URL: str({ default: '' }),
	VITE_UMAMI_WEBSITE_ID: str({ default: '' }),
});

export default env;
