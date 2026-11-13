import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../core/api-client';
export type Investor = { _id: string; name: string; phone?: string };
export function useInvestors(enabled = true) {
	return useQuery<{ investors: Investor[] }, ApiError>({
		queryKey: ['finance', 'investors'],
		enabled,
		queryFn: () => apiFetch('/finance/investors'),
		retry: false,
	});
}
