import { keepPreviousData } from '@tanstack/react-query';
import useApiQuery from '../core/useApiQuery';
import { LOG_EVENT_ROUTES } from '../../../constants/routes.constant';

export type LogEventFieldChange = {
	field: string;
	previousValue: string | number | boolean | null;
	newValue: string | number | boolean | null;
};

export type LogEntityType =
	| 'bayi'
	| 'finance_entry'
	| 'finance_category'
	| 'investor'
	| 'item'
	| 'item_rule'
	| 'site_maintenance'
	| 'site_notice'
	| 'site_promotion'
	| 'stock_restock'
	| 'stock_price'
	| 'stock_purchase';

// Items and site settings write to the same log_events collection server
// side (see the server's LogEvent model), so field names here aren't limited
// to inventory fields - a site-settings entry carries "enabled"/"until" and
// so on.
export type LogEventDto = {
	_id: string;
	adminUsername: string;
	action: string;
	entityType: LogEntityType;
	// Null for site settings.
	entityId: string | null;
	entityKey: string;
	bayis?: {
		bayiId?: string | null;
		bayiName: string;
		currentBayiName?: string | null;
	}[];
	bayiId?: string | null;
	bayiName?: string | null;
	currentBayiName?: string | null;
	investorId?: string | null;
	investorName?: string | null;
	currentInvestorName?: string | null;
	fields: LogEventFieldChange[];
	createdAt: string;
	// Shared by every row a single bulk edit touched (see the server's
	// bulkUpdateItems/LogEvent model), null for anything else.
	batchId: string | null;
	// Global data version the change was written at; null for entries from
	// before versioning.
	version: number | null;
};

type LogEventsResponse = {
	events: LogEventDto[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

// An empty `types` means every entity type.
export function useGetLogEvents(
	page: number,
	pageSize: number,
	types: LogEntityType[] = [],
	model = '',
	caseSensitive = false,
	party: { bayiId?: string; investorId?: string } = {},
) {
	const typesParam = [...types].sort().join(',');
	return useApiQuery<LogEventsResponse>({
		url: LOG_EVENT_ROUTES.LIST,
		queryKey: [
			'logEvents',
			page,
			pageSize,
			typesParam,
			model,
			caseSensitive,
			party,
		],
		params: {
			page,
			pageSize,
			...party,
			...(typesParam && { types: typesParam }),
			...(model && { model, caseSensitive }),
		},
		// Keeps the current page's rows on screen while the next page loads,
		// instead of the list flashing empty/loading on every page change.
		queryOptions: { placeholderData: keepPreviousData },
	});
}
