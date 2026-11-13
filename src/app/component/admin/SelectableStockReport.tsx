import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
	useStock,
	type StockFilters,
	type StockResponse,
} from '../../hooks/api/endpoints/useStock';
import { downloadStockSaleReport } from '../../helpers/stockSaleReport.helper';
import { STOCK_BUTTON } from '../../constants/stockStyles.constant';
import { StockReport } from './StockReport';

export function SelectableStockReport({
	data,
	filters,
	loading,
	...report
}: {
	data: StockResponse;
	controls?: ReactNode;
	filters: StockFilters;
	loading: boolean;
	view: 'movements' | 'profits' | 'bayi';
	groupBy: 'product' | 'memory';
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
}) {
	const [excluded, setExcluded] = useState<string[]>([]);
	const [exporting, setExporting] = useState(false);
	const matchingIds =
		data.matchingSaleIds ??
		data.operations.map((operation) => operation.requestId);
	const relevant = excluded.filter((id) => matchingIds.includes(id));
	const count = matchingIds.length - relevant.length;
	const hasPurchases =
		(filters.movementType ?? 'all-movements') === 'all-movements' ||
		filters.movementType === 'purchase-entries';
	const selected = useStock(
		{ ...filters, excludeSaleIds: relevant },
		1,
		1,
		relevant.length > 0 && (count > 0 || hasPurchases),
	);

	const ready =
		!loading &&
		!exporting &&
		(count > 0 || (hasPurchases && data.reportTotals.purchaseCost > 0)) &&
		(!relevant.length ||
			(!selected.isFetching &&
				!selected.isPlaceholderData &&
				!selected.isError &&
				Boolean(selected.data)));
	function toggle(id: string) {
		setExcluded((current) =>
			current.includes(id)
				? current.filter((value) => value !== id)
				: [...current, id],
		);
	}
	return (
		<div className='min-w-0 max-w-full space-y-3'>
			<div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-button-bg/30 p-3'>
				<div className='min-w-0 flex-1 space-y-1'>
					<label className='flex items-center gap-2 text-sm'>
						<input
							type='checkbox'
							aria-label='Filtrelenen tüm satışları rapora dahil et'
							checked={matchingIds.length > 0 && count === matchingIds.length}
							disabled={!matchingIds.length || loading}
							onChange={(event) =>
								setExcluded(event.target.checked ? [] : matchingIds)
							}
						/>
						Filtrelenen tüm satışları dahil et
					</label>
					<p role='status' className='text-xs text-text/70'>
						{count} / {matchingIds.length} satış rapora dahil. Seçim tüm
						sayfalarda korunur.
						{hasPurchases ? ' Filtrelenen alışlar da rapora eklenir.' : ''}
					</p>
					{relevant.length > 0 && (
						<button
							type='button'
							className='text-xs underline'
							onClick={() => setExcluded([])}
						>
							Satış seçimini sıfırla
						</button>
					)}
				</div>
				<button
					type='button'
					className={STOCK_BUTTON}
					disabled={!ready}
					onClick={async () => {
						if (!ready) return;
						setExporting(true);
						try {
							const refreshed = await selected.refetch();
							if (refreshed.isError || !refreshed.data)
								throw (
									refreshed.error ?? new Error('Rapor verileri yenilenemedi.')
								);
							await downloadStockSaleReport(refreshed.data, {
								...filters,
								excludeSaleIds: relevant,
							});
						} catch (error) {
							toast.error(
								error instanceof Error
									? error.message
									: 'Rapor oluşturulamadı.',
							);
						} finally {
							setExporting(false);
						}
					}}
				>
					{exporting
						? 'PDF hazırlanıyor...'
						: hasPurchases
							? 'Seçili hareketlerin PDF raporu'
							: 'Seçilen satışları PDF olarak indir'}
				</button>
			</div>
			{selected.isError && relevant.length > 0 && (
				<p role='alert' className='text-sm text-red-500'>
					Seçili satış raporu yüklenemedi: {selected.error.message}
				</p>
			)}
			<StockReport
				{...report}
				data={data}
				filters={filters}
				loading={loading}
				saleSelection={{ excludedIds: excluded, onToggle: toggle }}
			/>
		</div>
	);
}
