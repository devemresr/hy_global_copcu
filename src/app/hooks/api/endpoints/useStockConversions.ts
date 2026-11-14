import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../core/api-client';
import type { StockLot } from './useStock';

export type ConversionUnit = 'piece' | 'kg' | 'g';
export type StockConversionLineInput = {
	sourceLotId: string;
	fromUnit: ConversionUnit;
	fromQuantity: number;
	toUnit: ConversionUnit;
	toQuantity: number;
};
export type StockConversionInput = {
	requestId: string;
	lines: StockConversionLineInput[];
	note: string;
};
export type StockConversionLine = StockConversionLineInput & {
	orderId: string;
	bayiName: string;
	type: StockLot['type'];
	memoryGb: number | null;
	cost: number;
};
export type StockConversion = {
	_id: string;
	lines: StockConversionLine[];
	createdAt: string;
	adminUsername: string;
	note: string;
};
export type ConversionSource = StockLot & {
	remainingValue: number;
	conversionId?: string;
};
export function useStockConversions(enabled: boolean) {
	return useQuery<
		{ sources: ConversionSource[]; conversions: StockConversion[] },
		ApiError
	>({
		queryKey: ['stockConversions'],
		queryFn: () => apiFetch('/stock/conversions'),
		enabled,
	});
}
export function useConvertStock() {
	const client = useQueryClient();
	return useMutation<unknown, ApiError, StockConversionInput>({
		mutationFn: (body) =>
			apiFetch('/stock/conversions', { method: 'POST', body }),
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ['stock'] }),
				client.invalidateQueries({ queryKey: ['stockConversions'] }),
				client.invalidateQueries({ queryKey: ['logEvents'] }),
			]),
		onError: () => client.invalidateQueries({ queryKey: ['stockConversions'] }),
	});
}
