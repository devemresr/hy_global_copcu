import { AUTH_ROUTES } from '../../../constants/routes.constant';
import env from '../../../config/env';
import logger from '../../../util/logger';

const log = logger.child({ method: 'tokenManager' });

// Two refresh paths share this module:
// - Proactive: a timer refreshes shortly before the access token expires.
//   It's started by setAccessToken (login/refresh responses) and, on a page
//   load that already has a saved token, by the block at the bottom.
// - Reactive: apiFetch calls refreshAccessToken when a request gets a 401,
//   then retries that request once.
// refreshAccessToken uses plain fetch, not apiFetch or the query/mutation
// hooks: it's called from apiFetch itself and from a timer, and it needs to tell a server rejection apart from a
// network failure (RefreshRejectedError).

const ACCESS_TOKEN_KEY = 'accessToken';

const REFRESH_TIMING = {
	// Refresh this long before the access token actually expires.
	bufferMs: 60_000,
	// Floor on the proactive delay, so a token shorter-lived than bufferMs
	// can't make each successful refresh reschedule itself at 0ms forever.
	minDelayMs: 5_000,
	// Proactive retry backoff after a network failure: base * 2^attempt, capped.
	retryBaseMs: 1_000,
	maxRetryDelayMs: 30_000,
} as const;

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let inFlightRefresh: Promise<string> | null = null;

// The server rejected the refresh (refresh cookie invalid/expired) - as
// opposed to a network failure, where retrying can still help.
export class RefreshRejectedError extends Error {}

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

// Retries with exponential backoff on network failure, until a retry would
// land after the token's expiry - past that, apiFetch's 401 handling takes over.
const scheduleRefreshAttempt = (
	delay: number,
	expiryMs: number,
	attempt: number,
) => {
	refreshTimer = setTimeout(() => {
		log.debug({ attempt }, 'proactive refresh firing');
		refreshAccessToken().catch((error) => {
			if (error instanceof RefreshRejectedError) {
				log.debug('proactive refresh rejected, not retrying');
				return;
			}

			const retryDelay = Math.min(
				REFRESH_TIMING.retryBaseMs * 2 ** attempt,
				REFRESH_TIMING.maxRetryDelayMs,
			);
			if (Date.now() + retryDelay >= expiryMs) {
				log.debug(
					'proactive refresh failed, next retry would land after expiry - giving up',
				);
				return;
			}
			log.debug(
				{
					retryDelayMs: retryDelay,
					nextAttempt: attempt + 1,
				},
				'proactive refresh failed, retrying',
			);
			scheduleRefreshAttempt(retryDelay, expiryMs, attempt + 1);
		});
	}, delay);
};

const scheduleProactiveRefresh = (token: string) => {
	clearScheduledRefresh();

	const expiryMs = decodeExpiryMs(token);
	if (!expiryMs) {
		log.debug('token has no readable exp, no proactive refresh');
		return;
	}

	const idealDelay = expiryMs - Date.now() - REFRESH_TIMING.bufferMs;
	const delay = Math.max(idealDelay, REFRESH_TIMING.minDelayMs);
	log.debug(
		{
			delayMs: delay,
			expiresAt: new Date(expiryMs).toISOString(),
		},
		'proactive refresh scheduled',
	);
	scheduleRefreshAttempt(delay, expiryMs, 0);
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

/**
 * POSTs the refresh endpoint; the refresh cookie is only sent here because
 * it's scoped to the /auth/refresh path. Concurrent callers share one
 * in-flight request.
 */
export const refreshAccessToken = (): Promise<string> => {
	if (inFlightRefresh) {
		log.debug('refresh already in flight, joining it');
		return inFlightRefresh;
	}

	const url = `${env.VITE_GATEWAY_URL}${AUTH_ROUTES.REFRESH}`;
	log.debug('refresh request sent');

	inFlightRefresh = fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'include',
		body: JSON.stringify({}),
	})
		.then(async (response) => {
			if (!response.ok) {
				log.debug(
					{ status: response.status },
					'refresh rejected, clearing token',
				);
				clearAccessToken();
				throw new RefreshRejectedError('Failed to refresh access token');
			}
			const body = await response.json();
			log.debug('refresh succeeded');
			setAccessToken(body.accessToken);
			return body.accessToken as string;
		})
		.catch((error) => {
			if (!(error instanceof RefreshRejectedError)) {
				log.debug({ err: error }, 'refresh network failure');
			}
			throw error;
		})
		.finally(() => {
			inFlightRefresh = null;
		});

	return inFlightRefresh;
};

// The proactive timer is normally started by setAccessToken, which only runs
// when a login or refresh response arrives. A page reload or opening a URL
// directly skips both, so the saved token would have no timer - this runs
// once when the module first loads and starts it for that saved token.
if (typeof window !== 'undefined') {
	const existingToken = getAccessToken();
	if (existingToken) {
		log.debug('saved token found on page load');
		scheduleProactiveRefresh(existingToken);
	}
}
