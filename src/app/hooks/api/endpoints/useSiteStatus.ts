/**
 * Polls GET /site/status - the global data version plus maintenance state.
 *
 * Design choices:
 * - Plain fetch instead of apiFetch: apiFetch always sends Content-Type and
 *   Authorization, which turn every poll into a CORS preflight + request.
 *   A bare GET is a "simple" request, so it's one round trip.
 * - The browser's HTTP cache does the ETag work: the server answers
 *   `Cache-Control: no-cache` + `ETag`, so the browser revalidates with
 *   If-None-Match on its own, gets an empty 304 when nothing changed, and
 *   hands this code the cached body as a normal 200.
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import env from '../../../config/env';
import { apiFetch } from '../core/api-client';
import type { ApiError } from '../core/api-client';
import { SITE_ROUTES } from '../../../constants/routes.constant';

export const SITE_STATUS_POLL_MS = 30_000;
export const SITE_STATUS_QUERY_KEY = ['siteStatus'] as const;

// Shared by every observer of a query; discarded when the query is collected.
// Query's own failure count resets at the start of each polling request.
const consecutiveFailures = new WeakMap<object, number>();

// `enabled` arms a setting; it's only in effect inside [from, until).
// ISO timestamps, null meaning "from now" / "until turned off".
export type ScheduleDto = {
	enabled: boolean;
	from: string | null;
	until: string | null;
};

export type MaintenanceDto = ScheduleDto & {
	message: string | null;
};

export type NoticeType = 'info' | 'warning';

export type NoticeDto = ScheduleDto & {
	message: string | null;
	type: NoticeType;
	// Empty means every public page.
	pages: string[];
	dismissible: boolean;
};

export type SiteStatus = {
	version: number;
	maintenance: MaintenanceDto;
	notice: NoticeDto;
};

export type SchedulePhase = 'off' | 'scheduled' | 'active' | 'ended';

export function getSchedulePhase(
	schedule: ScheduleDto | undefined,
	now = Date.now(),
): SchedulePhase {
	if (!schedule?.enabled) return 'off';
	if (schedule.from && new Date(schedule.from).getTime() > now) return 'scheduled';
	if (schedule.until && new Date(schedule.until).getTime() <= now) return 'ended';
	return 'active';
}

export function isScheduleActive(
	schedule: ScheduleDto | undefined,
	now = Date.now(),
): boolean {
	return getSchedulePhase(schedule, now) === 'active';
}

/**
 * Current time that re-renders the caller when the next from/until boundary
 * passes, so a schedule flips on time instead of on the next poll.
 */
export function useScheduleClock(...schedules: (ScheduleDto | undefined)[]): number {
	const [now, setNow] = useState(() => Date.now());
	const nextBoundary = schedules
		.flatMap((s) => (s?.enabled ? [s.from, s.until] : []))
		.map((bound) => (bound ? new Date(bound).getTime() : NaN))
		.filter((time) => time > now)
		.sort((a, b) => a - b)[0];

	useEffect(() => {
		if (nextBoundary === undefined) return;
		// setTimeout overflows past ~24.8 days; re-check daily until then.
		const delay = Math.min(nextBoundary - Date.now() + 250, 86_400_000);
		const timer = setTimeout(() => setNow(Date.now()), Math.max(delay, 0));
		return () => clearTimeout(timer);
	}, [nextBoundary, now]);

	return now;
}

async function fetchSiteStatus(signal: AbortSignal): Promise<SiteStatus> {
	const response = await fetch(`${env.VITE_GATEWAY_URL}${SITE_ROUTES.STATUS}`, { signal });
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	return response.json();
}

export function useSiteStatus() {
	const queryClient = useQueryClient();
	return useQuery<SiteStatus>({
		queryKey: SITE_STATUS_QUERY_KEY,
		queryFn: async ({ signal }) => {
			const query = queryClient.getQueryCache().find({ queryKey: SITE_STATUS_QUERY_KEY, exact: true })!;
			try {
				const status = await fetchSiteStatus(signal);
				consecutiveFailures.delete(query);
				return status;
			} catch (cause) {
				if (!signal.aborted) consecutiveFailures.set(query, (consecutiveFailures.get(query) ?? 0) + 1);
				throw cause;
			}
		},
		retry: false,
		// refetchOnMount alone does not cover failed queries without data:
		// Query treats those as initial loads unless retryOnMount is disabled.
		retryOnMount: false,
		refetchInterval: (query) => {
			const failures = consecutiveFailures.get(query) ?? 0;
			return SITE_STATUS_POLL_MS * 2 ** Math.min(Math.max(failures - 1, 0), 2);
		},
		refetchIntervalInBackground: false,
		// Mounting inventory after a failed status check must not restart it.
		refetchOnMount: (query) => query.state.status !== 'error',
		refetchOnWindowFocus: (query) => query.state.status !== 'error',
		// Overrides main.tsx's 1 min default so a refocused tab checks at once.
		staleTime: 0,
	});
}

export type UpdateMaintenanceInput = {
	enabled: boolean;
	message: string | null;
	from: string | null;
	until: string | null;
};

export type UpdateNoticeInput = UpdateMaintenanceInput & {
	type: NoticeType;
	pages: string[];
	dismissible: boolean;
};

export function useUpdateMaintenance() {
	const queryClient = useQueryClient();
	return useMutation<
		{ version: number; maintenance: MaintenanceDto },
		ApiError,
		UpdateMaintenanceInput
	>({
		mutationFn: (body) =>
			apiFetch(SITE_ROUTES.MAINTENANCE, { method: 'PUT', body }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: SITE_STATUS_QUERY_KEY }),
	});
}

export function useUpdateNotice() {
	const queryClient = useQueryClient();
	return useMutation<
		{ version: number; notice: NoticeDto },
		ApiError,
		UpdateNoticeInput
	>({
		mutationFn: (body) => apiFetch(SITE_ROUTES.NOTICE, { method: 'PUT', body }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: SITE_STATUS_QUERY_KEY }),
	});
}
