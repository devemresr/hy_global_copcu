import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import type { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import type { ExcelRow } from '../types';
import {
	FIELD_NAMES,
	ramComparator,
} from '../constants/columnDefinitons.constant';
import { useInventoryColumnFilter } from '../hooks/useInventoryColumnFilter';
import { ColumnFilterPanel } from './paymentCalculator/ColumnFilterPanel';
import {
	FuseSearchBox,
	type FuseSearchBoxHandle,
	type FuseSearchResults,
} from './FuseSearchBox';
import { InventoryDataGrid } from './InventoryDataGrid';
import CancelIcon from '../assets/icons/icons8-cancel.svg?react';

type InventoryBrowserProps = {
	rows: ExcelRow[];
	colDef: ColDef[];
};

// Bundles the whole inventory-browsing UI - the Fuse search box, the
// Depoloma/BellekTipi filter sidebar (with its mobile modal variant), and the
// AG Grid itself - so both the public inventory page and the admin item list
// can render the same search+filter+grid experience over their own
// rows/columnDefs instead of duplicating this layout.
export function InventoryBrowser({ rows, colDef }: InventoryBrowserProps) {
	const [filtersOpen, setFiltersOpen] = useState(false);
	const gridRef = useRef<AgGridReact>(null);
	const fuseSearchRef = useRef<FuseSearchBoxHandle>(null);
	const [searchResults, setSearchResults] = useState<FuseSearchResults>(null);
	const isReady = rows.length > 0;

	// one hook call per filterable field
	const memorySizeFilter = useInventoryColumnFilter(
		FIELD_NAMES.Depoloma,
		rows,
		ramComparator,
		{
			// A DB-backed row's depolama is a plain number with its unit in a
			// sibling depolamaBirimi field; the bundled static dataset's depolama
			// is already one "128GB" string (see buildInventoryRecords.helper.ts).
			// Without this, trimmedOrNull's default string-only read would treat
			// every DB row's numeric depolama as "no value".
			getValue: (row) => {
				const raw = row.depolama;
				if (typeof raw === 'number') {
					return Number.isNaN(raw)
						? null
						: `${raw} ${row.depolamaBirimi ?? 'GB'}`;
				}
				return typeof raw === 'string' ? raw.trim() || null : null;
			},
		},
	);
	// Junk BellekTipi values (BGA153/NAND/NVME/SSD/UMCP) are excluded up in
	// useInventoryRows now, at the shared row source - not here. Excluding
	// them only in this filter's matches() left them absent from the default
	// view but still reachable through search, which reads straight from the
	// unfiltered `rows` this filter also receives.
	const bellekTipiFilter = useInventoryColumnFilter(
		FIELD_NAMES.BellekTipi,
		rows,
		ramComparator,
		{ emptyValueLabel: 'Bellek Tipi Belirtilmemiş' },
	);

	const activeFilters = [memorySizeFilter, bellekTipiFilter].filter(
		(f) => f.hasColumn,
	);

	const filteredRows = useMemo(() => {
		return rows.filter((r) => activeFilters.every((f) => f.matches(r)));
	}, [rows, activeFilters]);

	const gridRows = useMemo(() => {
		if (searchResults) {
			return searchResults.map((r) => ({
				...r.item,
				matches: r.matches ?? [],
			}));
		}
		return filteredRows.map((item) => ({ ...item, matches: [] }));
	}, [searchResults, filteredRows]);

	// usinglayouteffect to ensure DOM is painted
	useLayoutEffect(() => {
		// Focus once the data (and therefore the search input) is rendered
		if (isReady) {
			fuseSearchRef.current?.focus();
		}
	}, [isReady]);

	return (
		<>
			{isReady && (
				<div className='flex flex-col md:flex-row md: lg:items-center gap-3 text-text py-3'>
					{/* Mobile filter tablet phones/}
					{/* Mobile trigger button hidden at sm+ */}
					{activeFilters.length > 0 && (
						<button
							type='button'
							onClick={() => setFiltersOpen(true)}
							className='sm:hidden w-full rounded-xl bg-button-bg text-text py-2 text-sm font-medium'
						>
							Filtreler
						</button>
					)}
					{filtersOpen && (
						<div
							className='md:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 '
							onClick={() => setFiltersOpen(false)}
						>
							<div
								className='w-full sm:max-w-sm  max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:w-0  bg-modal-bg rounded-xl'
								onClick={(e) => e.stopPropagation()}
							>
								<div className=' flex flex-col gap-2 rounded-xl p-4'>
									<div className='flex items-center justify-between'>
										<span className='text-sm font-semibold p-1 text-text'>
											Filtreler
										</span>
										<button
											className='text-text h-7 w-7 self-end'
											onClick={() => setFiltersOpen(false)}
											type='button'
										>
											<CancelIcon className='w-full h-full icon' />
										</button>
									</div>
									{activeFilters.map((f) => (
										<ColumnFilterPanel
											label={f.field}
											key={f.field}
											uniqueValues={f.uniqueValues}
											selectedValues={f.selectedValues}
											onChange={f.setSelectedValues}
										/>
									))}
								</div>
							</div>
						</div>
					)}
				</div>
			)}

			<div className='grid gap-4 grid-cols-1 [grid-template-areas:"filters"_"search"_"grid"] lg:grid-cols-[1fr_4fr] lg:[grid-template-areas:"search_search"_"filters_grid"]'>
				{activeFilters.length > 0 && (
					<div className='hidden sm:flex sm:flex-col overflow-y-auto [&::-webkit-scrollbar]:w-0 text-text lg:h-[70vh] lg:max-h-[70vh] max-h-[40vh] gap-2 [grid-area:filters]'>
						<span className='p-1 top-0 text-text'>Filtreler</span>
						{activeFilters.map((f) => (
							<ColumnFilterPanel
								label={f.field}
								key={f.field}
								uniqueValues={f.uniqueValues}
								selectedValues={f.selectedValues}
								onChange={f.setSelectedValues}
							/>
						))}
					</div>
				)}
				<div className='[grid-area:search]'>
					<FuseSearchBox
						ref={fuseSearchRef}
						rows={rows}
						onResultsChange={setSearchResults}
					/>
				</div>

				<div className='[grid-area:grid]'>
					<InventoryDataGrid
						rowData={gridRows}
						columnDefs={colDef}
						ref={gridRef}
					/>
				</div>
			</div>
		</>
	);
}
