/**
 * apiFetch - bearer header, the 401 refresh-then-retry-once flow, and the
 * onSessionExpired hook. A fresh module graph per test, so api-client and
 * tokenManager share state within a test but never across tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_ROUTES, ITEM_ROUTES } from '../app/constants/routes.constant';
import {
	authHeaderOf,
	callsTo,
	fakeJwt,
	jsonResponse,
	mockFetch,
	networkError,
} from './helpers';

const ACCESS_TTL = 15 * 60_000;
const ITEMS = ITEM_ROUTES.LIST;

async function loadClient() {
	vi.resetModules();
	const client = await import('../app/hooks/api/core/api-client');
	const tokens = await import('../app/hooks/api/core/tokenManager');
	return { ...client, ...tokens };
}

beforeEach(() => {
	localStorage.clear();
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('request basics', () => {
	it('sends the stored access token as a Bearer header', async () => {
		const fetchMock = mockFetch({ [ITEMS]: () => jsonResponse(200, { items: [] }) });
		const { apiFetch, setAccessToken } = await loadClient();
		const token = fakeJwt(ACCESS_TTL);
		setAccessToken(token);

		await apiFetch(ITEMS);
		expect(authHeaderOf(fetchMock.mock.calls[0]![1])).toBe(`Bearer ${token}`);
		expect(fetchMock.mock.calls[0]![1]).toMatchObject({ credentials: 'include' });
	});

	it('sends no Authorization header without a token', async () => {
		const fetchMock = mockFetch({ [ITEMS]: () => jsonResponse(200, {}) });
		const { apiFetch } = await loadClient();

		await apiFetch(ITEMS);
		expect(authHeaderOf(fetchMock.mock.calls[0]![1])).toBeUndefined();
	});

	it('appends params as a query string and sends a JSON body', async () => {
		const fetchMock = mockFetch({ [ITEMS]: () => jsonResponse(200, {}) });
		const { apiFetch } = await loadClient();

		await apiFetch(ITEMS, { method: 'POST', params: { page: 2, q: 'a b' }, body: { x: 1 } });
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(new URL(url).searchParams.get('page')).toBe('2');
		expect(new URL(url).searchParams.get('q')).toBe('a b');
		expect(init!.body).toBe(JSON.stringify({ x: 1 }));
	});

	it('stores an accessToken found in a response body (login)', async () => {
		const token = fakeJwt(ACCESS_TTL);
		mockFetch({ [AUTH_ROUTES.LOGIN]: () => jsonResponse(200, { accessToken: token }) });
		const { apiFetch, getAccessToken } = await loadClient();

		await apiFetch(AUTH_ROUTES.LOGIN, { method: 'POST', body: {} });
		expect(getAccessToken()).toBe(token);
	});

	it('returns an empty object for a non-JSON response (204)', async () => {
		mockFetch({ [AUTH_ROUTES.LOGOUT]: () => new Response(null, { status: 204 }) });
		const { apiFetch } = await loadClient();

		await expect(apiFetch(AUTH_ROUTES.LOGOUT, { method: 'POST' })).resolves.toEqual({});
	});

	it('throws an ApiError carrying the server message on a non-401 failure', async () => {
		mockFetch({ [ITEMS]: () => jsonResponse(403, { success: false, message: 'Forbidden' }) });
		const { apiFetch } = await loadClient();

		await expect(apiFetch(ITEMS)).rejects.toMatchObject({ status: 403, message: 'Forbidden' });
	});
});

describe('401 - refresh and retry once', () => {
	it('refreshes, retries with the new token, and returns the retry result', async () => {
		const stale = fakeJwt(ACCESS_TTL);
		const fresh = fakeJwt(ACCESS_TTL, { jti: 'fresh' });
		const fetchMock = mockFetch({
			[ITEMS]: [() => jsonResponse(401, {}), () => jsonResponse(200, { items: [1] })],
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(200, { accessToken: fresh }),
		});
		const { apiFetch, setAccessToken } = await loadClient();
		setAccessToken(stale);

		await expect(apiFetch(ITEMS)).resolves.toMatchObject({ items: [1] });
		const itemCalls = callsTo(fetchMock, ITEMS);
		expect(itemCalls).toHaveLength(2);
		expect(authHeaderOf(itemCalls[1]![1])).toBe(`Bearer ${fresh}`);
	});

	it('works with no token at all (e.g. localStorage cleared, cookie still alive)', async () => {
		const fresh = fakeJwt(ACCESS_TTL);
		mockFetch({
			[ITEMS]: [() => jsonResponse(401, {}), () => jsonResponse(200, { ok: true })],
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(200, { accessToken: fresh }),
		});
		const { apiFetch } = await loadClient();

		await expect(apiFetch(ITEMS)).resolves.toMatchObject({ ok: true });
	});

	it('does not refresh a second time when the retry is also 401', async () => {
		const fetchMock = mockFetch({
			[ITEMS]: () => jsonResponse(401, { message: 'Access token expired' }),
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(200, { accessToken: fakeJwt(ACCESS_TTL) }),
		});
		const { apiFetch } = await loadClient();

		await expect(apiFetch(ITEMS)).rejects.toMatchObject({ status: 401 });
		expect(callsTo(fetchMock, AUTH_ROUTES.REFRESH)).toHaveLength(1);
		expect(callsTo(fetchMock, ITEMS)).toHaveLength(2);
	});

	it('a 401 from login is wrong credentials - no refresh attempted', async () => {
		const fetchMock = mockFetch({
			[AUTH_ROUTES.LOGIN]: () => jsonResponse(401, { message: 'Invalid credentials' }),
		});
		const { apiFetch } = await loadClient();

		await expect(apiFetch(AUTH_ROUTES.LOGIN, { method: 'POST', body: {} })).rejects.toMatchObject({
			status: 401,
			message: 'Invalid credentials',
		});
		expect(callsTo(fetchMock, AUTH_ROUTES.REFRESH)).toHaveLength(0);
	});

	it('parallel 401s share a single refresh and all retry successfully', async () => {
		let itemCalls = 0;
		const fetchMock = mockFetch({
			// First three calls (the originals) 401, the retries succeed.
			[ITEMS]: () => (++itemCalls <= 3 ? jsonResponse(401, {}) : jsonResponse(200, { ok: true })),
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(200, { accessToken: fakeJwt(ACCESS_TTL) }),
		});
		const { apiFetch } = await loadClient();

		const results = await Promise.all([apiFetch(ITEMS), apiFetch(ITEMS), apiFetch(ITEMS)]);
		expect(results).toHaveLength(3);
		expect(callsTo(fetchMock, AUTH_ROUTES.REFRESH)).toHaveLength(1);
	});
});

describe('onSessionExpired', () => {
	it('runs once when the server rejects the refresh, and the original 401 surfaces', async () => {
		mockFetch({
			[ITEMS]: () => jsonResponse(401, { message: 'Access token expired' }),
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(401, { message: 'Session has been revoked' }),
		});
		const { apiFetch, configureApiClient, setAccessToken, getAccessToken } = await loadClient();
		const onSessionExpired = vi.fn();
		configureApiClient({ onSessionExpired });
		setAccessToken(fakeJwt(ACCESS_TTL));

		await expect(apiFetch(ITEMS)).rejects.toMatchObject({ status: 401, message: 'Access token expired' });
		expect(onSessionExpired).toHaveBeenCalledTimes(1);
		expect(getAccessToken()).toBeNull();
	});

	it('does not run when the refresh fails on the network', async () => {
		mockFetch({
			[ITEMS]: () => jsonResponse(401, {}),
			[AUTH_ROUTES.REFRESH]: networkError,
		});
		const { apiFetch, configureApiClient, setAccessToken, getAccessToken } = await loadClient();
		const onSessionExpired = vi.fn();
		configureApiClient({ onSessionExpired });
		const token = fakeJwt(ACCESS_TTL);
		setAccessToken(token);

		await expect(apiFetch(ITEMS)).rejects.toMatchObject({ status: 401 });
		expect(onSessionExpired).not.toHaveBeenCalled();
		expect(getAccessToken()).toBe(token);
	});

	it('a rejected refresh without a configured callback still just throws', async () => {
		mockFetch({
			[ITEMS]: () => jsonResponse(401, {}),
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(401, {}),
		});
		const { apiFetch } = await loadClient();

		await expect(apiFetch(ITEMS)).rejects.toMatchObject({ status: 401 });
	});

	it('a later configureApiClient call replaces the callback', async () => {
		mockFetch({
			[ITEMS]: () => jsonResponse(401, {}),
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(401, {}),
		});
		const { apiFetch, configureApiClient } = await loadClient();
		const first = vi.fn();
		const second = vi.fn();
		configureApiClient({ onSessionExpired: first });
		configureApiClient({ onSessionExpired: second });

		await expect(apiFetch(ITEMS)).rejects.toBeDefined();
		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
	});
});
