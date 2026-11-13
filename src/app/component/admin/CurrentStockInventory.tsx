import { StockSellingPriceInfo } from './StockSellingPriceInfo';
import { useMemo, useRef, useState, type ComponentProps } from 'react';
import { Layers, Rows3, Table2, Package, FilterX } from 'lucide-react';
import type {
	ColDef,
	GridApi,
	GridState,
	ICellRendererParams,
} from 'ag-grid-community';
import { InventoryDataGrid } from '../InventoryDataGrid';
import { AdminSummary } from './AdminCollapseHeading';
import {
	StockPriceMetrics,
	StockProductTag,
	StockQuantity,
} from './StockDisplay';
import { STOCK_PRODUCT_COLORS } from '../../constants/stockPresentation.constant';
import {
	PURCHASE_PRODUCT_TYPES,
	PURCHASE_PRODUCT_TYPE_ORDER,
	PURCHASE_QUANTITY_UNIT_LABELS,
} from '../../constants/purchaseProducts.constant';
import {
	STOCK_CONTROL,
	STOCK_BUTTON,
} from '../../constants/stockStyles.constant';
import type { StockPosition } from '../../hooks/api/endpoints/useStock';
import {
	sortStockPositions,
	stockValue,
	summarizeStock,
	type StockSort,
} from '../../helpers/stockView.helper';

const money = (value: number | null) =>
	value === null
		? '—'
		: value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
const quantity = (value: number) =>
	value.toLocaleString('tr-TR', { maximumFractionDigits: 6 });
const listPrice = (p: StockPosition) =>
	p.listPurchasePrices?.length
		? p.listPurchasePrices
				.map((price) =>
					price.unitPrice === null
						? 'Girilmedi'
						: price.unitPrice.toLocaleString('tr-TR', {
								style: 'currency',
								currency: price.currency,
							}) + (price.hasExceptions ? ' (modele göre istisnalar var)' : ''),
				)
				.join(' / ')
		: 'Girilmedi';

function StockTable({
	initialState,
	...props
}: ComponentProps<typeof InventoryDataGrid>) {
	// AG Grid reads this once. Apply the saved state when the table is reopened.
	const [restoredState] = useState(initialState);
	return <InventoryDataGrid {...props} initialState={restoredState} />;
}

