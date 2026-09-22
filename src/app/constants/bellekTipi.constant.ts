// Raw BellekTipi values treated as junk/test data: excluded from the grid
// and the filter dropdown entirely (case-insensitive), regardless of the
// current filter selection. Add more as bad values turn up in the data.
//
// Kept in its own file, separate from columnDefinitons.constant.ts, because
// that file also imports ag-grid/React (HighlightCellRenderer) - this list is
// plain data that non-React code (the DB seed script) needs to import too.
export const BELLEK_TIPI_EXCLUDED_VALUES = [
	'BGA153',
	'NAND',
	'NVME',
	'SSD',
	'UMCP',
];
