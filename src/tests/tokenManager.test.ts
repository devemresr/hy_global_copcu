/**
 * tokenManager - storage, proactive refresh timing, network retry backoff and
 * in-flight deduplication. Fake timers drive the clock; each test loads a
 * fresh module, since the module keeps its timer and in-flight request in
 * module state and runs its page-load block on import.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_ROUTES } from '../app/constants/routes.constant';
import {
	GATEWAY_URL,
	callsTo,
	fakeJwt,
	jsonResponse,
	mockFetch,
	networkError,
} from './helpers';

type TokenManager = typeof import('../app/hooks/api/core/tokenManager');

const MINUTE = 60_000;
const ACCESS_TTL = 15 * MINUTE;
const BUFFER = MINUTE; // REFRESH_TIMING.bufferMs

const loadTokenManager = async (): Promise<TokenManager> => {
	vi.resetModules();
	return import('../app/hooks/api/core/tokenManager');
};

beforeEach(() => {
	localStorage.clear();
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('token storage', () => {
	it('setAccessToken stores the token, clearAccessToken removes it', async () => {
		mockFetch({});
		const tm = await loadTokenManager();
		const token = fakeJwt(ACCESS_TTL);

		tm.setAccessToken(token);
		expect(tm.getAccessToken()).toBe(token);

		tm.clearAccessToken();
		expect(tm.getAccessToken()).toBeNull();
	});
});

describe('proactive refresh', () => {
	it('refreshes one buffer before expiry, as a credentialed POST to the refresh route', async () => {
		const fetchMock = mockFetch({
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(200, { accessToken: fakeJwt(ACCESS_TTL) }),
		});
		const tm = await loadTokenManager();
		tm.setAccessToken(fakeJwt(ACCESS_TTL));

		await vi.advanceTimersByTimeAsync(ACCESS_TTL - BUFFER - 1);
		expect(fetchMock).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe(`${GATEWAY_URL}${AUTH_ROUTES.REFRESH}`);
		expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
	});

	it('stores the refreshed token and schedules the next refresh from it', async () => {
		const refreshed = fakeJwt(ACCESS_TTL + ACCESS_TTL - BUFFER); // minted at first refresh time
		const fetchMock = mockFetch({
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(200, { accessToken: refreshed }),
		});
		const tm = await loadTokenManager();
		tm.setAccessToken(fakeJwt(ACCESS_TTL));

		await vi.advanceTimersByTimeAsync(ACCESS_TTL - BUFFER);
		expect(tm.getAccessToken()).toBe(refreshed);

		await vi.advanceTimersByTimeAsync(ACCESS_TTL - BUFFER);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('a token already inside the buffer waits the 5s floor instead of firing at once', async () => {
		const fetchMock = mockFetch({
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(200, { accessToken: fakeJwt(ACCESS_TTL) }),
		});
		const tm = await loadTokenManager();
		tm.setAccessToken(fakeJwt(30_000));

		await vi.advanceTimersByTimeAsync(4_999);
		expect(fetchMock).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it.each([
		['no exp claim', fakeJwt(null)],
		['not a JWT', 'not-a-jwt'],
		['undecodable payload', 'header.%%%.signature'],
	])('schedules nothing for a token with %s', async (_label, token) => {
		const fetchMock = mockFetch({});
		const tm = await loadTokenManager();
		tm.setAccessToken(token);

		await vi.advanceTimersByTimeAsync(60 * MINUTE);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('decodes base64url payloads (- and _ characters)', async () => {
		const token = fakeJwt(ACCESS_TTL, { email: '~~~@test.com' });
		expect(token.split('.')[1]).toMatch(/[-_]/); // precondition: payload uses base64url-only chars

		const fetchMock = mockFetch({
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(200, { accessToken: fakeJwt(ACCESS_TTL) }),
		});
		const tm = await loadTokenManager();
		tm.setAccessToken(token);

		await vi.advanceTimersByTimeAsync(ACCESS_TTL - BUFFER);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('clearAccessToken cancels the scheduled refresh', async () => {
		const fetchMock = mockFetch({});
		const tm = await loadTokenManager();
		tm.setAccessToken(fakeJwt(ACCESS_TTL));
		tm.clearAccessToken();

		await vi.advanceTimersByTimeAsync(ACCESS_TTL);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('setting a new token replaces the previous schedule rather than adding one', async () => {
		const fetchMock = mockFetch({
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(200, { accessToken: fakeJwt(ACCESS_TTL) }),
		});
		const tm = await loadTokenManager();
		tm.setAccessToken(fakeJwt(ACCESS_TTL));
		tm.setAccessToken(fakeJwt(ACCESS_TTL));

		await vi.advanceTimersByTimeAsync(ACCESS_TTL - BUFFER);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('on page load, a token already in localStorage gets a refresh scheduled', async () => {
		localStorage.setItem('accessToken', fakeJwt(ACCESS_TTL));
		const fetchMock = mockFetch({
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(200, { accessToken: fakeJwt(ACCESS_TTL) }),
		});
		await loadTokenManager();

		await vi.advanceTimersByTimeAsync(ACCESS_TTL - BUFFER);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});

describe('refresh failures', () => {
	it('a server rejection clears the token and is not retried', async () => {
		const fetchMock = mockFetch({
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(401, { message: 'Session has been revoked' }),
		});
		const tm = await loadTokenManager();
		tm.setAccessToken(fakeJwt(ACCESS_TTL));

		await vi.advanceTimersByTimeAsync(ACCESS_TTL - BUFFER);
		expect(tm.getAccessToken()).toBeNull();

		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('refreshAccessToken rejects with RefreshRejectedError on a server rejection', async () => {
		mockFetch({ [AUTH_ROUTES.REFRESH]: () => jsonResponse(401, {}) });
		const tm = await loadTokenManager();
		await expect(tm.refreshAccessToken()).rejects.toBeInstanceOf(tm.RefreshRejectedError);
	});

	it('a network failure retries with exponential backoff and gives up before expiry', async () => {
		const fetchMock = mockFetch({ [AUTH_ROUTES.REFRESH]: networkError });
		const tm = await loadTokenManager();
		const token = fakeJwt(ACCESS_TTL);
		tm.setAccessToken(token);

		// First attempt 60s before expiry, then retries 1s, 2s, 4s, 8s, 16s apart.
		// The next (30s, capped) would land after expiry, so it stops at 6 attempts.
		await vi.advanceTimersByTimeAsync(ACCESS_TTL - BUFFER);
		const attemptTimes = [0, 1_000, 3_000, 7_000, 15_000, 31_000];
		for (const [i, t] of attemptTimes.entries()) {
			await vi.advanceTimersByTimeAsync(t - (attemptTimes[i - 1] ?? 0));
			expect(fetchMock).toHaveBeenCalledTimes(i + 1);
		}

		await vi.advanceTimersByTimeAsync(10 * MINUTE);
		expect(fetchMock).toHaveBeenCalledTimes(6);
		// A network failure doesn't mean the session is gone.
		expect(tm.getAccessToken()).toBe(token);
	});

	it('recovers when the network comes back during the backoff', async () => {
		const refreshed = fakeJwt(2 * ACCESS_TTL);
		const fetchMock = mockFetch({
			[AUTH_ROUTES.REFRESH]: [networkError, () => jsonResponse(200, { accessToken: refreshed })],
		});
		const tm = await loadTokenManager();
		tm.setAccessToken(fakeJwt(ACCESS_TTL));

		await vi.advanceTimersByTimeAsync(ACCESS_TTL - BUFFER + 1_000);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(tm.getAccessToken()).toBe(refreshed);
	});
});

describe('in-flight deduplication', () => {
	it('concurrent refreshAccessToken calls share one request', async () => {
		let release!: (response: Response) => void;
		const refreshed = fakeJwt(ACCESS_TTL);
		const fetchMock = mockFetch({
			[AUTH_ROUTES.REFRESH]: () => new Promise<Response>((resolve) => (release = resolve)),
		});
		const tm = await loadTokenManager();

		const calls = [tm.refreshAccessToken(), tm.refreshAccessToken(), tm.refreshAccessToken()];
		await vi.advanceTimersByTimeAsync(0);
		expect(callsTo(fetchMock, AUTH_ROUTES.REFRESH)).toHaveLength(1);

		release(jsonResponse(200, { accessToken: refreshed }));
		await expect(Promise.all(calls)).resolves.toEqual([refreshed, refreshed, refreshed]);
	});

	it('a new refresh after the previous one settled sends a new request', async () => {
		const fetchMock = mockFetch({
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(200, { accessToken: fakeJwt(ACCESS_TTL) }),
		});
		const tm = await loadTokenManager();

		await tm.refreshAccessToken();
		await tm.refreshAccessToken();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
