import type { ExcelRow } from '../../types';
import { formatGb, parseSizeGb } from './memorySize.helper';

export const MIN_STORAGE_GB = 8;

/**
 * Keeps only rows with a parseable Depoloma (storage) size of at least
 * MIN_STORAGE_GB, and rewrites Depoloma to its normalized display form (e.g.
 * "256 Gb"). Rows whose Depoloma doesn't parse at all are dropped.
 */
export function normalizeAndFilterRows(
	rows: Array<Record<string, unknown>>,
): ExcelRow[] {
	return rows.flatMap((row) => {
		const gb = parseSizeGb(row?.Depoloma);
		return gb !== null && gb >= MIN_STORAGE_GB
			? [{ ...row, Depoloma: formatGb(gb) } as ExcelRow]
			: [];
	});
}
