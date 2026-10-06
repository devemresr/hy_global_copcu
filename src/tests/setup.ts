import { vi } from 'vitest';

// The logger reads import.meta.env through a cast Vitest doesn't populate, so
// it falls back to debug level - swap in a silent one for every test file.
vi.mock('../app/util/logger', async () => {
	const { default: pino } = await import('pino');
	return { default: pino({ level: 'silent' }) };
});
