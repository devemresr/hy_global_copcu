import { AUTH_ROUTES } from '../../../constants/routes.constant';
import env from '../../../config/env';

const ACCESS_TOKEN_KEY = 'accessToken';
// Refresh this long before the access token actually expires.
const REFRESH_BUFFER_MS = 60_000;
// Floor on how soon the next proactive refresh can fire. A token whose
// lifetime is shorter than REFRESH_BUFFER_MS (e.g. a short-lived dev/test
// token) would otherwise make scheduleProactiveRefresh compute a delay of 0 -
// and since a *successful* refresh reschedules itself the same way from the
// new token's (equally short) expiry, that's a zero-delay loop hammering
// /auth/refresh forever instead of a one-off catch-up refresh.
const MIN_REFRESH_DELAY_MS = 5_000;
const MAX_PROACTIVE_RETRY_DELAY_MS = 30_000;

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let inFlightRefresh: Promise<string> | null = null;

// Thrown when the server explicitly rejects a refresh (invalid/expired
// refresh cookie), as opposed to a network-level failure.
class RefreshRejectedError extends Error {}

const decodeExpiryMs = (token: string): number | null => {
	try {
		const payload = token.split('.')[1];
		if (!payload) return null;
		const decoded = JSON.parse(atob(payload));
		return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
	} catch {
		return null;
	}
};

const clearScheduledRefresh = () => {
	if (refreshTimer) {
		clearTimeout(refreshTimer);
		refreshTimer = null;
	}
};

// Retries with exponential backoff on failure, up until a retry would land
// after the token's actual expiry - past that, the reactive 401 handling in
// apiFetch takes over.
const scheduleRefreshAttempt = (
	delay: number,
	expiryMs: number,
	attempt: number,
) => {
	refreshTimer = setTimeout(() => {
		refreshAccessToken().catch((error) => {
			// The server explicitly rejected the refresh (refresh cookie
			// invalid/expired) - retrying won't help, so let the reactive
			// 401 handling in apiFetch take it from here.
			if (error instanceof RefreshRejectedError) return;

			const retryDelay = Math.min(
				1000 * 2 ** attempt,
				MAX_PROACTIVE_RETRY_DELAY_MS,
			);
			if (Date.now() + retryDelay >= expiryMs) return;
			scheduleRefreshAttempt(retryDelay, expiryMs, attempt + 1);
		});
	}, delay);
};

const scheduleProactiveRefresh = (token: string) => {
	clearScheduledRefresh();

	const expiryMs = decodeExpiryMs(token);
	if (!expiryMs) return;

	const idealDelay = expiryMs - Date.now() - REFRESH_BUFFER_MS;

	scheduleRefreshAttempt(Math.max(idealDelay, MIN_REFRESH_DELAY_MS), expiryMs, 0);
};

export const getAccessToken = (): string | null => {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setAccessToken = (token: string) => {
	if (typeof window === 'undefined') return;
	localStorage.setItem(ACCESS_TOKEN_KEY, token);
	scheduleProactiveRefresh(token);
};

export const clearAccessToken = () => {
	clearScheduledRefresh();
	if (typeof window === 'undefined') return;
	localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const isRefreshUrl = (url: string) => url === AUTH_ROUTES.REFRESH;

/**
 * Calls the dedicated refresh endpoint directly (not through apiFetch, to
 * avoid recursing back into apiFetch's own 401 handling). The refresh cookie
 * is only sent here because it's scoped to the /auth/refresh path.
 * Concurrent callers share one in-flight request.
 */
export const refreshAccessToken = (): Promise<string> => {
	if (inFlightRefresh) return inFlightRefresh;

	const url = `${env.VITE_GATEWAY_URL}${AUTH_ROUTES.REFRESH}`;

	inFlightRefresh = fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({}),
	})
		.then(async (response) => {
			if (!response.ok) {
				clearAccessToken();
				throw new RefreshRejectedError('Failed to refresh access token');
			}
			const body = await response.json();
			setAccessToken(body.accessToken);
			return body.accessToken as string;
		})
		.finally(() => {
			inFlightRefresh = null;
		});

	return inFlightRefresh;
};

// Pick up a token already persisted from a previous session (e.g. this
// module loading on a page other than the one that bootstraps the session).
if (typeof window !== 'undefined') {
	const existingToken = getAccessToken();
	if (existingToken) scheduleProactiveRefresh(existingToken);
}
