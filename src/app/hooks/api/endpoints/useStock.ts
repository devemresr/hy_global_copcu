import {
	useMutation,
	useQuery,
	useQueryClient,
	keepPreviousData,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PurchaseInspection } from '../../../helpers/purchaseWarnings.helper';
import { apiFetch, type ApiError } from '../core/api-client';
import { STOCK_ROUTES } from '../../../constants/routes.constant';
import type { OrderFilters } from '../../../schemas/order.schema';
import type { StockSaleInput } from '../../../schemas/stock.schema';
import type { ORDER_PRODUCT_TYPES } from '../../../constants/orderProducts.constant';

export type StockPosition = {
	key: string;
	type: keyof typeof ORDER_PRODUCT_TYPES;
	memoryGb: number | null;
	quantityUnit: 'piece' | 'kg';
	quantity: number;
	averagePurchaseCost: number | null;
	averageSellingPrice: number | null;
	listPurchasePrices: {
		currency: string;
		unitPrice: number | null;
		hasExceptions: boolean;
	}[];
};
export type StockLot = Pick<
	StockPosition,
	'type' | 'memoryGb' | 'quantityUnit' | 'quantity'
> & {
	lotId: string;
	orderId: string;
	bayiId: string;
	bayiName: string;
	remaining: number;
	unitPrice: number;
	total: number;
	createdAt: string;
};
export type StockProfit = {
	type: StockPosition['type'] | null;
	memoryGb: number | null;
	quantityUnit: 'piece' | 'kg';
	quantity: number;
	revenue: number;
	costOfGoods: number;
	averagePurchaseCost: number | null;
	averageSellingPrice: number | null;
	profit: number;
	margin: number | null;
};
export type StockOperationLine = {
	type: StockPosition['type'];
	memoryGb: number | null;
	quantityUnit: 'piece' | 'kg';
	quantity: number;
	revenue: number;
	costOfGoods: number;
};
export type StockOperation = {
	requestId: string;
	mode: 'partial' | 'complete';
	createdAt: string;
	lines: StockOperationLine[];
	totalRevenue: number;
	totalCostOfGoods: number;
};
export type StockFilters = OrderFilters & {
	movementType?: 'all' | 'purchase' | 'restock' | 'complete' | 'partial';
	productType?: StockPosition['type'];
	memoryGb?: number;
};
export type StockMovement = {
	id: string;
	kind: 'purchase' | 'complete' | 'partial';
	createdAt: string;
	bayiName: string | null;
	type: StockPosition['type'];
	memoryGb: number | null;
	quantityUnit: 'piece' | 'kg';
	quantity: number;
	purchaseCost: number;
	revenue: number | null;
	profit: number | null;
	orderId: string | null;
};
export type StockResponse = {
	positions: StockPosition[];
	lots: StockLot[];
	lotCount: number;
	totalPages: number;
	page: number;
	profits: StockProfit[];
	profitsByMemory: StockProfit[];
	operations: StockOperation[];
	movements: StockMovement[];
	movementCount: number;
	movementPages: number;
	reportTotals: { purchaseCost: number; revenue: number; profit: number };
};
export function useStock(filters: StockFilters, page = 1, pageSize = 20) {
	return useQuery<StockResponse, ApiError>({
		queryKey: ['stock', filters, page, pageSize],
		queryFn: () =>
			apiFetch(STOCK_ROUTES.LIST, { params: { ...filters, page, pageSize } }),
		placeholderData: keepPreviousData,
		retry: false,
	});
}
export function useRecordStockSale() {
	const client = useQueryClient();
	return useMutation<unknown, ApiError, StockSaleInput>({
		mutationFn: (body) =>
			apiFetch(STOCK_ROUTES.SALES, { method: 'POST', body }),
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ['stock'] }),
				client.invalidateQueries({ queryKey: ['finance'] }),
				client.invalidateQueries({ queryKey: ['logEvents'] }),
			]),
		onError: () => client.invalidateQueries({ queryKey: ['stock'] }),
	});
}
export type PurchaseWarningInput = {
	bayiId: string;
	lines: {
		type: StockPosition['type'];
		memoryGb: number | null;
		quantityUnit: 'piece' | 'kg' | 'g';
		unitPrice: number;
	}[];
};
export function usePurchaseWarnings(
	onInspection?: (
		result: PurchaseInspection,
		input: PurchaseWarningInput,
	) => void,
) {
	return useMutation<
		{
			warnings: { productKey: string; message: string }[];
			risks?: { productKey: string; message: string; alreadyWarned: boolean }[];
			missingPrices?: string[];
		},
		ApiError,
		PurchaseWarningInput
	>({
		mutationFn: (body) =>
			apiFetch(STOCK_ROUTES.WARNINGS, { method: 'POST', body }),
		retry: false,
		onSuccess: (result, input) => {
			onInspection?.(result, input);
			const { warnings } = result;
			for (const warning of warnings)
				toast.warning('Zarar riski · Alış fiyatı yüksek', {
					description: warning.message,
					duration: 10000,
				});
		},
	});
}
