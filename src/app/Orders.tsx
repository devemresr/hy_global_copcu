import { Trash2 } from 'lucide-react';
import {
	AdminCollapseButton,
	AdminSummary,
} from './component/admin/AdminCollapseHeading';
import {
	STOCK_CONTROL,
	STOCK_BUTTON,
	STOCK_NUMBER_CONTROL,
	STOCK_STEPPER,
} from './constants/stockStyles.constant';
import {
	Fragment,
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
import { OrderUnitPriceInput } from './component/admin/OrderUnitPriceInput';
import { CreatedOrderPdfModal } from './component/admin/CreatedOrderPdfModal';
import { OrderReportPdfModal } from './component/admin/OrderReportPdfModal';
import { BayiPicker } from './component/admin/BayiPicker';
import { OrderProductSelect } from './component/admin/OrderProductSelect';
import {
	ORDER_PRODUCT_TYPES,
	ORDER_QUANTITY_UNIT_LABELS,
	type OrderQuantityUnit,
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

type DraftLine = {
	id: number;
	type: OrderLine['type'];
	quantity: number | '';
	memoryGb: number | null;
	requiresMemorySize: boolean;
	quantityUnit: OrderQuantityUnit;
	unitPriceOverride: number | '' | null;
};
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
});

export default function OrdersPage() {
	// A protected request verifies the session before displaying any order UI.
	const pricing = useOrderPricing();
	const logout = useLogout();
	const save = useCreateOrder();
	const purchaseWarnings = usePurchaseWarnings();
	const submittingRef = useRef(false);
	const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [lines, setLines] = useState<DraftLine[]>([initialLine(0)]);
	const [collapsedRows, setCollapsedRows] = useState<Set<number>>(
		() => new Set(),
	);
	const [nextId, setNextId] = useState(1);
	const [bayiId, setBayiId] = useState('');
	const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
	const [rowPdfOrder, setRowPdfOrder] = useState<Order | null>(null);
	const [excludedOrderIds, setExcludedOrderIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [historyPdf, setHistoryPdf] = useState<{
		data: OrdersResponse;
		filters: OrderFilters;
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
	const listPrice = (line: DraftLine) =>
		line.quantityUnit === 'piece' && line.memoryGb !== null
			? prices?.[line.type]?.[String(line.memoryGb)]
			: undefined;
	const totals = lines.map((line) => {
		const originalPrice = listPrice(line);
		const price =
			line.unitPriceOverride === null ? originalPrice : line.unitPriceOverride;
		return typeof price === 'number' &&
			Number.isFinite(price) &&
			price >= 0 &&
			price <= 1_000_000 &&
			(line.quantityUnit !== 'piece' || Number.isSafeInteger(line.quantity)) &&
			Number.isFinite(Number(line.quantity)) &&
			Number(line.quantity) > 0 &&
			Number(line.quantity) <= 1_000_000
			? Math.round(price * Number(line.quantity) * 100) / 100
			: null;
	});
	const complete = lines.length > 0 && totals.every((n) => n !== null);
	const warningPayload = JSON.stringify({
		bayiId,
		lines: lines.flatMap((line) => {
			const unitPrice =
				line.unitPriceOverride === null
					? listPrice(line)
					: line.unitPriceOverride;
			return typeof unitPrice === 'number' &&
				Number.isFinite(unitPrice) &&
				unitPrice >= 0 &&
				unitPrice <= 1_000_000
				? [
						{
							type: line.type,
							memoryGb: line.memoryGb,
							quantityUnit: line.quantityUnit,
							unitPrice,
						},
					]
				: [];
		}),
	});
	const checkWarnings = purchaseWarnings.mutate;
	const warningStatus =
		purchaseWarnings.isSuccess &&
		JSON.stringify(purchaseWarnings.variables) === warningPayload
			? purchaseWarnings.data
			: undefined;
	useEffect(() => {
		if (
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
	}, [bayiId, warningPayload, checkWarnings]);
	const total =
		Math.round(totals.reduce<number>((s, n) => s + (n ?? 0), 0) * 100) / 100;
	function updateNumber(
		id: number,
		key: 'quantity',
		action: SetStateAction<number | ''>,
	) {
		setLines((current) =>
			current.map((line) =>
				line.id === id
					? {
							...line,
							[key]: typeof action === 'function' ? action(line[key]) : action,
						}
					: line,
			),
		);
	}
	async function saveOrder() {
		if (submittingRef.current) return;
		const parsed = createOrderSchema.safeParse({
			bayiId,
			lines: lines.map((line) => ({
				type: line.type,
				memoryGb: line.memoryGb,
				quantityUnit: line.quantityUnit,
				quantity: Number(line.quantity),
				...(typeof line.unitPriceOverride === 'number'
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
				setLines([initialLine(nextId)]);
				setNextId(nextId + 1);
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
						Henüz gerçekleşen satış olmadığı için zarar kontrolü yapılamıyor:{' '}
						{warningStatus!.missingPrices!.join(', ')}. İlk satış kaydından
						sonra gerçekleşen ortalama satış fiyatıyla karşılaştırılır.
					</p>
				)}
				{purchaseWarnings.isError && (
					<p role='alert' className='mb-3 text-sm text-red-500'>
						Alış fiyatı kontrol edilemedi: {purchaseWarnings.error.message}.
						Kaydederken tekrar kontrol edilecek.
					</p>
				)}
				<div className='relative w-full min-w-0 max-w-full'>
					<div className='block w-full min-w-0 text-left text-sm'>
						<div className='block space-y-3'>
							{lines.map((line, index) => (
								<Fragment key={line.id}>
									<div className='block'>
										<div className='block py-1'>
											<AdminCollapseButton
												expanded={!collapsedRows.has(line.id)}
												index={index}
												aria-controls={`order-row-${line.id}`}
												onClick={() =>
													setCollapsedRows((current) => {
														const next = new Set(current);
														if (next.has(line.id)) next.delete(line.id);
														else next.add(line.id);
														return next;
													})
												}
											>
												<span>
													{index + 1}. satır · {formatOrderProduct(line)} ·{' '}
													{formatOrderQuantity(
														Number(line.quantity) || 0,
														line.quantityUnit,
													)}
												</span>
											</AdminCollapseButton>
										</div>
									</div>
									{!collapsedRows.has(line.id) && (
										<div
											id={`order-row-${line.id}`}
											className={`grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 rounded-xl border border-border p-3 md:gap-2 md:p-3 ${line.requiresMemorySize ? 'md:grid-cols-[minmax(8rem,11rem)_max-content_max-content_minmax(5rem,1fr)_2.5rem]' : 'md:grid-cols-[minmax(7rem,10rem)_max-content_4rem_max-content_minmax(5rem,1fr)_2.5rem]'} ${index % 2 === 0 ? 'bg-button-bg/30' : 'bg-button-hover-bg/10'}`}
										>
											<div className='col-span-2 block min-w-0 md:col-span-1'>
												<label
													className='mb-1 block text-[11px] font-medium'
													htmlFor={`type-${line.id}`}
												>
													Ürün
												</label>
												<OrderProductSelect
													className='h-9!'
													value={line}
													rowNumber={index + 1}
													id={`type-${line.id}`}
													disabled={save.isPending}
													productTypes={productTypes}
													memorySizes={pricing.data?.memorySizes}
													onChange={(product) =>
														setLines((current) =>
															current.map((entry) =>
																entry.id === line.id
																	? {
																			...entry,
																			...product,
																			quantityUnit: product.requiresMemorySize
																				? 'piece'
																				: entry.quantityUnit,
																			quantity:
																				product.requiresMemorySize &&
																				!Number.isInteger(entry.quantity)
																					? 1
																					: entry.quantity,
																			unitPriceOverride: null,
																		}
																	: entry,
															),
														)
													}
												/>
											</div>
											<div className='block min-w-0'>
												<label
													className='mb-1 block text-[11px] font-medium'
													htmlFor={`count-${line.id}`}
												>
													Miktar
												</label>
												<NumberInputWithSteppers
													id={`count-${line.id}`}
													ariaLabel={`${index + 1}. satır miktar`}
													value={line.quantity}
													disableWheel
													decimalPlaces={line.quantityUnit === 'piece' ? 0 : 3}
													onChange={(action) =>
														updateNumber(line.id, 'quantity', action)
													}
													disabled={save.isPending}
													steppers={
														line.quantityUnit === 'kg'
															? [
																	{ amount: 0.1, label: '+0,1' },
																	{ amount: 1, label: '+1' },
																]
															: [
																	{ amount: 1, label: '+1' },
																	{ amount: 5, label: '+5' },
																]
													}
													className={STOCK_NUMBER_CONTROL}
													stepperClassName={STOCK_STEPPER}
												/>
											</div>
											{!line.requiresMemorySize && (
												<div className='block min-w-0'>
													<label
														className='mb-1 block text-[11px] font-medium'
														htmlFor={`unit-${line.id}`}
													>
														Birim
													</label>
													<select
														id={`unit-${line.id}`}
														aria-label={`${index + 1}. satır miktar birimi`}
														value={line.quantityUnit}
														disabled={save.isPending}
														className={`${STOCK_CONTROL} w-16 pe-5!`}
														onChange={(event) => {
															const quantityUnit = event.target
																.value as OrderQuantityUnit;
															setLines((current) =>
																current.map((entry) =>
																	entry.id === line.id
																		? {
																				...entry,
																				quantityUnit,
																				quantity:
																					quantityUnit === 'piece' &&
																					!Number.isInteger(entry.quantity)
																						? 1
																						: entry.quantity,
																				unitPriceOverride: null,
																			}
																		: entry,
																),
															);
														}}
													>
														{Object.entries(ORDER_QUANTITY_UNIT_LABELS).map(
															([unit, label]) => (
																<option key={unit} value={unit}>
																	{label}
																</option>
															),
														)}
													</select>
												</div>
											)}
											<div className='col-span-2 block min-w-0 md:col-span-1'>
												<span className='mb-1 block text-[11px] font-medium'>
													Birim fiyat (TL/
													{ORDER_QUANTITY_UNIT_LABELS[line.quantityUnit]})
												</span>
												<OrderUnitPriceInput
													rowNumber={index + 1}
													originalPrice={listPrice(line)}
													quantityUnit={line.quantityUnit}
													value={line.unitPriceOverride}
													disabled={save.isPending}
													onChange={(value) =>
														setLines((current) =>
															current.map((entry) =>
																entry.id === line.id
																	? { ...entry, unitPriceOverride: value }
																	: entry,
															),
														)
													}
												/>
											</div>
											<div className='block min-w-0 break-all text-left font-semibold tabular-nums'>
												<span className='mb-1 block text-[11px] font-normal'>
													Satır tutarı
												</span>
												{totals[index] === null ? '—' : money(totals[index])}
											</div>
											<div className='col-start-2 flex justify-end self-start md:col-auto md:pt-5'>
												<button
													type='button'
													className={button}
													aria-label={`${index + 1}. satırı sil`}
													disabled={save.isPending}
													onClick={() =>
														setLines((current) =>
															current.filter((l) => l.id !== line.id),
														)
													}
												>
													<Trash2 size={16} aria-hidden />
												</button>
											</div>
										</div>
									)}
								</Fragment>
							))}
						</div>
					</div>
				</div>
				<div className='mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-button-bg p-3 font-semibold text-text'>
					<span>Genel toplam</span>
					<span aria-live='polite' className='break-all text-lg tabular-nums'>
						{complete ? money(total) : 'Eksik bilgi'}
					</span>
				</div>

				<div className='mt-4 flex flex-wrap gap-3'>
					<button
						className={button}
						disabled={save.isPending || lines.length >= 200}
						onClick={() => {
							setLines((current) => [...current, initialLine(nextId)]);
							setNextId(nextId + 1);
						}}
					>
						+ Satır ekle
					</button>
					<button
						className={`${button} font-semibold`}
						disabled={
							!complete ||
							!bayiId ||
							save.isPending ||
							purchaseWarnings.isPending
						}
						onClick={saveOrder}
					>
						{save.isPending ? 'Kaydediliyor...' : 'Alışı kaydet'}
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
										onOpenPdf={() => {
											if (!reportRefreshing && reportData.summary.count > 0)
												setHistoryPdf({
													data: reportData,
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