export function CurrentStockInventory({
	positions,
}: {
	positions: StockPosition[];
}) {
	const [productType, setProductType] = useState<StockPosition['type'] | 'all'>(
		'all',
	);
	const [sort, setSort] = useState<StockSort>('type');
	const [view, setView] = useState<'blocks' | 'table'>('blocks');
	const [gridState, setGridState] = useState<GridState>();
	const apiRef = useRef<GridApi | null>(null);
	const [gridResult, setGridResult] = useState<{
		source: string;
		rows: StockPosition[];
	}>();
	const visiblePositions = useMemo(
		() =>
			sortStockPositions(
				positions.filter(
					(p) => productType === 'all' || p.type === productType,
				),
				sort,
			),
		[positions, productType, sort],
	);
	const source = JSON.stringify(visiblePositions);
	const displayedPositions =
		view === 'table' && gridResult?.source === source
			? gridResult.rows
			: visiblePositions;
	const typeSummaries = summarizeStock(displayedPositions);
	const quantityTotals = (['piece', 'kg'] as const)
		.filter((unit) =>
			displayedPositions.some((position) => position.quantityUnit === unit),
		)
		.map((unit) => ({
			unit,
			quantity: displayedPositions
				.filter((position) => position.quantityUnit === unit)
				.reduce((sum, position) => sum + position.quantity, 0),
		}));
	const currencies = useMemo(
		() =>
			[
				...new Set([
					'TRY',
					...positions.flatMap((p) =>
						(p.listPurchasePrices ?? []).map((price) => price.currency),
					),
				]),
			].sort(),
		[positions],
	);
	const activeColumns = Object.keys(
		gridState?.filter?.filterModel ?? {},
	).length;
	const columns = useMemo<ColDef[]>(
		() => [
			{
				field: 'type',
				headerName: 'Ürün türü',
				width: 140,
				minWidth: 125,
				filter: 'agTextColumnFilter',
				floatingFilter: true,
				valueGetter: (p) =>
					p.data
						? PURCHASE_PRODUCT_TYPES[p.data.type as StockPosition['type']].label
						: '',
				cellRenderer: ({ data }: ICellRendererParams<StockPosition>) =>
					data && <StockProductTag type={data.type} compact />,
			},
			{
				field: 'memoryGb',
				headerName: 'Bellek (GB)',
				width: 135,
				minWidth: 120,
				filter: 'agNumberColumnFilter',
				floatingFilter: true,
				valueFormatter: (p) => (p.value == null ? '—' : quantity(p.value)),
			},
			{
				field: 'quantity',
				headerName: 'Stok miktarı',
				width: 150,
				minWidth: 140,
				filter: 'agNumberColumnFilter',
				floatingFilter: true,
				cellRenderer: ({ data }: ICellRendererParams<StockPosition>) =>
					data && (
						<span className={data.quantity === 0 ? 'stock-text-loss' : ''}>
							<StockQuantity
								value={quantity(data.quantity)}
								unit={PURCHASE_QUANTITY_UNIT_LABELS[data.quantityUnit]}
							/>
						</span>
					),
			},
			{
				field: 'quantityUnit',
				headerName: 'Birim',
				width: 100,
				minWidth: 95,
				filter: 'agTextColumnFilter',
				floatingFilter: true,
				valueGetter: (p) =>
					p.data
						? PURCHASE_QUANTITY_UNIT_LABELS[
								p.data.quantityUnit as StockPosition['quantityUnit']
							]
						: '',
			},
			...currencies.map<ColDef>((currency) => ({
				colId: 'listPrice-' + currency,
				headerName: 'Liste alış (' + currency + ')',
				width: 170,
				minWidth: 150,
				filter: 'agNumberColumnFilter',
				floatingFilter: true,
				valueGetter: (p) =>
					p.data?.listPurchasePrices?.find(
						(price: StockPosition['listPurchasePrices'][number]) =>
							price.currency === currency,
					)?.unitPrice ?? null,
				valueFormatter: (p) =>
					p.value == null
						? '—'
						: p.value.toLocaleString('tr-TR', { style: 'currency', currency }) +
							(p.data?.listPurchasePrices?.some(
								(price: StockPosition['listPurchasePrices'][number]) =>
									price.currency === currency && price.hasExceptions,
							)
								? ' *'
								: ''),
				tooltipValueGetter: (p) =>
					p.data?.listPurchasePrices?.some(
						(price: StockPosition['listPurchasePrices'][number]) =>
							price.currency === currency && price.hasExceptions,
					)
						? 'Modele göre fiyat istisnaları var.'
						: '',
			})),
			{
				field: 'averagePurchaseCost',
				headerName: 'Ort. gerçek alış (TL)',
				width: 185,
				minWidth: 165,
				filter: 'agNumberColumnFilter',
				floatingFilter: true,
				valueFormatter: (p) => money(p.value ?? null),
				cellClass: 'font-medium stock-text-cost',
			},
			{
				field: 'averageSellingPrice',
				headerComponent: () => (
					<span className='inline-flex items-center gap-1'>
						Ort. gerçek satış fiyatı <StockSellingPriceInfo />
					</span>
				),
				headerName: 'Ort. gerçek satış (TL)',
				width: 185,
				minWidth: 165,
				filter: 'agNumberColumnFilter',
				floatingFilter: true,
				valueFormatter: (p) => money(p.value ?? null),
				cellClass: 'font-medium stock-text-income',
			},
			{
				colId: 'stockCost',
				headerName: 'Toplam stok maliyeti (TL)',
				width: 205,
				minWidth: 190,
				filter: 'agNumberColumnFilter',
				floatingFilter: true,
				valueGetter: (p) => (p.data ? stockValue(p.data) : null),
				valueFormatter: (p) => money(p.value ?? null),
				cellClass: 'font-semibold stock-text-cost',
			},
		],
		[currencies],
	);
	return (
		<details open aria-label='Mevcut stok' className='min-w-0 space-y-3'>
			<AdminSummary index={0} className='flex-wrap'>
				<Package size={17} aria-hidden />
				<span className='min-w-0 flex-1'>Mevcut stok · Tüm bayiler</span>
				<span className='ml-auto inline-flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums'>
					{quantityTotals.map((total) => (
						<span key={total.unit}>
							{quantity(total.quantity)}{' '}
							{PURCHASE_QUANTITY_UNIT_LABELS[total.unit]}
						</span>
					))}
				</span>
			</AdminSummary>
			<p className='text-xs text-text/70'>
				Alım tarihi ve bayi filtreleri güncel stok toplamlarını değiştirmez.
				Maliyet aynı ürün ve boyut için tüm bayilerin ağırlıklı ortalamasıdır;
				adet ve ağırlık ayrı tutulur. Ortalama gerçek satış fiyatı yukarıdaki
				rapor filtrelerine uyan satışlardan hesaplanır.
			</p>
			<div className='flex min-w-0 flex-wrap items-center justify-between gap-3'>
				<div
					role='group'
					aria-label='Stok ürün türü filtreleri'
					className='flex flex-wrap gap-1.5'
				>
					{(['all', ...PURCHASE_PRODUCT_TYPE_ORDER] as const).map((type) => (
						<button
							key={type}
							type='button'
							aria-pressed={productType === type}
							onClick={() => setProductType(type)}
							className={
								'inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-xs font-medium ' +
								(type === 'all'
									? productType === 'all'
										? 'border-text bg-text text-bg'
										: 'border-border bg-button-bg'
									: STOCK_PRODUCT_COLORS[type]) +
								(productType === type && type !== 'all'
									? ' ring-2 ring-current ring-offset-1 ring-offset-bg'
									: '')
							}
						>
							{type === 'all' ? (
								<span className='inline-flex items-center gap-1.5'>
									<Layers size={14} aria-hidden />
									Tümü
								</span>
							) : (
								PURCHASE_PRODUCT_TYPES[type].label
							)}
						</button>
					))}
				</div>
				<div
					role='group'
					aria-label='Stok görünümü'
					className='inline-flex shrink-0 gap-1 rounded-full border border-border bg-button-bg p-1'
				>
					{(
						[
							['blocks', 'Blok', Rows3],
							['table', 'Tablo', Table2],
						] as const
					).map(([value, label, Icon]) => (
						<button
							key={value}
							type='button'
							aria-pressed={view === value}
							className={
								'inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ' +
								(view === value
									? 'bg-text text-bg shadow-sm'
									: 'text-text/70 hover:bg-button-hover-bg')
							}
							onClick={() => setView(value)}
						>
							<Icon size={15} aria-hidden />
							{label}
						</button>
					))}
				</div>
			</div>
			<div className='flex min-w-0 flex-wrap items-center justify-between gap-2'>
				<p className='text-xs text-text/70' role='status'>
					{displayedPositions.length} ürün kaydı
					{view === 'table' && activeColumns > 0
						? ' · ' + activeColumns + ' sütun filtresi etkin'
						: ''}
				</p>
				{view === 'blocks' ? (
					<label className='flex items-center gap-2 text-xs'>
						Sırala
						<select
							aria-label='Stok sıralaması'
							className={STOCK_CONTROL + ' w-auto!'}
							value={sort}
							onChange={(e) => setSort(e.target.value as StockSort)}
						>
							<option value='type'>Ürün türü ve boyut</option>
							<option value='size-asc'>Hafıza Boyutu · Küçükten büyüğe</option>
							<option value='size-desc'>Hafıza Boyutu · Büyükten küçüğe</option>
							<option value='quantity-desc'>Miktar · Çoktan aza</option>
							<option value='quantity-asc'>Miktar · Azdan çoğa</option>
							<option value='cost-desc'>
								Toplam maliyet · Yüksekten düşüğe
							</option>
							<option value='cost-asc'>
								Toplam maliyet · Düşükten yükseğe
							</option>
						</select>
					</label>
				) : (
					<button
						type='button'
						className={STOCK_BUTTON + ' gap-1.5'}
						disabled={!activeColumns}
						onClick={() => apiRef.current?.setFilterModel(null)}
					>
						<FilterX size={14} aria-hidden />
						Tablo filtrelerini temizle
					</button>
				)}
			</div>
			<div
				className='flex flex-wrap gap-2'
				aria-label='Ürün türü stok toplamları'
			>
				{typeSummaries.map((summary) => (
					<p
						key={summary.type + ':' + summary.quantityUnit}
						className={
							'max-w-full rounded-lg border px-3 py-2 text-xs ' +
							STOCK_PRODUCT_COLORS[summary.type]
						}
					>
						<span className='font-semibold'>
							{PURCHASE_PRODUCT_TYPES[summary.type].label}
						</span>{' '}
						· {quantity(summary.quantity)}{' '}
						{PURCHASE_QUANTITY_UNIT_LABELS[summary.quantityUnit]} · Toplam
						maliyet:{' '}
						<strong className='tabular-nums'>{money(summary.totalCost)}</strong>
					</p>
				))}
			</div>
			{!positions.length && (
				<p className='text-sm text-text/70'>
					Henüz stok girişi yok. İlk alımı ekleyin.
				</p>
			)}
			{positions.length > 0 && !visiblePositions.length && (
				<p className='text-sm text-text/70'>Bu ürün türünde stok kaydı yok.</p>
			)}
			{view === 'table' ? (
				<div className='min-w-0 space-y-2'>
					<p className='text-xs text-text/70'>
						Başlık altındaki alanlarla ürün, boyut, miktar ve fiyatları
						filtreleyin. Fiyatlar satırın birimi içindir; farklı para
						birimlerindeki liste fiyatları ayrı sütunlardadır.
					</p>
					{positions.some((p) =>
						(p.listPurchasePrices ?? []).some((price) => price.hasExceptions),
					) && (
						<p className='text-xs text-text/70'>
							* Modele göre fiyat istisnaları var.
						</p>
					)}
					<StockTable
						rowData={visiblePositions}
						columnDefs={columns}
						initialState={gridState}
						onStateUpdated={(e) => setGridState(e.state)}
						onModelUpdated={(e) => {
							apiRef.current = e.api;
							const rows: StockPosition[] = [];
							e.api.forEachNodeAfterFilterAndSort((node) => {
								if (node.data) rows.push(node.data);
							});
							setGridResult({ source, rows });
						}}
					/>
				</div>
			) : (
				<div className='grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
					{displayedPositions.map((p, index) => (
						<details
							open
							key={p.key}
							className={
								'min-w-0 space-y-3 rounded-xl border p-3 ' +
								STOCK_PRODUCT_COLORS[p.type]
							}
						>
							<AdminSummary index={index} className='flex-wrap'>
								<h4 className='min-w-0 flex-1 font-medium'>
									<StockProductTag type={p.type} memoryGb={p.memoryGb} />
								</h4>
								<span className='ml-auto shrink-0 rounded-md px-1 py-0.5'>
									<StockQuantity
										value={quantity(p.quantity)}
										unit={PURCHASE_QUANTITY_UNIT_LABELS[p.quantityUnit]}
									/>
								</span>
							</AdminSummary>
							{p.quantity === 0 && (
								<p className='w-fit rounded-full border stock-value stock-loss px-2 py-1 text-xs font-medium'>
									Stok yok
								</p>
							)}
							<StockPriceMetrics
								listPrice={listPrice(p)}
								purchasePrice={
									money(p.averagePurchaseCost) +
									' / ' +
									PURCHASE_QUANTITY_UNIT_LABELS[p.quantityUnit]
								}
								sellingPrice={
									money(p.averageSellingPrice ?? null) +
									' / ' +
									PURCHASE_QUANTITY_UNIT_LABELS[p.quantityUnit]
								}
								totalCost={money(stockValue(p))}
							/>
						</details>
					))}
				</div>
			)}
		</details>
	);
}
