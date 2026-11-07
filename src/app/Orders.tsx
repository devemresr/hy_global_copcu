import { TradeRows } from './component/admin/TradeRows';
import type { OrderChartSettings } from './helpers/orderChartSeries.helper';
import { useOrderDraft } from './hooks/useOrderDraft';
import {
	orderDraftKey,
	purchaseDraftSchema,
	type PurchaseDraft,
} from './helpers/orderDraft.helper';
import { orderChoices, orderChoiceKey } from './helpers/orderChoices.helper';
import {
	mergePurchaseInspection,
	warningInputKey,
	type WarningCache,
} from './helpers/purchaseWarnings.helper';
import { AdminSummary } from './component/admin/AdminCollapseHeading';
import {
	STOCK_BUTTON,
	STOCK_NUMBER_CONTROL,
	STOCK_STEPPER,
} from './constants/stockStyles.constant';
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type SetStateAction,
} from 'react';
import { Link } from 'react-router';
import type { ColDef } from 'ag-grid-community';
import { toast } from 'sonner';
import { NumberInputWithSteppers } from './component/NumberInputWithSteppers';
import { InventoryDataGrid } from './component/InventoryDataGrid';
import { Pagination } from './component/admin/Pagination';
import { OrderCharts } from './component/admin/OrderCharts';
import { OrderHistoryFilters } from './component/admin/OrderHistoryFilters';
import { CreatedOrderPdfModal } from './component/admin/CreatedOrderPdfModal';
import { OrderReportPdfModal } from './component/admin/OrderReportPdfModal';
import { BayiPicker } from './component/admin/BayiPicker';
import { OrderProductSelect } from './component/admin/OrderProductSelect';
import {
	ORDER_PRODUCT_TYPES,
	ORDER_QUANTITY_UNIT_LABELS,
} from './constants/orderProducts.constant';
import {
	formatOrderProduct,
	formatOrderQuantity,
	formatOrderUnitTotals,
} from './helpers/orderProduct.helper';
import { PAGE_PATHS } from './constants/pagePaths.constant';
import { usePurchaseWarnings } from './hooks/api/endpoints/useStock';
import { createOrderSchema } from './schemas/order.schema';

import { useLogout } from './hooks/api/endpoints/useAuth';
import {
	useCreateOrder,
	useOrderPricing,
	useOrders,
	type Order,
	type OrdersResponse,
	type OrderFilters,
	type OrderLine,
	type SavedOrderLine,
} from './hooks/api/endpoints/useOrders';

type DraftLine = PurchaseDraft['lines'][number];
const money = (n: number) =>
	n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

const button = STOCK_BUTTON;
const initialLine = (
	id: number,
	type: OrderLine['type'] = 'EMCP',
): DraftLine => ({
	id,
	type,
	quantity: 1,
	memoryGb: ORDER_PRODUCT_TYPES[type].requiresMemorySize ? 8 : null,
	requiresMemorySize: ORDER_PRODUCT_TYPES[type].requiresMemorySize,
	quantityUnit: 'piece',
	unitPriceOverride: null,
	totalPriceOverride: null,
});

