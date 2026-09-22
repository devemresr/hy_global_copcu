import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api-client';
import type { ApiError } from './api-client';
import type { QueryKey, UseQueryOptions } from '@tanstack/react-query';

export type RetryConfig = {
	enabled?: boolean;
	maxRetries?: number;
	retryDelay?: number | ((attempt: number) => number);
	retryableStatuses?: number[];
};

type QueryConfig<TData = unknown, TError = ApiError> = {
	queryKey: QueryKey;
	url: string;
	params?: Record<string, unknown>;
	serverUrl?: string;
	retry?: RetryConfig;
	queryOptions?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>;
};

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
	enabled: true,
	maxRetries: 3,
	retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 30000),
	retryableStatuses: [408, 429, 500, 502, 503, 504],
};

export default function useApiQuery<
	// shape of the data returned by the API response
	TData = unknown,
	// shape of the error returned by the API, defaults to ApiError
	TError extends ApiError = ApiError,
>(config: QueryConfig<TData, TError>) {
	const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retry };

	const shouldRetry = (attemptNumber: number, error: TError): boolean => {
		if (!retryConfig.enabled) return false;
		if (attemptNumber >= retryConfig.maxRetries) return false;

		// Retry on network errors (no status)
		if (!error.status) return true;

		return retryConfig.retryableStatuses.includes(error.status);
	};

	const getRetryDelay = (attemptNumber: number): number => {
		if (typeof retryConfig.retryDelay === 'function') {
			return retryConfig.retryDelay(attemptNumber);
		}
		return retryConfig.retryDelay;
	};

	return useQuery<TData, TError>({
		queryKey: config.queryKey,
		queryFn: () =>
			apiFetch<TData>(config.url, {
				method: 'GET',
				params: config.params,
				serverUrl: config.serverUrl,
			}),
		retry: (failureCount, error) => shouldRetry(failureCount, error),
		retryDelay: (attemptIndex) => getRetryDelay(attemptIndex),
		...config.queryOptions,
	});
}

export const createRetryConfig = (
	overrides?: Partial<RetryConfig>,
): RetryConfig => ({
	...DEFAULT_RETRY_CONFIG,
	...overrides,
});
