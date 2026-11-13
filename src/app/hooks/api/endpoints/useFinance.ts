import { reportFilterParams } from '../../../helpers/numericFilters.helper';
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../core/api-client';
import type { PurchaseFilters } from '../../../schemas/purchase.schema';

export type FinanceGroup = 'purchase' | 'other' | 'sale' | 'investment';
export type FinanceCategory = {
	_id: string;
	group: FinanceGroup;
	name: string;
};
export type FinanceFilters = PurchaseFilters & {
	group?: FinanceGroup;
	investorId?: string;
	direction?: 'income' | 'expense';
	categoryId?: string;
};
export type FinanceResponse = {
	categories: FinanceCategory[];
	showRunningBalance: boolean;
	daily: {
		date: string;
		income: number;
		expenses: number;
		net: number;
		count: number;
	}[];
	entries: {
		id: string;
		source: 'purchase' | 'sale' | 'manual';
		group: FinanceGroup;
		subtype: string;
		investorId?: string | null;
		investorName?: string | null;
		currentInvestorName?: string | null;
		bayiId?: string | null;
		bayiName?: string | null;
		currentBayiName?: string | null;
		amount: number;
		balanceBefore?: number;
		balanceAfter?: number;
		date: string;
		description: string;
		editable: boolean;
		direction: 'income' | 'expense';
	}[];
	count: number;
	totalPages: number;
	income: number;
	expenses: number;
	net: number;
	openingBalance: number;
	closingBalance: number;
	balance: number;
};
export function useFinance(
	filters: FinanceFilters,
	page: number,
	pageSize: number,
	enabled = true,
) {
	return useQuery<FinanceResponse, ApiError>({
		queryKey: ['finance', filters, page, pageSize],
		enabled,
		queryFn: () =>
			apiFetch('/finance', {
				params: { ...reportFilterParams(filters), page, pageSize },
			}),
		placeholderData: keepPreviousData,
		retry: false,
	});
}
export function useFinanceMutation<T>(
	url: string,
	method: 'POST' | 'PUT' | 'DELETE' = 'POST',
) {
	const client = useQueryClient();
	return useMutation<unknown, ApiError, T>({
		mutationFn: (body) => apiFetch(url, { method, body }),
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ['finance'] }),
				client.invalidateQueries({ queryKey: ['logEvents'] }),
			]),
	});
}
