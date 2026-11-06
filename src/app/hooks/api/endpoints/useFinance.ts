import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../core/api-client';
import type { OrderFilters } from '../../../schemas/order.schema';

export type FinanceGroup = 'purchase' | 'other' | 'sale' | 'investment';
export type FinanceCategory = {
	_id: string;
	group: FinanceGroup;
	name: string;
};
export type FinanceFilters = OrderFilters & {
	group?: FinanceGroup;
	direction?: 'income' | 'expense';
	categoryId?: string;
};
export type FinanceResponse = {
	categories: FinanceCategory[];
	entries: {
		id: string;
		source: 'purchase' | 'sale' | 'manual';
		group: FinanceGroup;
		subtype: string;
		amount: number;
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
) {
	return useQuery<FinanceResponse, ApiError>({
		queryKey: ['finance', filters, page, pageSize],
		queryFn: () =>
			apiFetch('/finance', { params: { ...filters, page, pageSize } }),
		placeholderData: keepPreviousData,
		retry: false,
	});
}
export function useFinanceMutation<T>(
	url: string,
	method: 'POST' | 'DELETE' = 'POST',
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
