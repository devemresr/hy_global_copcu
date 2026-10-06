import {
	getAccessToken,
	setAccessToken,
	refreshAccessToken,
	RefreshRejectedError,
} from './tokenManager';
import env from '../../../config/env';
import logger from '../../../util/logger';
import { AUTH_ROUTES } from '../../../constants/routes.constant';

export type ApiClientConfig = {
	// Runs when the server rejects a refresh, i.e. the session is gone.
	onSessionExpired?: () => void;
};

let clientConfig: ApiClientConfig = {};

/** Registers app-specific behaviour once at startup (see main.tsx). */
export function configureApiClient(config: ApiClientConfig) {
	clientConfig = { ...clientConfig, ...config };
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ApiError = {
	message: string;
	status: number;
	statusText: string;
};

type ApiFetchOptions = {
	method?: HttpMethod;
	body?: unknown;
	params?: Record<string, unknown>;
	serverUrl?: string;
};

/**
 * Shared API fetch logic used by both query and mutation hooks.
 *
 * `_isRetry` is internal - set when this call is the retry after a 401
 * triggered a refresh, so we never attempt a second refresh for the same
 * request.
 */
export async function apiFetch<TData>(
	url: string,
	options: ApiFetchOptions = {},
	_isRetry = false,
): Promise<TData> {
	const accessToken = getAccessToken();

	// Build query string from params
	let queryString = '';
	if (options.params) {
		queryString =
			'?' +
			new URLSearchParams(
				Object.entries(options.params).reduce(
					(acc, [k, v]) => {
						acc[k] = String(v);
						return acc;
					},
					{} as Record<string, string>,
				),
			).toString();
	}
	const serverUrl = options.serverUrl ?? env.VITE_GATEWAY_URL;

	if (!serverUrl) {
		throw new Error('serverUrl is not defined');
	}

	const init: RequestInit = {
		method: options.method ?? 'GET',
		headers: {
			...(accessToken && { Authorization: `Bearer ${accessToken}` }),
			'Content-Type': 'application/json',
		},
		credentials: 'include',
	};
	if (options.body !== undefined) {
		init.body = JSON.stringify(options.body);
	}

	const response = await fetch(`${serverUrl}${url}${queryString}`, init);

	if (!response.ok) {
		// A 401 from login means wrong credentials, not an expired session.
		if (response.status === 401 && !_isRetry && url !== AUTH_ROUTES.LOGIN) {
			logger.debug({ url }, '[apiFetch] 401, refreshing and retrying once');
			try {
				await refreshAccessToken();
				return apiFetch<TData>(url, options, true);
			} catch (error) {
				// A network failure doesn't mean the session is gone - only a
				// server rejection ends it. Either way the original 401 surfaces.
				if (error instanceof RefreshRejectedError) {
					clientConfig.onSessionExpired?.();
				}
			}
		}

		const body = await response.json().catch(() => null);
		const error: ApiError = {
			message:
				body?.error ||
				body?.message ||
				`HTTP error! status: ${response.status}`,
			status: response.status,
			statusText: response.statusText,
		};
		throw error;
	}

	// Handle empty responses (like 204 No Content)
	const contentType = response.headers.get('content-type');
	if (!contentType || !contentType.includes('application/json')) {
		return {} as TData;
	}

	const body = await response.json();

	// A response carrying a new access token (e.g. login) - persist it, which
	// also (re)starts the proactive refresh timer.
	if (body.accessToken) {
		setAccessToken(body.accessToken);
	}

	return {
		status: response.status,
		statusText: response.statusText,
		...body,
	} as TData;
}
