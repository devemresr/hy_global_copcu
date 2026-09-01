import './App.css';

import logger from './util/logger';
import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { highlightSegments } from './search.helpers';
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
	autosizedColumns,
	columnDefsBySheet,
	ramComparator,
} from './columnDef.constant';
import { useColumnFilter } from './hooks/useColumnFilter';
import { ColumnFilterPanel } from './component/paymentCalculator/ColumnFilterPanel';
import { useWindowSize } from './hooks/useWindowSize';
import { useWorkbookLoader } from './hooks/Useworkbookloader';
import { useRowSearch } from './hooks/useRowSearch';
import CancelIcon from './assets/icons/icons8-cancel.svg?react';
import { useTheme } from './component/Layout';

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
					<mark key={i}>{seg.text}</mark>
				) : (
					<span key={i}>{seg.text}</span>
				),
			)}
		</>
	);
}

// Declare here which fields you want a filter panel for.
// Add/remove entries to control what shows up no other code needs to change.
export const FILTERABLE_FIELDS = {
	brand: 'Brand',
	model: 'model',
	ram: 'Ram',
} as const;

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

	const {
		sheetNames,
		selectedSheet,
		rows,
		colDef,
		columnFiltersBySheet,
		dispatch,
		handleFileChange,
	} = useWorkbookLoader();

	const { handleQuery, searchResults } = useRowSearch(rows);

	useLayoutEffect(() => {
		const theme = getInitialTheme();
		document.documentElement.classList.toggle('dark', theme === 'dark');
	}, []);

	// one hook call per filterable field
	const brandFilter = useColumnFilter(
		FILTERABLE_FIELDS.brand,
		rows,
		selectedSheet,
		columnFiltersBySheet,
		dispatch,
	);
	const modelFilter = useColumnFilter(
		FILTERABLE_FIELDS.model,
		rows,
		selectedSheet,
		columnFiltersBySheet,
		dispatch,
	);
	const ramfilter = useColumnFilter(
		FILTERABLE_FIELDS.ram,
		rows,
		selectedSheet,
		columnFiltersBySheet,
		dispatch,
		ramComparator,
	);

	const allFilters = [brandFilter, modelFilter, ramfilter];
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
	}, []);

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
					field !== undefined && autosizedColumns.includes(field),
			);

		logger.debug({ colsToAutosize }, 'gonna auto size');
		gridRef.current.api.autoSizeColumns(colsToAutosize, false);
	}, [selectedSheet, gridRows]);

	return (
		<div className=' mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 '>
			{sheetNames.length > 0 && (
				<div className='flex flex-col md:flex-row lg:items-center gap-3 text-text py-3'>
					<div className='flex flex-col md:flex-row gap-2'>
						<div className='bg-button-bg w-60 lg:w-auto rounded-xl text-text p-1'>
							<input
								type='text'
								placeholder='Search text'
								onChange={handleQuery}
								// className='focus:button-focus-bg'
								className='outline-none focus:bg-button-focus-bg  rounded-xl py-1 px-2 w-full'
								disabled={rows.length === 0}
							/>
						</div>
						<div className='flex flex-row gap-2'>
							{sheetNames.map((name) => (
								<button
									className={`${selectedSheet === name ? 'bg-button-focus-bg' : ''} bg-button-bg rounded-xl px-2 py-1 hover:bg-button-focus-bg`}
									key={name}
									value={name}
									onClick={() => {
										dispatch({
											type: 'SHEET_SELECTED',
											sheetName: name,
										});
									}}
								>
									{name}
								</button>
							))}
						</div>
					</div>
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
			<div className='flex flex-col lg:flex-row gap-4'>
				{activeFilters.length > 0 && (
					<div className='lg:flex-1 hidden sm:flex sm:flex-col overflow-y-auto [&::-webkit-scrollbar]:w-0 text-text  lg:h-[70vh]  lg:max-h-[70vh] max-h-[40vh] gap-2'>
						<span className='p-1  top-0 text-text '>Filtreler</span>
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
				<div className='w-full lg:flex-4 lg:min-w-0 h-[70vh] '>
					<AgGridReact
						theme={gridTheme}
						rowData={gridRows}
						columnDefs={colDef}
						defaultColDef={{ sortable: true, resizable: true, flex: 1 }} // flex lets other cols fill space
						ref={gridRef}
					/>
				</div>
			</div>
		</div>
	);
}

export default InventoryPage;
