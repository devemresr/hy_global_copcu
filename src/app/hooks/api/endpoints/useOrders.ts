import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../core/api-client';
import { ORDER_ROUTES } from '../../../constants/routes.constant';
import type {
	OrderQuantityUnit,
	OrderUnitTotals,
} from '../../../constants/orderProducts.constant';
import { toast } from 'sonner';
import type {
	CreateOrderInput,
	OrderFilters,
	OrderLine,
} from '../../../schemas/order.schema';
export type { OrderFilters, OrderLine } from '../../../schemas/order.schema';

export type SavedOrderLine = OrderLine & {
	requiresMemorySize?: boolean;
	unitPrice: number;
	total: number;
	originalUnitPrice?: number | null;
	priceAdjustment?: number | null;
};
export type OrderPriceAdjustment = {
	orderId: string;
	orderName: string;
	createdAt: string;
	type: OrderLine['type'];
	memoryGb?: number | null;
	quantityUnit?: OrderQuantityUnit;
	requiresMemorySize?: boolean;
	quantity: number;
	originalUnitPrice: number;
	unitPrice: number;
	priceAdjustment: number;
	totalAdjustment: number;
};
export type Order = {
	unitTotals?: OrderUnitTotals;
	bayiId?: string;
	bayiPhone?: string;
	_id: string;
	name: string;
	createdAt: string;
	total: number;
	quantity: number;
	lines: SavedOrderLine[];
};
export type OrdersResponse = {
	timeline?: Pick<
		Order,
		'_id' | 'name' | 'createdAt' | 'total' | 'quantity' | 'unitTotals'
	>[];
	orders: Order[];
	summary: {
		count: number;
		total: number;
		quantity: number;
		unitTotals?: OrderUnitTotals;
	};
	daily: { _id: string; count: number; total: number }[];
	page: number;
	totalPages: number;
	byType: {
		_id: OrderLine['type'];
		total: number;
		quantity: number;
		unitTotals?: OrderUnitTotals;
	}[];
	byMemory: { _id: number; total: number; quantity: number }[];
	byTypeAndMemory?: {
		type: OrderLine['type'];
		memoryGb?: number | null;
		quantityUnit?: OrderQuantityUnit;
		requiresMemorySize?: boolean;
		quantity: number;
		total: number;
	}[];
	adjustments?: OrderPriceAdjustment[];
	missingListPrices?: {
		orderId: string;
		orderName: string;
		createdAt: string;
		type: OrderLine['type'];
		memoryGb?: number | null;
		quantityUnit?: OrderQuantityUnit;
		requiresMemorySize?: boolean;
		quantity: number;
		unitPrice: number;
		total: number;
	}[];
};
export function useOrderPricing() {
	return useQuery<
		{
			prices: Record<string, Record<string, number>>;
			productTypes?: Record<
				OrderLine['type'],
				{ label: string; requiresMemorySize: boolean }
			>;
			memorySizes?: number[];
		},
		ApiError
	>({
		queryKey: ['orderPricing'],
		queryFn: () => apiFetch(ORDER_ROUTES.PRICING),
		retry: false,
	});
}
export function useOrders(
	filters: OrderFilters,
	page: number,
	pageSize: number,
	enabled: boolean,
	excludeIds: string[] = [],
) {
	return useQuery<OrdersResponse, ApiError>({
		queryKey: ['orders', filters, page, pageSize, excludeIds],
		queryFn: () =>
			excludeIds.length
				? apiFetch(ORDER_ROUTES.REPORT, {
						method: 'POST',
						body: {
							...filters,
							page,
							pageSize,
							excludeIds: excludeIds.join(','),
						},
					})
				: apiFetch(ORDER_ROUTES.LIST, {
						params: { ...filters, page, pageSize },
					}),
		placeholderData: keepPreviousData,
		enabled,
		retry: false,
	});
}
export function useCreateOrder() {
	const client = useQueryClient();
	return useMutation<
		{ order: Order; warnings?: { message: string }[] },
		ApiError,
		CreateOrderInput
	>({
		mutationFn: (body) =>
			apiFetch(ORDER_ROUTES.CREATE, { method: 'POST', body }),
		onSuccess: ({ warnings }) => {
			for (const warning of warnings ?? [])
				toast.warning('Zarar riski · Alış fiyatı yüksek', {
					description: warning.message,
					duration: 10000,
				});
			return Promise.all([
				client.invalidateQueries({ queryKey: ['orders'] }),
				client.invalidateQueries({ queryKey: ['stock'] }),
				client.invalidateQueries({ queryKey: ['logEvents'] }),
			]);
		},
	});
}
