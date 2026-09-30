import type { ReactNode } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// A "1 … 4 5 6 … 42"-style window instead of just Önceki/Sonraki - always
// anchored on the first and last page, with a small run around the current
// one, and an ellipsis standing in for whatever's skipped in between.
function getPageWindow(
	current: number,
	total: number,
	delta = 1,
): (number | 'ellipsis')[] {
	if (total <= 1) return [1];

	const left = Math.max(2, current - delta);
	const right = Math.min(total - 1, current + delta);
	const pages: (number | 'ellipsis')[] = [1];

	if (left > 2) pages.push('ellipsis');
	for (let p = left; p <= right; p++) pages.push(p);
	if (right < total - 1) pages.push('ellipsis');
	pages.push(total);

	return pages;
}

type PaginationProps = {
	page: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	pageSize: number;
	// Callers reset to page 1 themselves; this only reports the new size.
	onPageSizeChange: (pageSize: number) => void;
	// Shown opposite the page-size select, e.g. "42 kayıt".
	summary?: ReactNode;
	hideNavWhenSinglePage?: boolean;
};

// Presentational only - callers own page/pageSize state, whether the data is
// paged on the server (LogEventsSection) or sliced client-side (BulkEditPanel).
export function Pagination({
	page,
	totalPages,
	onPageChange,
	pageSize,
	onPageSizeChange,
	summary,
	hideNavWhenSinglePage = false,
}: PaginationProps) {
	const showNav = !(hideNavWhenSinglePage && totalPages <= 1);

	return (
		<>
			<div className='flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3'>
				<label className='flex items-center gap-2'>
					<span className='opacity-70'>Sayfa başına:</span>
					<select
						value={pageSize}
						onChange={(e) => onPageSizeChange(Number(e.target.value))}
						className='rounded-xl bg-button-focus-bg px-2 py-1'
					>
						{PAGE_SIZE_OPTIONS.map((size) => (
							<option key={size} value={size}>
								{size}
							</option>
						))}
					</select>
				</label>
				{summary && <span className='text-xs opacity-70'>{summary}</span>}
			</div>

			{showNav && (
				<div className='flex flex-wrap items-center gap-1 border-t border-border pt-3'>
					<button
						type='button'
						onClick={() => onPageChange(Math.max(1, page - 1))}
						disabled={page <= 1}
						className='rounded-xl bg-button-focus-bg px-3 py-1.5 font-medium hover:bg-button-hover-bg disabled:opacity-40'
					>
						Önceki
					</button>
					{getPageWindow(page, totalPages).map((entry, i) =>
						entry === 'ellipsis' ? (
							<span key={`ellipsis-${i}`} className='px-1.5 opacity-50'>
								…
							</span>
						) : (
							<button
								key={entry}
								type='button'
								onClick={() => onPageChange(entry)}
								disabled={entry === page}
								className={`rounded-xl px-3 py-1.5 font-medium hover:bg-button-hover-bg disabled:opacity-100 ${
									entry === page ? 'bg-button-focus-bg' : 'bg-button-bg'
								}`}
							>
								{entry}
							</button>
						),
					)}
					<button
						type='button'
						onClick={() => onPageChange(Math.min(totalPages, page + 1))}
						disabled={page >= totalPages}
						className='rounded-xl bg-button-focus-bg px-3 py-1.5 font-medium hover:bg-button-hover-bg disabled:opacity-40'
					>
						Sonraki
					</button>
				</div>
			)}
		</>
	);
}
