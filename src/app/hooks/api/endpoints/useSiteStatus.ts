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

async function fetchSiteStatus(): Promise<SiteStatus> {
	const response = await fetch(`${env.VITE_GATEWAY_URL}${SITE_ROUTES.STATUS}`);
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	return response.json();
}

export function useSiteStatus() {
	return useQuery<SiteStatus>({
		queryKey: SITE_STATUS_QUERY_KEY,
		queryFn: fetchSiteStatus,
		refetchInterval: SITE_STATUS_POLL_MS,
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
