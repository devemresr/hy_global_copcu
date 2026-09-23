import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { ExcelRow } from '../types';
import { useRowSearch } from '../hooks/useRowSearch';
import SearchIcon from '../assets/icons/icons8-search.svg?react';
import ExtendedSearchIcon from '../assets/icons/icons8-extendedSearch.svg?react';

export type FuseSearchResults = ReturnType<typeof useRowSearch>['searchResults'];

export type FuseSearchBoxHandle = {
	focus: () => void;
};

type FuseSearchBoxProps = {
	rows: ExcelRow[];
	onResultsChange: (results: FuseSearchResults) => void;
	placeholder?: string;
};

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

// Bundles the Fuse-backed search box used on the inventory grid: the input
// itself, the strict/extended toggle (with its explanatory hint), the
// "no results, try extended search" prompt, and the recent-searches strip.
// Search results are handed back via onResultsChange rather than returned
// directly, since the caller needs them on every change to rebuild its rows.
export const FuseSearchBox = forwardRef<FuseSearchBoxHandle, FuseSearchBoxProps>(
	function FuseSearchBox(
		{ rows, onResultsChange, placeholder = 'Bir model kodu arayın...' },
		ref,
	) {
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

		const searchRef = useRef<HTMLInputElement | null>(null);
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

		useImperativeHandle(ref, () => ({
			focus: () => searchRef.current?.focus(),
		}));

		useEffect(() => {
			onResultsChange(searchResults);
		}, [searchResults, onResultsChange]);

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
			<div className='bg-button-bg rounded-xl text-text p-1 mx-auto w-full lg:w-120'>
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
						placeholder={placeholder}
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
		);
	},
);
