import { useMemo } from 'react';
import type { ExcelRow } from '../types';
import type { ItemDto } from './api/endpoints/useItems';
import {
	columnDefsBySheet,
	FIELD_NAMES,
} from '../constants/columnDefinitons.constant';

export function useInventoryRows(
	bellekTipiIncluded: boolean,
	items: ItemDto[],
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
