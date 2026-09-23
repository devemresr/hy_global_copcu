import { useMemo } from 'react';
import type { ExcelRow } from '../types';
import type { ItemDto } from './api/endpoints/useItems';
import {
	columnDefsBySheet,
	FIELD_NAMES,
} from '../constants/columnDefinitons.constant';
import { buildInventoryRecords } from '../helpers/inventoryPageHelpers/buildInventoryRecords.helper';

// Falls back to the bundled static dataset when no API-backed items are provided (the public page).
export function useInventoryRows(
	bellekTipiIncluded: boolean,
	items: ItemDto[] | undefined,
) {
	const rows = useMemo(() => {
		const records = items ?? buildInventoryRecords();
		if (bellekTipiIncluded) return records as ExcelRow[];
		return records.map(({ bellekTipi, ...rest }) => rest) as ExcelRow[];
	}, [items, bellekTipiIncluded]);

	const colDef = useMemo(
		() =>
			columnDefsBySheet.filter(
				(colDef) =>
					!(!bellekTipiIncluded && colDef?.field === FIELD_NAMES.BellekTipi),
			),
		[bellekTipiIncluded],
	);

	return { rows, colDef };
}
