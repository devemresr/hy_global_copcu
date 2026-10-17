import { useMemo } from 'react';
import type { ExcelRow, InventoryItemRecord } from '../types';
import {
	columnDefsBySheet,
	FIELD_NAMES,
} from '../constants/columnDefinitons.constant';

export function useInventoryRows(
	bellekTipiIncluded: boolean,
	items: InventoryItemRecord[],
) {
	const rows = useMemo(() => {
		if (bellekTipiIncluded) return items as ExcelRow[];
		return items.map(({ bellekTipi, ...rest }) => rest) as ExcelRow[];
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
