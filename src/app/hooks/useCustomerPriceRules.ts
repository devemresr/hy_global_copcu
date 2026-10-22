import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from './api/core/api-client';
import { ITEM_ROUTES } from '../constants/routes.constant';
import type { CustomerPriceRule } from '../helpers/inventoryPageHelpers/customerInventory.helper';

type CustomerPriceRulesResponse = { assignments: CustomerPriceRule[]; revision: number };

export function useCustomerPriceRules(enabled: boolean) {
	return useQuery<CustomerPriceRulesResponse, ApiError>({
		queryKey: ['customerPriceRules'],
		queryFn: () => apiFetch<CustomerPriceRulesResponse>(`${ITEM_ROUTES.LIST}/price-rules`),
		enabled,
		staleTime: 0,
	});
}
