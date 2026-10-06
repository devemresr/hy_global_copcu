import { defineConfig } from 'vitest/config';

// Kept apart from vite.config.ts - the auth client tests need none of the
// React/Tailwind/SVG plugins.
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'jsdom',
		setupFiles: ['src/tests/setup.ts'],
		env: {
			VITE_GATEWAY_URL: 'http://api.test',
		},
	},
});
