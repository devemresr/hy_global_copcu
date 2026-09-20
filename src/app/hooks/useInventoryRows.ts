import { useMemo } from 'react';
import type { ExcelRow } from '../types';
import { inventoryData } from '../assets/inventoryDATA';
import { buildDisplaySafeFinalData } from '../helpers/inventoryPageHelpers/tempDataValidation.debug';
import {
	BELLEK_TIPI_EXCLUDED_VALUES,
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
		// Junk BellekTipi values are dropped here, at the shared row source, so
		// they're gone for every consumer
		const cleanedRows = buildDisplaySafeFinalData(inventoryData, {
			overrides: [{ prefix: 'PA', overrides: { Fiyat: '150 TL' } }],
			filters: [
				{
					field: 'BellekTipi',
					op: 'notIn',
					value: BELLEK_TIPI_EXCLUDED_VALUES,
				},
			],
		}) as ExcelRow[];

		logger.debug({
			cleanedRowsLen: cleanedRows.length,
			cleanedRowsMissingBellekTipi: cleanedRows.filter((i) => i?.BellekTipi)
				.length,
		});

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
