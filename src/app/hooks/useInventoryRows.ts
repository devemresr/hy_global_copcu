import { useMemo } from 'react';
import type { ExcelRow } from '../types';
import { inventoryData } from '../assets/inventoryDATA';
import { buildDisplaySafeFinalData } from '../helpers/inventoryPageHelpers/tempDataValidation.debug';
import {
	columnDefsBySheet,
	FIELD_NAMES,
} from '../constants/columnDefinitons.constant';
import logger from '../util/logger';

/**
 * Rows/columns for the static inventory dataset baked into the bundle
 * (assets/inventoryDATA.ts). No file upload or parsing involved — the data
 * is already loaded at build time; this just applies the BellekTipi
 * display/pricing rules and, when BellekTipi is excluded, drops it from
 * both the rows and the grid's column defs.
 */
export function useInventoryRows(bellekTipiIncluded: boolean) {
	const rows = useMemo(() => {
		const cleanedRows = buildDisplaySafeFinalData(inventoryData, [
			{ prefix: 'PA', overrides: { Fiyat: '150 TL' } },
		]) as ExcelRow[];

		if (bellekTipiIncluded) return cleanedRows;
		return cleanedRows.map(({ ic_type, ...rest }) => rest) as ExcelRow[];
	}, [bellekTipiIncluded]);

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
