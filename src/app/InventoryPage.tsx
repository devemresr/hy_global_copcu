import './App.css';

import logger from './util/logger';
import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { highlightSegments } from './helpers/inventoryPageHelpers/search.helpers';
import { AgGridReact } from 'ag-grid-react';
import {
	themeQuartz,
	colorSchemeDark,
	ColumnAutoSizeModule,
} from 'ag-grid-community';
import invData from './assets/invData.xlsx';

import {
	ModuleRegistry,
	TextFilterModule,
	NumberFilterModule,
	ClientSideRowModelModule,
} from 'ag-grid-community';
import {
	AUTO_SIZED_COLUMNS,
	columnDefsBySheet,
	FIELD_NAMES,
	ramComparator,
} from './constants/columnDefinitons.constant';
import { useColumnFilter } from './hooks/useColumnFilter';
import { ColumnFilterPanel } from './component/paymentCalculator/ColumnFilterPanel';
import { useWindowSize } from './hooks/useWindowSize';
import { useWorkbookLoader } from './hooks/Useworkbookloader';
import { useRowSearch } from './hooks/useRowSearch';
import CancelIcon from './assets/icons/icons8-cancel.svg?react';
import { useTheme } from './component/Layout';
import { useSearchParams } from 'react-router-dom';
import { SquareArrowOutUpRight } from 'lucide-react';

ModuleRegistry.registerModules([
	ClientSideRowModelModule, // needed for basic rowData rendering
	TextFilterModule, // for Brand/Model text filters
	NumberFilterModule, // for numbering filtering
	ColumnAutoSizeModule,
]);
export function HighlightCellRenderer({ value, data, colDef }: any) {
	const key = colDef.field;
	const text = String(value ?? '');
	const fieldMatch = data?.matches?.find((m: any) => m.key === key);

	if (!fieldMatch || fieldMatch.indices.length === 0) {
		return <>{text}</>;
	}

	const segments = highlightSegments(text, fieldMatch.indices);
	return (
		<>
			{segments.map((seg, i) =>
				seg.isMatch ? (
					<mark className='dark:bg-gray-500 bg-' key={i}>
						{seg.text}
					</mark>
				) : (
					<span key={i}>{seg.text}</span>
				),
			)}
		</>
	);
}

function getInitialTheme(): 'light' | 'dark' {
	const saved = localStorage.getItem('theme');
	return saved === 'light' || saved === 'dark'
		? saved
		: window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light';
}

function InventoryPage() {
	const [filtersOpen, setFiltersOpen] = useState(false);
	const gridRef = useRef<AgGridReact>(null);
	const { theme } = useTheme();
	const gridTheme =
		theme === 'dark' ? themeQuartz.withPart(colorSchemeDark) : themeQuartz;

	const [searchParams] = useSearchParams();
	const bellekTipiIncluded = searchParams.has('detayliData');
	const searchRef = useRef<HTMLInputElement | null>(null);

	const {
		sheetNames,
		selectedSheet,
		rows,
		colDef,
		columnFiltersBySheet,
		dispatch,
		handleFileChange,
	} = useWorkbookLoader({ bellekTipiIncluded });

	const { handleQuery, searchResults } = useRowSearch(rows);

	useLayoutEffect(() => {
		const theme = getInitialTheme();
		document.documentElement.classList.toggle('dark', theme === 'dark');
	}, []);

	// one hook call per filterable field
	const memorySizeFilter = useColumnFilter(
		FIELD_NAMES.Depoloma,
		rows,
		selectedSheet,
		columnFiltersBySheet,
		dispatch,
		ramComparator,
	);
	const bellekTipiFilter = useColumnFilter(
		FIELD_NAMES.BellekTipi,
		rows,
		selectedSheet,
		columnFiltersBySheet,
		dispatch,
		ramComparator,
	);

	const allFilters = [
		memorySizeFilter,
		...(bellekTipiIncluded ? [bellekTipiFilter] : []),
	];
	const activeFilters = allFilters.filter((f) => f.hasColumn);

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
		// Focus when sheetNames becomes available since input getting rendered is conditioned to it
		if (sheetNames.length > 0) {
			searchRef.current?.focus();
		}
	}, [sheetNames]);

	useEffect(() => {
		async function loadAsset() {
			const response = await fetch(invData);
			const blob = await response.blob();

			const file = new File([blob], 'invData.xlsx', {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});

			handleFileChange(file);
		}

		loadAsset();
	}, [handleFileChange]);

	const { width } = useWindowSize();

	useEffect(() => {
		if (!gridRef.current?.api || gridRows.length === 0) return;
		const isTablet = width >= 768;
		logger.debug({ width, isTablet });
		if (isTablet) return; // skip autosizing on larger screens
		if (typeof window === 'undefined') return; // no need to autosize if the width is at lg

		const colsToAutosize = columnDefsBySheet[selectedSheet]
			.map((element) => element.field)
			.filter(
				(field): field is string =>
					field !== undefined && AUTO_SIZED_COLUMNS.includes(field),
			);

		gridRef.current.api.autoSizeColumns(colsToAutosize, false);
	}, [selectedSheet, gridRows, width]);

	return (
		<div className=' mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 '>
			<div className='bg-button-bg p-4 rounded-xl my-4'>
				<div className='flex items-start gap-3'>
					<p className='text-text flex-1'>
						Anankart alımında anakartın modeli depoloma kapasitesini belirler,
						anakartın modelini nasıl öğrenebileceğinizi öğrenmek için{' '}
						<a
							href='/bilgi'
							className='inline-flex items-center gap-1 underline underline-offset-2 font-medium hover:opacity-80 transition-opacity'
						>
							bilgilendirme sayfasını ziyaret edebilirsiniz
							<SquareArrowOutUpRight className='w-5  h-5 ' />
						</a>
					</p>
				</div>
			</div>

			{sheetNames.length > 0 && (
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
				<div className='bg-button-bg  rounded-xl text-text p-1 mx-auto w-100 md:w-full lg:w-120 [grid-area:search]'>
					<input
						type='text'
						placeholder='Bir model kodu arayın...'
						onChange={handleQuery}
						ref={searchRef}
						className='outline-none focus:bg-button-focus-bg rounded-xl py-1 px-2 w-full'
						disabled={rows.length === 0}
					/>
				</div>

				<div className='w-full min-w-0 h-[70vh] [grid-area:grid]'>
					<AgGridReact
						theme={gridTheme}
						rowData={gridRows}
						columnDefs={colDef}
						defaultColDef={{ sortable: true, resizable: true, flex: 1 }}
						ref={gridRef}
					/>
				</div>
			</div>
		</div>
	);
}

export default InventoryPage;
