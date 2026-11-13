import { reportFilterParams } from '../../../helpers/numericFilters.helper';
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../core/api-client';
import { PURCHASE_ROUTES } from '../../../constants/routes.constant';
import type {
	PurchaseQuantityUnit,
	PurchaseUnitTotals,
} from '../../../constants/purchaseProducts.constant';
import { toast } from 'sonner';
import type {
	CreatePurchaseInput,
	PurchaseFilters,
	PurchaseLine,
} from '../../../schemas/purchase.schema';
export type {
	PurchaseFilters,
	PurchaseLine,
} from '../../../schemas/purchase.schema';

export type SavedPurchaseLine = PurchaseLine & {
	requiresMemorySize?: boolean;
	unitPrice: number;
	total: number;
	originalUnitPrice?: number | null;
	priceAdjustment?: number | null;
};
export type PurchasePriceAdjustment = {
	orderId: string;
	orderName: string;
	createdAt: string;
	type: PurchaseLine['type'];
	memoryGb?: number | null;
	quantityUnit?: PurchaseQuantityUnit;
	requiresMemorySize?: boolean;
	quantity: number;
	originalUnitPrice: number;
	unitPrice: number;
	priceAdjustment: number;
	totalAdjustment: number;
};
export type Purchase = {
	unitTotals?: PurchaseUnitTotals;
	bayiId?: string;
	bayiName?: string;
	currentBayiName?: string | null;
	bayiPhone?: string;
	_id: string;
	name: string;
	createdAt: string;
	total: number;
	quantity: number;
	lines: SavedPurchaseLine[];
};
export type PurchasesResponse = {
	bayiFilterName?: string | null;
	timeline?: Pick<
		Purchase,
		'_id' | 'name' | 'createdAt' | 'total' | 'quantity' | 'unitTotals'
	>[];
	orders: Purchase[];
	summary: {
		count: number;
		total: number;
		quantity: number;
		unitTotals?: PurchaseUnitTotals;
	};
	daily: { _id: string; count: number; total: number }[];
	page: number;
	totalPages: number;
	byType: {
		_id: PurchaseLine['type'];
		total: number;
		quantity: number;
		unitTotals?: PurchaseUnitTotals;
	}[];
	byMemory: { _id: number; total: number; quantity: number }[];
	byTypeAndMemory?: {
		type: PurchaseLine['type'];
		memoryGb?: number | null;
		quantityUnit?: PurchaseQuantityUnit;
		requiresMemorySize?: boolean;
		quantity: number;
		total: number;
	}[];
	adjustments?: PurchasePriceAdjustment[];
	missingListPrices?: {
		orderId: string;
		orderName: string;
		createdAt: string;
		type: PurchaseLine['type'];
		memoryGb?: number | null;
		quantityUnit?: PurchaseQuantityUnit;
		requiresMemorySize?: boolean;
		quantity: number;
		unitPrice: number;
		total: number;
	}[];
};
export type PurchasePricing = {
	prices: Record<string, Record<string, number>>;
	unitPrices?: Record<
		string,
		Record<string, Partial<Record<'piece' | 'kg' | 'g', number>>>
	>;
	quantityUnits?: Record<string, Record<string, ('piece' | 'kg' | 'g')[]>>;
	productTypes?: Record<
		PurchaseLine['type'],
		{ label: string; requiresMemorySize: boolean }
	>;
	memorySizes?: number[];
};
export function usePurchasePricing() {
	return useQuery<PurchasePricing, ApiError>({
		queryKey: ['purchasePricing'],
		queryFn: () => apiFetch(PURCHASE_ROUTES.PRICING),
		retry: false,
	});
}
export function usePurchases(
	filters: PurchaseFilters,
	page: number,
	pageSize: number,
	enabled: boolean,
	excludeIds: string[] = [],
) {
	return useQuery<PurchasesResponse, ApiError>({
		queryKey: ['orders', filters, page, pageSize, excludeIds],
		queryFn: () =>
			excludeIds.length
				? apiFetch(PURCHASE_ROUTES.REPORT, {
						method: 'POST',
						body: {
							...filters,
							page,
							pageSize,
							excludeIds: excludeIds.join(','),
						},
					})
				: apiFetch(PURCHASE_ROUTES.LIST, {
						params: { ...reportFilterParams(filters), page, pageSize },
					}),
		placeholderData: keepPreviousData,
		enabled,
		retry: false,
	});
}
export function useCreatePurchase() {
	const client = useQueryClient();
	return useMutation<
		{ order: Purchase; warnings?: { message: string }[] },
		ApiError,
		CreatePurchaseInput
	>({
		mutationFn: (body) =>
			apiFetch(PURCHASE_ROUTES.CREATE, { method: 'POST', body }),
		onSuccess: ({ warnings }) => {
			for (const warning of warnings ?? [])
				toast.warning('Zarar riski · Alış fiyatı yüksek', {
					description: warning.message,
					duration: 10000,
				});
			return Promise.all([
				client.invalidateQueries({ queryKey: ['orders'] }),
				client.invalidateQueries({ queryKey: ['stock'] }),
				client.invalidateQueries({ queryKey: ['finance'] }),
				client.invalidateQueries({ queryKey: ['logEvents'] }),
			]);
		},
	});
}
