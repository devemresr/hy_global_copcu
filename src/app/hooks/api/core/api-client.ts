import {
	getAccessToken,
	setAccessToken,
	refreshAccessToken,
	isRefreshUrl,
} from './tokenManager';
import env from '../../../config/env';

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
 * `_isRetry` is internal - set when this call is a retry after a proactive
 * refresh, so we never attempt a second refresh for the same request.
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
		if (response.status === 401 && !_isRetry && !isRefreshUrl(url)) {
			try {
				await refreshAccessToken();
				return apiFetch<TData>(url, options, true);
			} catch {
				// Refresh failed - fall through and surface the original 401.
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

	// New access token issued (login/register/refresh/update, or the old
	// inline-refresh path on a protected route) - persist and reschedule.
	if (body.accessToken) {
		setAccessToken(body.accessToken);
	}

	return {
		status: response.status,
		statusText: response.statusText,
		...body,
	} as TData;
}
