import { reportFilterParams } from '../../../helpers/numericFilters.helper';
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
import type { PurchaseFilters } from '../../../schemas/purchase.schema';
import type { StockSaleInput } from '../../../schemas/stock.schema';
import type { PURCHASE_PRODUCT_TYPES } from '../../../constants/purchaseProducts.constant';

export type StockPosition = {
	suppliers?: {
		bayiId: string | null;
		bayiName: string;
		currentBayiName?: string | null;
		quantity: number;
	}[];
	key: string;
	type: keyof typeof PURCHASE_PRODUCT_TYPES;
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
	currentBayiName?: string | null;
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
	bayiId?: string | null;
	suppliers?: SupplierSale[];
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
export type StockMovementFilter =
	| 'all-movements'
	| 'purchase-entries'
	| 'all-sales'
	| 'full-stock-sales'
	| 'partial-sales';

export type StockFilters = PurchaseFilters & {
	excludeSaleIds?: string[];
	movementType?: StockMovementFilter;
	productType?: StockPosition['type'];
	memoryGb?: number;
};
export type StockMovement = {
	operationId?: string;
	id: string;
	kind: 'purchase' | 'complete' | 'partial';
	createdAt: string;
	bayiName: string | null;
	suppliers?: SupplierSale[];
	bayiId?: string | null;
	currentBayiName?: string | null;
	type: StockPosition['type'];
	memoryGb: number | null;
	quantityUnit: 'piece' | 'kg';
	quantity: number;
	purchaseCost: number;
	revenue: number | null;
	profit: number | null;
	orderId: string | null;
};
export type SupplierSale = {
	sourcePurchases?: { orderId: string; lotId: string; quantity: number }[];
	bayiId?: string | null;
	bayiName: string;
	currentBayiName?: string | null;
	quantity: number;
	revenue: number;
	costOfGoods: number;
};
export type SupplierProfit = SupplierSale & {
	type: StockPosition['type'];
	memoryGb: number | null;
	quantityUnit: 'piece' | 'kg';
	profit: number;
	margin: number | null;
};
export type StockActivity = {
	id: string;
	kind: StockMovement['kind'];
	createdAt: string;
	date: string;
	lines: StockMovement[];
};
export type BayiStockReport = {
	bayiId: string | null;
	bayiName: string;
	currentBayiName: string | null;
	purchaseCost: number;
	costOfGoods: number;
	revenue: number;
	profit: number;
	products: {
		type: StockPosition['type'];
		memoryGb: number | null;
		quantityUnit: 'piece' | 'kg';
		purchasedQuantity: number;
		soldQuantity: number;
		purchaseCost: number;
		costOfGoods: number;
		revenue: number;
		profit: number;
	}[];
};
export type StockProductSummary = {
	key: string;
	type: StockPosition['type'];
	memoryGb: number | null;
	quantityUnit: 'piece' | 'kg';
	purchaseQuantity: number;
	purchaseTotal: number;
	soldQuantity: number;
	revenue: number;
	costOfGoods: number;
	profit: number;
	currentQuantity: number;
	averagePurchasePrice: number | null;
	averageSellingPrice: number | null;
	margin: number | null;
};
export type StockResponse = {
	matchingSaleIds?: string[];
	reportSales?: {
		requestId: string;
		createdAt: string;
		lines: StockOperationLine[];
	}[];
	selectedSaleCount?: number;
	productSummary?: StockProductSummary[];
	reportGeneratedAt?: string;
	activities?: StockActivity[];
	activityCount?: number;
	activityPages?: number;
	dailyMovementTotals?: {
		date: string;
		count: number;
		purchaseCost: number;
		costOfGoods: number;
		revenue: number;
		profit: number;
	}[];
	bayiReports?: BayiStockReport[];
	profitsByBayi?: SupplierProfit[];
	bayiFilterName?: string | null;
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
	reportTotals: {
		costOfGoods?: number;
		purchaseCost: number;
		revenue: number;
		profit: number;
	};
};
export function useStock(
	filters: StockFilters,
	page = 1,
	pageSize = 20,
	enabled = true,
) {
	return useQuery<StockResponse, ApiError>({
		queryKey: ['stock', filters, page, pageSize],
		enabled,
		queryFn: () =>
			apiFetch(STOCK_ROUTES.LIST, {
				params: {
					...reportFilterParams(filters),
					excludeSaleIds: filters.excludeSaleIds?.length
						? filters.excludeSaleIds.join(',')
						: undefined,
					page,
					pageSize,
				},
			}),
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
	comparisonDays?: number;
	bayiId: string;
	lines: {
		type: StockPosition['type'];
		memoryGb: number | null;
		quantityUnit: 'piece' | 'kg' | 'g';
		unitPrice: number;
		quantity?: number;
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