export default function OrdersPage() {
	// A protected request verifies the session before displaying any order UI.
	const pricing = useOrderPricing();
	const logout = useLogout();
	const save = useCreateOrder();
	const [warningCache, setWarningCache] = useState<WarningCache>({});
	const purchaseWarnings = usePurchaseWarnings((response, input) =>
		setWarningCache((current) =>
			mergePurchaseInspection(current, input, response),
		),
	);
	const submittingRef = useRef(false);
	const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const draft = useOrderDraft<PurchaseDraft>(
		orderDraftKey('purchase'),
		purchaseDraftSchema,
		() => ({ lines: [initialLine(0)], nextId: 1, bayiId: '' }),
		'alış',
		pricing.isSuccess,
	);
	const { lines, nextId, bayiId } = draft.value;
	const comparisonDays = draft.value.comparisonDays ?? 30;
	const [comparisonInput, setComparisonInput] = useState<number | ''>(
		comparisonDays,
	);
	const [syncedComparison, setSyncedComparison] = useState(comparisonDays);
	if (syncedComparison !== comparisonDays) {
		setSyncedComparison(comparisonDays);
		setComparisonInput(comparisonDays);
	}
	const comparisonValid =
		typeof comparisonInput === 'number' &&
		Number.isInteger(comparisonInput) &&
		comparisonInput >= 1 &&
		comparisonInput <= 36500;
	const setLines = (action: SetStateAction<DraftLine[]>) =>
		draft.setValue((current) => ({
			...current,
			lines: typeof action === 'function' ? action(current.lines) : action,
		}));
	const setBayiId = (value: string) =>
		draft.setValue((current) => ({ ...current, bayiId: value }));
	const [collapsedRows, setCollapsedRows] = useState<Set<number>>(
		() => new Set(),
	);
	const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
	const [rowPdfOrder, setRowPdfOrder] = useState<Order | null>(null);
	const [excludedOrderIds, setExcludedOrderIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [historyPdf, setHistoryPdf] = useState<{
		data: OrdersResponse;
		filters: OrderFilters;
		settings?: OrderChartSettings;
	} | null>(null);
	const [filters, setFilters] = useState<OrderFilters>({});
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [historyOpen, setHistoryOpen] = useState(false);
	const history = useOrders(
		filters,
		page,
		pageSize,
		pricing.isSuccess && historyOpen,
	);
	const excludedIds = useMemo(
		() => [...excludedOrderIds].sort(),
		[excludedOrderIds],
	);
	const matchingIds =
		history.data?.timeline?.map((order) => order._id) ??
		history.data?.orders.map((order) => order._id) ??
		[];
	const selectedCount = Math.max(
		0,
		(history.data?.summary.count ?? 0) -
			matchingIds.filter((id) => excludedOrderIds.has(id)).length,
	);
	const selectedHistory = useOrders(
		filters,
		1,
		1,
		pricing.isSuccess &&
			historyOpen &&
			excludedIds.length > 0 &&
			selectedCount > 0,
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
	const prices = pricing.data?.prices;
	const productTypes = pricing.data?.productTypes ?? ORDER_PRODUCT_TYPES;
	const choices = orderChoices(productTypes, pricing.data?.memorySizes);
	const unusedChoice = choices.find(
		(choice) =>
			!lines.some((line) => orderChoiceKey(line) === orderChoiceKey(choice)),
	);
	function addLine() {
		draft.setValue((current) => {
			const choice = choices.find(
				(candidate) =>
					!current.lines.some(
						(line) => orderChoiceKey(line) === orderChoiceKey(candidate),
					),
			);
			return choice
				? {
						...current,
						nextId: current.nextId + 1,
						lines: [
							...current.lines,
							{ ...initialLine(current.nextId, choice.type), ...choice },
						],
					}
				: current;
		});
	}
	function resetRows() {
		draft.clear({
			lines: [initialLine(nextId)],
			nextId: nextId + 1,
			bayiId,
			comparisonDays,
		});
		setCollapsedRows(new Set());
	}
	const listPrice = (line: DraftLine) =>
		line.quantityUnit === 'piece' && line.memoryGb !== null
			? prices?.[line.type]?.[String(line.memoryGb)]
			: undefined;
	const effectivePrice = (line: DraftLine) =>
		line.totalPriceOverride !== null
			? typeof line.totalPriceOverride === 'number' && Number(line.quantity) > 0
				? line.totalPriceOverride / Number(line.quantity)
				: undefined
			: line.unitPriceOverride === null
				? listPrice(line)
				: line.unitPriceOverride;
	const totals = lines.map((line) => {
		const price = effectivePrice(line);
		return typeof price === 'number' &&
			Number.isFinite(price) &&
			price >= 0 &&
			price <= 1_000_000 &&
			(line.quantityUnit !== 'piece' || Number.isSafeInteger(line.quantity)) &&
			Number.isFinite(Number(line.quantity)) &&
			Number(line.quantity) > 0 &&
			Number(line.quantity) <= 1_000_000
			? typeof line.totalPriceOverride === 'number'
				? line.totalPriceOverride
				: Math.round(price * Number(line.quantity) * 100) / 100
			: null;
	});
	const complete = lines.length > 0 && totals.every((n) => n !== null);
	const warningPayload = JSON.stringify({
		comparisonDays,
		bayiId,
		lines: lines.flatMap((line) => {
			const unitPrice = effectivePrice(line);
			return typeof unitPrice === 'number' &&
				Number.isFinite(unitPrice) &&
				unitPrice >= 0 &&
				unitPrice <= 1_000_000 &&
				Number(line.quantity) > 0
				? [
						{
							type: line.type,
							memoryGb: line.memoryGb,
							quantityUnit: line.quantityUnit,
							unitPrice: Math.round(unitPrice * 1000000) / 1000000,
							quantity: Number(line.quantity),
						},
					]
				: [];
		}),
	});
	const checkWarnings = purchaseWarnings.mutate;
	const warningEntries = (
		JSON.parse(warningPayload).lines as Parameters<typeof warningInputKey>[1][]
	).map((line) => warningCache[warningInputKey(bayiId, line, comparisonDays)]);
	const warningStatus = {
		risks: warningEntries.flatMap((entry) => (entry?.risk ? [entry.risk] : [])),
		missingPrices: warningEntries.flatMap((entry) =>
			entry?.missingPrice ? [entry.missingPrice] : [],
		),
	};
	useEffect(() => {
		if (
			!comparisonValid ||
			!/^[a-f\d]{24}$/i.test(bayiId) ||
			!JSON.parse(warningPayload).lines.length
		)
			return;
		const timer = setTimeout(
			() => checkWarnings(JSON.parse(warningPayload)),
			600,
		);
		warningTimerRef.current = timer;
		return () => clearTimeout(timer);
	}, [bayiId, warningPayload, checkWarnings, comparisonValid]);
	const total =
		Math.round(totals.reduce<number>((s, n) => s + (n ?? 0), 0) * 100) / 100;
	async function saveOrder() {
		if (submittingRef.current) return;
		if (!comparisonValid) {
			toast.error(
				'Karşılaştırma süresi 1–36500 gün arasında tam sayı olmalıdır.',
			);
			return;
		}
		const parsed = createOrderSchema.safeParse({
			comparisonDays,
			bayiId,
			lines: lines.map((line) => ({
				type: line.type,
				memoryGb: line.memoryGb,
				quantityUnit: line.quantityUnit,
				quantity: Number(line.quantity),
				...(typeof line.totalPriceOverride === 'number'
					? { totalPriceOverride: line.totalPriceOverride }
					: {}),
				...(line.totalPriceOverride === null &&
				typeof line.unitPriceOverride === 'number'
					? { unitPriceOverride: line.unitPriceOverride }
					: {}),
			})),
		});
		if (!parsed.success) {
			toast.error(parsed.error.issues[0].message);
			return;
		}
		submittingRef.current = true;
		if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
		try {
			await purchaseWarnings.mutateAsync(JSON.parse(warningPayload));
		} catch (failure) {
			submittingRef.current = false;
			toast.error('Alım fiyatı kontrol edilemedi', {
				description: (failure as Error).message,
			});
			return;
		}
		save.mutate(parsed.data, {
			onSettled: () => {
				submittingRef.current = false;
			},
			onSuccess: ({ order }) => {
				setCreatedOrder(order);
				setCollapsedRows(new Set());
				draft.clear({
					lines: [initialLine(nextId)],
					nextId: nextId + 1,
					comparisonDays,
					bayiId,
				});
				setWarningCache({});
				setPage(1);
				toast.success('Alış kaydedildi');
			},
			onError: (error) =>
				toast.error('Alış kaydedilemedi', { description: error.message }),
		});
	}
	function changeHistoryFilters(next: OrderFilters) {
		setFilters(next);
		setPage(1);
		setExcludedOrderIds(new Set());
	}
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
				cellRenderer: ({ data }: { data: Order }) => (
					<div className='flex h-full items-center gap-3'>
						<input
							type='checkbox'
							aria-label={`${data.name || data._id} rapora dahil et`}
							checked={!excludedOrderIds.has(data._id)}
							disabled={history.isFetching}
							onClick={(event) => event.stopPropagation()}
							onChange={(event) => {
								const checked = event.target.checked;
								setExcludedOrderIds((current) => {
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
								setRowPdfOrder(data);
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
				valueGetter: ({ data }) => data?.name || data?._id,
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
							(l: OrderLine) =>
								`${formatOrderProduct(l)} × ${formatOrderQuantity(l.quantity, l.quantityUnit)}`,
						)
						.join(', '),
				tooltipValueGetter: ({ value }) => value,
				filter: 'agTextColumnFilter',
			},
			{
				colId: 'quantity',
				headerName: 'Miktar',
				width: 180,
				valueGetter: ({ data }) => formatOrderUnitTotals(data),
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
							(line: SavedOrderLine) =>
								typeof line.originalUnitPrice === 'number' &&
								line.originalUnitPrice !== line.unitPrice,
						)
						.map(
							(line: SavedOrderLine) =>
								`${formatOrderProduct(line)}: ${money(line.originalUnitPrice!)} → ${money(line.unitPrice)} (${money(line.priceAdjustment ?? 0)} / ${ORDER_QUANTITY_UNIT_LABELS[line.quantityUnit ?? 'piece']})`,
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
		[excludedOrderIds, history.isFetching],
	);
	if (pricing.isPending)
		return (
			<p className='p-6 text-text' role='status'>
				Oturum kontrol ediliyor...
			</p>
		);
	if (pricing.isError)
		return (
			<div className='p-6 text-text' role='alert'>
				<p>
					{pricing.error.status === 401
						? 'Devam etmek için giriş yapın.'
						: `Fiyatlar yüklenemedi: ${pricing.error.message}`}
				</p>
				<Link to={PAGE_PATHS.LOGIN} className='underline'>
					Giriş yap
				</Link>{' '}
				<button className={button} onClick={() => void pricing.refetch()}>
					Tekrar dene
				</button>
			</div>
		);
	return (
		<div className='mx-auto w-full min-w-0 max-w-7xl space-y-4 px-3 py-4 text-text sm:space-y-6 sm:px-6 sm:py-6'>
			{createdOrder && (
				<CreatedOrderPdfModal
					order={createdOrder}
					onClose={() => setCreatedOrder(null)}
				/>
			)}
			{historyPdf && (
				<OrderReportPdfModal
					data={historyPdf.data}
					filters={historyPdf.filters}
					settings={historyPdf.settings}
					onClose={() => setHistoryPdf(null)}
				/>
			)}
			{rowPdfOrder && (
				<CreatedOrderPdfModal
					order={rowPdfOrder}
					mode='existing'
					onClose={() => setRowPdfOrder(null)}
				/>
			)}
			<header className='flex flex-wrap items-center justify-between gap-3'>
				<div>
					<Link className='text-sm underline' to={PAGE_PATHS.ADMIN}>
						Yönetim
					</Link>
					<Link className='ml-4 text-sm underline' to={PAGE_PATHS.STOCK}>
						Stok
					</Link>
					<Link className='ml-4 text-sm underline' to={PAGE_PATHS.SALES}>
						Satış
					</Link>
					<Link className='ml-4 text-sm underline' to={PAGE_PATHS.BALANCE}>
						Bakiye
					</Link>
					<h1 className='mt-2 text-2xl font-semibold'>Alışlar</h1>
				</div>
				<button
					className={button}
					disabled={logout.isPending}
					onClick={() => logout.mutate()}
				>
					Çıkış yap
				</button>
			</header>
			<section
				className='min-w-0 rounded-2xl border border-border p-3 sm:p-6'
				aria-labelledby='new-order'
			>
				<h2 id='new-order' className='mb-4 text-lg font-semibold'>
					Yeni alış
				</h2>
				<BayiPicker
					value={bayiId}
					onChange={setBayiId}
					disabled={save.isPending}
				/>
				{draft.restoredAt && (
					<p
						role='status'
						className='mb-3 rounded-lg bg-sky-500/10 px-3 py-2 text-xs'
					>
						{new Date(draft.restoredAt).toLocaleString('tr-TR', {
							timeZone: 'Europe/Istanbul',
						})}{' '}
						tarihli kaydedilmemiş alış verileri yüklendi.
					</p>
				)}
				<label className='mb-3 flex flex-wrap items-center gap-2 text-xs'>
					Zarar kontrolü · son kaç günün satışları?
					<NumberInputWithSteppers
						id='purchase-comparison-days'
						ariaLabel='Satış karşılaştırma süresi (gün)'
						disableWheel
						value={comparisonInput}
						steppers={[
							{ amount: 1, label: '+1' },
							{ amount: 7, label: '+7' },
						]}
						onChange={(change) => {
							const next =
								typeof change === 'function' ? change(comparisonInput) : change;
							setComparisonInput(next);
							if (
								typeof next === 'number' &&
								Number.isInteger(next) &&
								next >= 1 &&
								next <= 36500
							)
								draft.setValue((current) => ({
									...current,
									comparisonDays: next,
								}));
						}}
						className={STOCK_NUMBER_CONTROL}
						stepperClassName={STOCK_STEPPER}
					/>
					<span>gün (1–36500)</span>
				</label>
				{!comparisonValid && (
					<p role='alert' className='mb-3 text-xs text-red-500'>
						1–36500 arasında tam gün sayısı girin.
					</p>
				)}
				{Boolean(warningStatus?.risks?.length) && (
					<div
						role='status'
						className='mb-3 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
					>
						<p className='font-medium'>Alış fiyatında zarar riski</p>
						{warningStatus!.risks!.map((risk) => (
							<p key={risk.productKey}>{risk.message}</p>
						))}
						<p className='text-xs'>
							Bildirim bu alım döngüsünde bir kez gösterilir. Risk, fiyatlar
							düzeltilene kadar burada görünür.
						</p>
					</div>
				)}
				{Boolean(warningStatus?.missingPrices?.length) && (
					<p role='status' className='mb-3 text-xs text-text/70'>
						Son {comparisonDays} günde satış olmadığı için zarar kontrolü
						yapılamıyor: {warningStatus!.missingPrices!.join(', ')}. Yalnızca bu
						dönemdeki satışların ağırlıklı ortalama fiyatı kullanılır.
					</p>
				)}
				{purchaseWarnings.isError && (
					<p role='alert' className='mb-3 text-sm text-red-500'>
						Alış fiyatı kontrol edilemedi: {purchaseWarnings.error.message}.
						Kaydederken tekrar kontrol edilecek.
					</p>
				)}
				<TradeRows
					lines={lines}
					disabled={save.isPending}
					collapsedRows={collapsedRows}
					onToggle={(id) =>
						setCollapsedRows((current) => {
							const next = new Set(current);
							if (next.has(id)) next.delete(id);
							else next.add(id);
							return next;
						})
					}
					onRemove={(id) =>
						setLines((current) => current.filter((row) => row.id !== id))
					}
					onAdd={addLine}
					canAdd={Boolean(unusedChoice)}
					totals={totals}
					listPrice={listPrice}
					effectivePrice={effectivePrice}
					onUpdate={(id, patch) =>
						setLines((current) =>
							current.map((row) =>
								row.id === id
									? {
											...row,
											...patch,
											...(patch.quantityUnit
												? {
														unitPriceOverride: null,
														totalPriceOverride: null,
														quantity:
															patch.quantityUnit === 'piece' &&
															!Number.isInteger(row.quantity)
																? 1
																: row.quantity,
													}
												: {}),
										}
									: row,
							),
						)
					}
					productInput={(line, index) => (
						<OrderProductSelect
							className='h-9!'
							value={line}
							rowNumber={index + 1}
							id={'type-' + line.id}
							disabled={save.isPending}
							productTypes={productTypes}
							memorySizes={pricing.data?.memorySizes}
							excluded={lines.filter((row) => row.id !== line.id)}
							onChange={(product) =>
								setLines((current) =>
									current.map((row) =>
										row.id === line.id
											? {
													...row,
													...product,
													quantityUnit: product.requiresMemorySize
														? 'piece'
														: row.quantityUnit,
													quantity:
														product.requiresMemorySize &&
														!Number.isInteger(row.quantity)
															? 1
															: row.quantity,
													unitPriceOverride: null,
													totalPriceOverride: null,
												}
											: row,
									),
								)
							}
						/>
					)}
				/>

				<div className='mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-button-bg p-3 font-semibold text-text'>
					<span>Genel toplam</span>
					<span aria-live='polite' className='break-all text-lg tabular-nums'>
						{complete ? money(total) : 'Eksik bilgi'}
					</span>
				</div>

				<div className='mt-4 flex flex-wrap items-center gap-3'>
					<button
						className={`${button} font-semibold`}
						disabled={
							!comparisonValid ||
							!complete ||
							!bayiId ||
							save.isPending ||
							purchaseWarnings.isPending
						}
						onClick={saveOrder}
					>
						{save.isPending ? 'Kaydediliyor...' : 'Alışı kaydet'}
					</button>
					<button
						type='button'
						className={`${button} ml-auto`}
						disabled={save.isPending}
						onClick={resetRows}
					>
						Satırları sıfırla
					</button>
				</div>
				{save.error && (
					<p role='alert' className='mt-3 text-red-500'>
						{save.error.message}
					</p>
				)}
			</section>
			<details
				className='min-w-0 max-w-full rounded-2xl border border-border p-3 sm:p-4'
				aria-labelledby='order-history'
				open={historyOpen}
				onToggle={(event) => setHistoryOpen(event.currentTarget.open)}
			>
				<AdminSummary>
					<span id='order-history'>Alış geçmişi · Filtrele ve görüntüle</span>
				</AdminSummary>
				{historyOpen && (
					<div className='mt-4 min-w-0 space-y-4'>
						<OrderHistoryFilters
							value={filters}
							onChange={changeHistoryFilters}
						/>
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
								<div className='flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-button-bg/40 p-3'>
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
												setExcludedOrderIds(
													event.target.checked
														? new Set()
														: new Set(matchingIds),
												)
											}
										/>
										<span>Filtreye uyan tüm alışları rapora dahil et</span>
									</label>
									<button
										type='button'
										className={button}
										disabled={
											reportRefreshing || !reportData || selectedCount === 0
										}
										onClick={() => {
											if (reportData)
												setHistoryPdf({
													data: reportData,
													filters: { ...filters },
												});
										}}
									>
										Seçilenleri tek PDF olarak indir ({selectedCount})
									</button>
									<p className='text-xs' role='status'>
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
											formatOrderUnitTotals(history.data.summary),
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
									<OrderCharts
										onOpenPdf={(settings) => {
											if (!reportRefreshing && reportData.summary.count > 0)
												setHistoryPdf({
													data: reportData,
													settings,
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
		</div>
	);
}
