import './App.css';

import { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { highlightSegments } from './helpers/inventoryPageHelpers/search.helpers';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz, colorSchemeDark } from 'ag-grid-community';

import {
	ModuleRegistry,
	TextFilterModule,
	NumberFilterModule,
	ClientSideRowModelModule,
} from 'ag-grid-community';
import {
	FIELD_NAMES,
	ramComparator,
} from './constants/columnDefinitons.constant';
import { useInventoryColumnFilter } from './hooks/useInventoryColumnFilter';
import { ColumnFilterPanel } from './component/paymentCalculator/ColumnFilterPanel';
import { useWindowSize } from './hooks/useWindowSize';
import { useInventoryRows } from './hooks/useInventoryRows';
import { useRowSearch } from './hooks/useRowSearch';

import CancelIcon from './assets/icons/icons8-cancel.svg?react';
import { useTheme } from './component/Layout';
import { SquareArrowOutUpRight } from 'lucide-react';
import SearchIcon from './assets/icons/icons8-search.svg?react';
import ExtendedSearchIcon from './assets/icons/icons8-extendedSearch.svg?react';
// import { useGetItems } from './hooks/api/endpoints/useItems'; // disabled: inventory comes from an uploaded static file, not a live call

ModuleRegistry.registerModules([
	ClientSideRowModelModule, // needed for basic rowData rendering
	TextFilterModule, // for Brand/Model text filters
	NumberFilterModule, // for numbering filtering
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

const RECENT_SEARCH_DISPLAY_LENGTH = 10;
// keep the tooltip box off the screen edges, and keep the arrow off the
// tooltip's own rounded corners
const HINT_VIEWPORT_MARGIN = 8;
const HINT_ARROW_EDGE_MARGIN = 12;
// how long the hint stays up before closing itself - touch devices have no
// hover to leave, so this is the only thing that closes it on mobile
const HINT_DISPLAY_MS = 3000;

function truncateForDisplay(term: string): string {
	return term.length > RECENT_SEARCH_DISPLAY_LENGTH
		? `${term.slice(0, RECENT_SEARCH_DISPLAY_LENGTH)}...`
		: term;
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
	const searchIconRef = useRef<HTMLButtonElement>(null);
	const hintRef = useRef<HTMLDivElement>(null);
	// anchor = where the icon actually is; box/arrow are derived from it after
	// the tooltip renders, once its real width is known (see the layout effect)
	const [hintAnchor, setHintAnchor] = useState({ top: 0, centerX: 0 });
	const [hintBox, setHintBox] = useState<{
		left: number;
		arrowLeft: number;
	} | null>(null);
	const [showExtendedHint, setShowExtendedHint] = useState(false);
	const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const { theme } = useTheme();
	const gridTheme =
		theme === 'dark' ? themeQuartz.withPart(colorSchemeDark) : themeQuartz;

	// const bellekTipiIncluded = searchParams.has('detayliData');
	const bellekTipiIncluded = true;
	const searchRef = useRef<HTMLInputElement | null>(null);

	// const { data } = useGetItems(); // disabled: inventory comes from an uploaded static file, not a live call
	const { rows, colDef } = useInventoryRows(bellekTipiIncluded, undefined);
	const isReady = rows.length > 0;

	const {
		handleQuery,
		searchResults,
		showExtendedToggle,
		isLoose,
		toggleExtendedSearch,
		recentSearches,
		selectRecentSearch,
		removeRecentSearch,
	} = useRowSearch(rows);

	useLayoutEffect(() => {
		const theme = getInitialTheme();
		document.documentElement.classList.toggle('dark', theme === 'dark');
	}, []);

	// one hook call per filterable field
	const memorySizeFilter = useInventoryColumnFilter(
		FIELD_NAMES.Depoloma,
		rows,
		ramComparator,
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

	const allFilters = [
		memorySizeFilter,
		// ...(bellekTipiIncluded ? [bellekTipiFilter] : []),
		bellekTipiFilter,
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
		// Focus once the data (and therefore the search input) is rendered
		if (isReady) {
			searchRef.current?.focus();
		}
	}, [isReady]);

	const { width } = useWindowSize();

	// terminate any pending "auto-hide the hint" timeout on unmount
	useEffect(() => {
		return () => {
			if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
		};
	}, []);

	function positionHintOverIcon() {
		const rect = searchIconRef.current?.getBoundingClientRect();
		// getBoundingClientRect() is already viewport-relative, same as the
		// tooltip's `position: fixed` - adding window.scrollX/Y here would double
		// up the offset and push it away from the icon as soon as the page scrolls.
		if (rect) {
			setHintBox(null); // recompute against the real box on the next layout pass
			setHintAnchor({
				top: rect.bottom + 8,
				centerX: rect.left + rect.width / 2,
			});
		}
	}

	// Runs after the tooltip mounts/re-anchors, once its real rendered width is
	// known. Centering it on the icon would run it off-screen near either edge
	// on a narrow phone, so this clamps the box within the viewport and slides
	// the arrow over to wherever the icon actually ended up under the box,
	// instead of leaving the arrow stuck in the box's middle.
	useLayoutEffect(() => {
		if (!isLoose || !showExtendedHint) return;
		const box = hintRef.current;
		if (!box) return;

		const boxWidth = box.getBoundingClientRect().width;
		const viewportWidth = window.innerWidth;
		const idealLeft = hintAnchor.centerX - boxWidth / 2;
		const maxLeft = Math.max(
			HINT_VIEWPORT_MARGIN,
			viewportWidth - boxWidth - HINT_VIEWPORT_MARGIN,
		);
		const clampedLeft = Math.min(
			Math.max(idealLeft, HINT_VIEWPORT_MARGIN),
			maxLeft,
		);
		const arrowLeft = Math.min(
			Math.max(hintAnchor.centerX - clampedLeft, HINT_ARROW_EDGE_MARGIN),
			boxWidth - HINT_ARROW_EDGE_MARGIN,
		);

		setHintBox({ left: clampedLeft, arrowLeft });
	}, [isLoose, showExtendedHint, hintAnchor]);

	// Shows the hint and (re)starts its auto-close timer. Used by every trigger
	// so the hint always closes itself, regardless of how it was opened - it
	// can't rely on mouseleave alone since touch devices never fire one.
	function showHint() {
		positionHintOverIcon();
		setShowExtendedHint(true);
		if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
		hintTimeoutRef.current = setTimeout(
			() => setShowExtendedHint(false),
			HINT_DISPLAY_MS,
		);
	}

	function hideHint() {
		if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
		setShowExtendedHint(false);
	}

	// Hovering the icon re-shows the hint on demand, for whenever the user
	// forgets extended search is on and wants a reminder of how to turn it off.
	function handleIconMouseEnter() {
		if (!isLoose) return;
		showHint();
	}

	function handleIconMouseLeave() {
		hideHint();
	}

	// Shared by the icon and the "no results" prompt: whichever one the user
	// used to turn extended search on, show the same confirmation. No message
	// when turning it back off - there's nothing to confirm there.
	function handleToggleExtendedSearch() {
		const turningOn = !isLoose;
		toggleExtendedSearch();

		if (turningOn) {
			showHint();
		} else {
			hideHint();
		}
	}

	function handleSelectRecentSearch(term: string) {
		if (searchRef.current) searchRef.current.value = term;
		selectRecentSearch(term);
		searchRef.current?.focus();
	}

	return (
		<div className=' mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 '>
			<div className='bg-button-bg p-4 rounded-xl my-4'>
				<div className='flex items-start gap-3'>
					<p className='text-text flex-1'>
						Anankart alımında anakartın modeli depoloma kapasitesini belirler,
						anakartın modelini nasıl öğrenebileceğinizi öğrenmek için{' '}
						<a
							href='/bilgi'
							className='underline underline-offset-2 font-medium hover:opacity-80 transition-opacity'
						>
							bilgilendirme sayfasını ziyaret edebilirsiniz
							<SquareArrowOutUpRight className='w-5  h-5 inline-block ml-1 -mt-0.5' />
						</a>
					</p>
				</div>
			</div>

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
				<div className='bg-button-bg rounded-xl text-text p-1 mx-auto w-full lg:w-120 [grid-area:search]'>
					<div className='flex items-center gap-1'>
						<button
							type='button'
							ref={searchIconRef}
							onClick={handleToggleExtendedSearch}
							onMouseEnter={handleIconMouseEnter}
							onMouseLeave={handleIconMouseLeave}
							title={
								isLoose
									? 'Genişletilmiş aramayı kapat'
									: 'Genişletilmiş aramayı aç'
							}
							className='shrink-0'
						>
							{isLoose ? (
								<ExtendedSearchIcon className='w-5 h-5'></ExtendedSearchIcon>
							) : (
								<SearchIcon className='w-5 h-5'></SearchIcon>
							)}
						</button>
						{isLoose &&
							showExtendedHint &&
							createPortal(
								<div
									ref={hintRef}
									style={{
										top: hintAnchor.top,
										left: hintBox ? hintBox.left : hintAnchor.centerX,
										// until the first layout pass measures the real box
										// width, center it on the icon via transform so there's
										// no flash at the wrong spot on first paint
										transform: hintBox ? undefined : 'translateX(-50%)',
										visibility: hintBox ? 'visible' : 'hidden',
									}}
									className='fixed z-50 max-w-56 rounded-md bg-gray-600 px-3 py-2 text-center text-xs text-white shadow-lg'
								>
									<p className='font-medium'>Genişletilmiş arama açık</p>
									<p className='mt-0.5 opacity-80'>
										Kapatmak için simgeye tıklayabilirsiniz
									</p>
									<div
										className='absolute bottom-full border-4 border-transparent border-b-gray-600'
										style={{
											left: hintBox?.arrowLeft ?? '50%',
											transform: 'translateX(-50%)',
										}}
									/>
								</div>,
								document.body,
							)}
						<input
							type='text'
							placeholder='Bir model kodu arayın...'
							onChange={handleQuery}
							ref={searchRef}
							className='outline-none focus:bg-button-focus-bg rounded-xl py-1 px-2 w-full flex-1'
						/>
					</div>

					{showExtendedToggle && !isLoose && (
						<button
							type='button'
							onClick={handleToggleExtendedSearch}
							className='mt-2 w-full rounded-xl bg-button-focus-bg text-text py-1.5 text-sm font-medium'
						>
							Sonuç bulunamadı, geniş arama dene
						</button>
					)}

					{recentSearches.length > 0 && (
						<div className='mt-2 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-0'>
							{recentSearches.map(({ term, wasMiss }) => (
								<div
									key={term}
									// duller for a search that came back empty, so the strip
									// hints at which past terms are actually worth retrying
									className={`flex shrink-0 items-center gap-1 rounded-full bg-button-focus-bg text-text pl-3 pr-1.5 py-1 text-xs ${
										wasMiss ? 'opacity-45' : ''
									}`}
								>
									<button
										type='button'
										onClick={() => handleSelectRecentSearch(term)}
										title={term}
										className='whitespace-nowrap hover:opacity-80'
									>
										{truncateForDisplay(term)}
									</button>
									<button
										type='button'
										onClick={() => removeRecentSearch(term)}
										aria-label={`"${term}" aramasını sil`}
										className='flex h-4 w-4 shrink-0 items-center justify-center rounded-full leading-none hover:bg-button-hover-bg'
									>
										×
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				<div className='w-full min-w-0 h-[70vh] [grid-area:grid]'>
					<div className='w-full min-w-0 h-[70vh] [grid-area:grid]'>
						<AgGridReact
							theme={gridTheme}
							rowData={gridRows}
							columnDefs={colDef}
							// Below tablet width, columns stay at their own explicit width
							// (see columnDefsBySheet) so mobile gets a compact, predictable
							// layout - overflowing content scrolls within its own cell (see
							// the .ag-cell rule in App.css) instead of every column being
							// force-stretched to fill the container regardless of content.
							// From tablet width up there's room to spare, so flex:1 lets
							// columns stretch to fill it instead of leaving it empty.
							defaultColDef={{
								sortable: true,
								resizable: true,
								flex: width >= 768 ? 1 : undefined,
							}}
							alwaysMultiSort={width < 768}
							ref={gridRef}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export default InventoryPage;
