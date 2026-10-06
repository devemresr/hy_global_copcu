import { vi } from 'vitest';

export const GATEWAY_URL = 'http://api.test';

const base64url = (value: object) => {
	const bytes = new TextEncoder().encode(JSON.stringify(value));
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
};

/**
 * An unsigned JWT-shaped token - the client only ever decodes exp, it never
 * verifies. expiresInMs null leaves exp out entirely.
 */
export const fakeJwt = (expiresInMs: number | null, claims: object = {}) => {
	const payload = {
		userId: 'user-1',
		...claims,
		...(expiresInMs !== null && {
			exp: Math.floor((Date.now() + expiresInMs) / 1000),
		}),
	};
	return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.signature`;
};

export const jsonResponse = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const networkError = () => Promise.reject(new TypeError('Failed to fetch'));

type Handler = (init: RequestInit) => Response | Promise<Response>;

const MAX_CALLS_PER_ROUTE = 50;

/**
 * Stubs global fetch, routing by pathname. A route given an array answers
 * with each entry in turn and repeats the last one.
 */
export function mockFetch(routes: Record<string, Handler | Handler[]>) {
	const counters: Record<string, number> = {};
	const fetchMock = vi.fn(async (input: string, init: RequestInit = {}) => {
		const { pathname } = new URL(input);
		const route = routes[pathname];
		if (!route) throw new Error(`Unexpected fetch to ${pathname}`);

		const callIndex = counters[pathname] ?? 0;
		counters[pathname] = callIndex + 1;
		// Turns a runaway refresh/retry loop into a test failure instead of an OOM crash.
		if (callIndex >= MAX_CALLS_PER_ROUTE) {
			throw new Error(`More than ${MAX_CALLS_PER_ROUTE} fetches to ${pathname} - retry loop?`);
		}

		if (!Array.isArray(route)) return route(init);
		return route[Math.min(callIndex, route.length - 1)]!(init);
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

export const callsTo = (fetchMock: ReturnType<typeof mockFetch>, pathname: string) =>
	fetchMock.mock.calls.filter(([url]) => new URL(url).pathname === pathname);

export const authHeaderOf = (init: RequestInit | undefined) =>
	(init?.headers as Record<string, string> | undefined)?.Authorization;
