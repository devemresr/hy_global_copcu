import { PartyName } from './PartyName';
import { useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import type { PurchaseChartSettings } from '../../helpers/purchaseChartSeries.helper';
import {
	usePurchases,
	type Purchase,
	type PurchasesResponse,
	type PurchaseFilters,
	type PurchaseLine,
	type SavedPurchaseLine,
} from '../../hooks/api/endpoints/usePurchases';
import { STOCK_BUTTON } from '../../constants/stockStyles.constant';
import { PURCHASE_QUANTITY_UNIT_LABELS } from '../../constants/purchaseProducts.constant';
import {
	formatPurchaseProduct,
	formatPurchaseQuantity,
	formatPurchaseUnitTotals,
} from '../../helpers/purchaseProduct.helper';
import { InventoryDataGrid } from '../InventoryDataGrid';
import { AdminSummary } from './AdminCollapseHeading';
import { PurchaseCharts } from './PurchaseCharts';
import { PurchaseReportPdfModal } from './PurchaseReportPdfModal';
import { CreatedPurchasePdfModal } from './CreatedPurchasePdfModal';
import { Pagination } from './Pagination';
const money = (n: number) =>
	n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
const button = STOCK_BUTTON;
export function PurchaseAnalysisReport({
	filters,
}: {
	filters: PurchaseFilters;
}) {
	const [rowPdfPurchase, setRowPdfPurchase] = useState<Purchase | null>(null);
	const [excludedPurchaseIds, setExcludedPurchaseIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [historyPdf, setHistoryPdf] = useState<{
		data: PurchasesResponse;
		filters: PurchaseFilters;
		settings?: PurchaseChartSettings;
		action?: 'download' | 'share';
	} | null>(null);
	const [exportActionsTarget, setExportActionsTarget] =
		useState<HTMLDivElement | null>(null);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const historyOpen = true;
	const history = usePurchases(filters, page, pageSize, historyOpen);
	const excludedIds = useMemo(
		() => [...excludedPurchaseIds].sort(),
		[excludedPurchaseIds],
	);
	const matchingIds =
		history.data?.timeline?.map((order) => order._id) ??
		history.data?.orders.map((order) => order._id) ??
		[];
	const selectedCount = Math.max(
		0,
		(history.data?.summary.count ?? 0) -
			matchingIds.filter((id) => excludedPurchaseIds.has(id)).length,
	);
	const selectedHistory = usePurchases(
		filters,
		1,
		1,
		historyOpen && excludedIds.length > 0 && selectedCount > 0,
		excludedIds,
	);
	const reportData =
		selectedCount === 0 && history.data
			? {
					...history.data,
					orders: [],
					timeline: [],
					daily: [],
					byType: [],
					byMemory: [],
					byTypeAndMemory: [],
					adjustments: [],
					missingListPrices: [],
					summary: { count: 0, total: 0, quantity: 0 },
				}
			: excludedIds.length
				? selectedHistory.data
				: history.data;
	const reportRefreshing =
		history.isFetching ||
		history.isPlaceholderData ||
		Boolean(history.error) ||
		(excludedIds.length > 0 &&
			selectedCount > 0 &&
			(selectedHistory.isFetching ||
				selectedHistory.isPlaceholderData ||
				Boolean(selectedHistory.error)));

	const columns = useMemo<ColDef[]>(
		() => [
			{
				colId: 'reportActions',
				headerName: 'PDF / Rapor',
				width: 148,
				minWidth: 148,
				maxWidth: 148,
				pinned: 'left',
				sortable: false,
				filter: false,
				resizable: false,
				cellRenderer: ({ data }: { data: Purchase }) => (
					<div className='flex h-full items-center gap-3'>
						<input
							type='checkbox'
							aria-label={`${data.name || data._id} rapora dahil et`}
							checked={!excludedPurchaseIds.has(data._id)}
							disabled={history.isFetching}
							onClick={(event) => event.stopPropagation()}
							onChange={(event) => {
								const checked = event.target.checked;
								setExcludedPurchaseIds((current) => {
									const next = new Set(current);
									if (checked) next.delete(data._id);
									else next.add(data._id);
									return next;
								});
							}}
							className='size-4 cursor-pointer accent-neutral-700'
						/>
						<button
							type='button'
							className='rounded-lg border border-border bg-button-bg px-2 py-1 text-xs hover:bg-button-hover-bg'
							aria-label={`${data.name || data._id} PDF indir`}
							onClick={(event) => {
								event.stopPropagation();
								setRowPdfPurchase(data);
							}}
						>
							PDF indir
						</button>
					</div>
				),
			},
			{
				colId: 'name',
				headerName: 'Bayi adı',
				width: 230,
				valueGetter: ({ data }) =>
					data?.currentBayiName || data?.name || data?._id,
				cellRenderer: ({ data }: { data: Purchase }) => (
					<PartyName name={data.name} currentName={data.currentBayiName} />
				),
				filter: 'agTextColumnFilter',
			},
			{
				field: 'createdAt',
				headerName: 'Tarih',
				sort: 'desc',
				width: 180,
				valueFormatter: ({ value }) =>
					new Date(value).toLocaleString('tr-TR', {
						timeZone: 'Europe/Istanbul',
					}),
			},
			{
				colId: 'items',
				headerName: 'Ürünler',
				width: 320,
				valueGetter: ({ data }) =>
					data.lines
						.map(
							(l: PurchaseLine) =>
								`${formatPurchaseProduct(l)} × ${formatPurchaseQuantity(l.quantity, l.quantityUnit)}`,
						)
						.join(', '),
				tooltipValueGetter: ({ value }) => value,
				filter: 'agTextColumnFilter',
			},
			{
				colId: 'quantity',
				headerName: 'Miktar',
				width: 180,
				valueGetter: ({ data }) => formatPurchaseUnitTotals(data),
				filter: 'agTextColumnFilter',
			},
			{
				colId: 'priceChanges',
				headerName: 'Fiyat değişiklikleri',
				width: 300,
				filter: 'agTextColumnFilter',
				valueGetter: ({ data }) =>
					data.lines
						.filter(
							(line: SavedPurchaseLine) =>
								typeof line.originalUnitPrice === 'number' &&
								line.originalUnitPrice !== line.unitPrice,
						)
						.map(
							(line: SavedPurchaseLine) =>
								`${formatPurchaseProduct(line)}: ${money(line.originalUnitPrice!)} → ${money(line.unitPrice)} (${money(line.priceAdjustment ?? 0)} / ${PURCHASE_QUANTITY_UNIT_LABELS[line.quantityUnit ?? 'piece']})`,
						)
						.join('; ') || '—',
			},
			{
				field: 'total',
				headerName: 'Toplam',
				width: 150,
				valueFormatter: ({ value }) => money(value),
				filter: 'agNumberColumnFilter',
				cellClass: 'font-semibold',
			},
		],
		[excludedPurchaseIds, history.isFetching],
	);

	return (
		<>
			{' '}
			{historyPdf && (
				<PurchaseReportPdfModal
					data={historyPdf.data}
					filters={historyPdf.filters}
					settings={historyPdf.settings}
					action={historyPdf.action}
					onClose={() => setHistoryPdf(null)}
				/>
			)}
			{rowPdfPurchase && (
				<CreatedPurchasePdfModal
					order={rowPdfPurchase}
					mode='existing'
					onClose={() => setRowPdfPurchase(null)}
				/>
			)}
			<details
				className='min-w-0 max-w-full rounded-2xl border border-border p-3 sm:p-4'
				aria-labelledby='order-history'
				open={historyOpen}
			>
				<AdminSummary>
					<span id='order-history'>Alış geçmişi</span>
				</AdminSummary>
				{historyOpen && (
					<div className='mt-4 min-w-0 space-y-4'>
						{history.isFetching && <p role='status'>Alışlar yükleniyor...</p>}
						{history.error && (
							<p role='alert' className='text-red-500'>
								{history.error.message}{' '}
								<button
									className={button}
									onClick={() => void history.refetch()}
								>
									Tekrar dene
								</button>
							</p>
						)}
						{history.data && (
							<>
								<div className='grid min-w-0 gap-3 rounded-xl border border-border bg-button-bg/40 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center'>
									<label className='flex min-w-0 items-center gap-2 text-sm'>
										<input
											type='checkbox'
											className='size-4 shrink-0 accent-neutral-700'
											checked={
												selectedCount > 0 &&
												selectedCount === history.data.summary.count
											}
											ref={(input) => {
												if (input)
													input.indeterminate =
														selectedCount > 0 &&
														selectedCount < history.data!.summary.count;
											}}
											disabled={
												history.isFetching || history.data.summary.count === 0
											}
											onChange={(event) =>
												setExcludedPurchaseIds(
													event.target.checked
														? new Set()
														: new Set(matchingIds),
												)
											}
										/>
										<span>Filtreye uyan tüm alışları rapora dahil et</span>
									</label>
									<div ref={setExportActionsTarget} className='min-w-0' />
									<p
										className='text-xs text-text/70 lg:col-span-2'
										role='status'
									>
										{selectedCount} / {history.data.summary.count} alış rapora
										dahil · Seçim tüm sayfalarda korunur
									</p>
								</div>
								<div className='grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3'>
									{[
										[
											'Alış',
											history.data.summary.count.toLocaleString('tr-TR'),
										],
										[
											'Ürün miktarı',
											formatPurchaseUnitTotals(history.data.summary),
										],
										['Toplam tutar', money(history.data.summary.total)],
									].map(([label, value]) => (
										<div
											key={label}
											className={`min-w-0 rounded-xl border p-3 sm:p-4 ${label === 'Toplam tutar' ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200' : label === 'Ürün miktarı' ? 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200' : 'border-border bg-button-bg/40'}`}
										>
											<p className='text-sm opacity-70'>{label}</p>
											<p className='mt-1 break-words text-lg font-semibold tabular-nums sm:text-xl'>
												{value}
											</p>
										</div>
									))}
								</div>
								{selectedHistory.isFetching &&
									excludedIds.length > 0 &&
									selectedCount > 0 && (
										<p role='status' className='text-sm opacity-70'>
											Rapor seçimi güncelleniyor...
										</p>
									)}
								{selectedHistory.error &&
									excludedIds.length > 0 &&
									selectedCount > 0 && (
										<p role='alert' className='text-sm text-red-500'>
											Rapor seçimi güncellenemedi.{' '}
											<button
												type='button'
												className='underline'
												onClick={() => void selectedHistory.refetch()}
											>
												Tekrar dene
											</button>
										</p>
									)}
								{reportData && (
									<PurchaseCharts
										exportActionsTarget={exportActionsTarget}
										downloadLabel={
											'Seçilenleri tek PDF olarak indir (' + selectedCount + ')'
										}
										onOpenPdf={(settings, action) => {
											if (!reportRefreshing && reportData.summary.count > 0)
												setHistoryPdf({
													data: reportData,
													settings,
													action,
													filters: { ...filters },
												});
										}}
										data={reportData}
										filters={filters}
										refreshing={reportRefreshing}
									/>
								)}
								{history.data.summary.count === 0 ? (
									<p className='p-4 text-sm opacity-70'>
										Bu aralıkta alış bulunamadı.
									</p>
								) : (
									<InventoryDataGrid
										rowData={history.data.orders}
										columnDefs={columns}
									/>
								)}
								<Pagination
									hideNavWhenSinglePage
									page={page}
									totalPages={history.data.totalPages}
									pageSize={pageSize}
									onPageChange={setPage}
									onPageSizeChange={(size) => {
										setPageSize(size);
										setPage(1);
									}}
									summary={`${history.data.summary.count} alış`}
								/>
							</>
						)}
					</div>
				)}
			</details>
		</>
	);
}
