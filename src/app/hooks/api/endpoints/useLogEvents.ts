import { keepPreviousData } from '@tanstack/react-query';
import useApiQuery from '../core/useApiQuery';
import { LOG_EVENT_ROUTES } from '../../../constants/routes.constant';

export type LogEventFieldChange = {
	field: string;
	previousValue: string | number | null;
	newValue: string | number | null;
};

// Items and pricing rules write to the same log_events collection server
// side (see the server's LogEvent model), so entityType/entityKey/field
// names here aren't limited to inventory fields - a pricing-rule log entry's
// `fields` carries rule fields like "price"/"sizeGb" instead.
export type LogEventDto = {
	_id: string;
	adminUsername: string;
	action: string;
	entityType: 'item' | 'pricing_rule';
	entityId: string;
	entityKey: string;
	fields: LogEventFieldChange[];
	createdAt: string;
};

type LogEventsResponse = {
	events: LogEventDto[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

export function useGetLogEvents(page: number, pageSize: number) {
	return useApiQuery<LogEventsResponse>({
		url: LOG_EVENT_ROUTES.LIST,
		queryKey: ['logEvents', page, pageSize],
		params: { page, pageSize },
		// Keeps the current page's rows on screen while the next page loads,
		// instead of the list flashing empty/loading on every page change.
		queryOptions: { placeholderData: keepPreviousData },
	});
}
