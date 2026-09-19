import type { ExcelRow } from '../../types';
import { formatMemorySize, parseMemorySize } from './memorySize.helper';

/**
 * Keeps only rows with a parseable Depoloma (storage) size of at least 8GB,
 * and rewrites Depoloma to its normalized display form (e.g. "256 Gb"). Rows
 * whose Depoloma doesn't parse at all are dropped.
 */
export function normalizeAndFilterRows(
	rows: ExcelRow[] | Array<Record<string, unknown>>,
): ExcelRow[] {
	return rows
		.map((row) => {
			const gb = parseMemorySize(row?.Depoloma as string);
			return { ...row, __gb: gb }; // temp field to filter on
		})
		.filter((row) => row.__gb !== null && (row?.__gb as number) >= 8)
		.map(({ __gb, ...row }) => ({
			...row,
			Depoloma: formatMemorySize(__gb as number),
		}));
}
