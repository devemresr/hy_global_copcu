import {
	analysisSearch,
	readAnalysisFilters,
	hasAnalysisFilters,
} from './helpers/analysisUrl.helper';
import { AnalysisOptions } from './component/admin/AnalysisOptions';
import {
	readAnalysisDefaultPeriod,
	saveAnalysisDefaultPeriod,
	analysisDefaultRange,
	type AnalysisDefaultPeriod,
} from './helpers/analysisPreferences.helper';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
	ChartNoAxesCombined,
	ShoppingCart,
	Package,
	Store,
	Wallet,
	ArrowDownToLine,
	ArrowUpFromLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminPageHeading } from './component/admin/AdminPageHeading';
import { ReportFilters } from './component/admin/ReportFilters';
import { PurchaseAnalysisReport } from './component/admin/PurchaseAnalysisReport';
import { BalanceAnalysisReport } from './component/admin/BalanceAnalysisReport';
import { SelectableStockReport } from './component/admin/SelectableStockReport';
import { StockReportFields } from './component/admin/StockReportFields';
import { FinanceReportFields } from './component/admin/FinanceReportFields';
import { useStock, type StockFilters } from './hooks/api/endpoints/useStock';
import {
	useFinance,
	type FinanceFilters,
} from './hooks/api/endpoints/useFinance';
import { numericFieldsFor } from './helpers/numericFilters.helper';
import { STOCK_BUTTON } from './constants/stockStyles.constant';
import { PAGE_PATHS } from './constants/pagePaths.constant';
import type { ReportKind } from './constants/reportKinds.constant';

type AnalysisFilters = StockFilters & FinanceFilters;
const presets = [
	{
		id: 'purchases',
		label: 'Alışlar',
		kind: 'purchase',
		icon: ShoppingCart,
		description:
			'Alış geçmişi, bayi ve ürün dağılımları, seçili alışların PDF raporu.',
	},
	{
		id: 'sales',
		label: 'Satışlar',
		kind: 'stock',
		movementType: 'all-sales',
		icon: ArrowUpFromLine,
		description: 'Satış kayıtları, satış gelirleri ve maliyetleri.',
	},
	{
		id: 'stock',
		label: 'Tüm stok hareketleri',
		kind: 'stock',
		movementType: 'all-movements',
		icon: Package,
		description:
			'Günlere göre alış ve satış işlemleri, bayi dağılımları ve kaynak alışlar.',
	},
	{
		id: 'bayis',
		label: 'Bayi bazlı analiz',
		kind: 'stock',
		movementType: 'all-movements',
		icon: Store,
		description:
			'Bayiye göre alışlar, satışlar, ürün miktarları ve gerçekleşen kâr.',
	},
	{
		id: 'balance',
		label: 'Bakiye',
		kind: 'balance',
		icon: Wallet,
		description: 'Gelir, gider, günlük net hareketler ve işlem sonrası bakiye.',
	},
	{
		id: 'income',
		label: 'Gelirler',
		kind: 'balance',
		direction: 'income',
		icon: ArrowDownToLine,
		description: 'Satışlar, yatırımlar ve eklediğiniz diğer gelir türleri.',
	},
	{
		id: 'expenses',
		label: 'Giderler',
		kind: 'balance',
		direction: 'expense',
		icon: ArrowUpFromLine,
		description: 'Ürün alışları ve eklediğiniz diğer gider türleri.',
	},
] satisfies {
	id: string;
	label: string;
	kind: ReportKind;
	icon: typeof Package;
	description: string;
	movementType?: StockFilters['movementType'];
	direction?: FinanceFilters['direction'];
}[];
type Preset = (typeof presets)[number];
function presetFilters(
	previous: AnalysisFilters,
	preset: Preset,
): AnalysisFilters {
	const numericFilters = previous.numericFilters?.filter((row) =>
		numericFieldsFor(preset.kind).includes(row.field),
	);
	return {
		...(preset.kind === 'purchase' ? { purchaseId: previous.purchaseId } : {}),
		from: previous.from,
		until: previous.until,
		minTotal: previous.minTotal,
		maxTotal: previous.maxTotal,
		numericFilters: numericFilters?.length ? numericFilters : undefined,
		bayiId:
			'direction' in preset && preset.direction === 'income'
				? undefined
				: previous.bayiId,
		bayiIds:
			'direction' in preset && preset.direction === 'income'
				? undefined
				: previous.bayiIds,
		investorId:
			preset.kind === 'balance' &&
			!('direction' in preset && preset.direction === 'expense')
				? previous.investorId
				: undefined,
		...('movementType' in preset
			? {
					movementType: preset.movementType,
					bayiId: previous.bayiId,
				}
			: {}),
		...('direction' in preset ? { direction: preset.direction } : {}),
	};
}
export default function AnalysisPage() {
	const [search, setSearch] = useSearchParams();
	const preset =
		presets.find(
			(p) =>
				p.id ===
				(['profit', 'dealer-stock'].includes(search.get('preset') ?? '')
					? 'bayis'
					: search.get('preset')),
		) ?? presets[2];
	const sourcePurchaseId =
		preset.kind === 'purchase' &&
		/^[a-f\d]{24}$/i.test(search.get('purchaseId') ?? '')
			? search.get('purchaseId')!
			: undefined;
	const [defaultPeriod, setDefaultPeriod] = useState(readAnalysisDefaultPeriod);
	const savedFilters = readAnalysisFilters(search);
	const invalidFilters = hasAnalysisFilters(search) && !savedFilters;
	const filters: AnalysisFilters =
		savedFilters ??
		presetFilters(
			sourcePurchaseId
				? { purchaseId: sourcePurchaseId }
				: analysisDefaultRange(defaultPeriod),
			preset,
		);
	const [page, setPage] = useState(1),
		[pageSize, setPageSize] = useState(20);
	const [previousSearch, setPreviousSearch] = useState(search.toString());
	if (previousSearch !== search.toString()) {
		setPreviousSearch(search.toString());
		setPage(1);
	}
	const view = (
		['movements', 'profits', 'bayi'].includes(search.get('view') ?? '')
			? search.get('view')
			: preset.id === 'bayis'
				? 'bayi'
				: 'movements'
	) as 'movements' | 'profits' | 'bayi';
	const groupBy = search.get('groupBy') === 'memory' ? 'memory' : 'product';
	function setView(next: 'movements' | 'profits' | 'bayi') {
		setSearch(analysisSearch(preset.id, filters, next, groupBy), {
			replace: true,
		});
	}
	function setGroupBy(next: 'product' | 'memory') {
		setSearch(analysisSearch(preset.id, filters, view, next), {
			replace: true,
		});
	}
	const stock = useStock(
		filters,
		page,
		pageSize,
		preset.kind === 'stock' && !invalidFilters,
	);
	const finance = useFinance(
		filters,
		page,
		pageSize,
		preset.kind === 'balance' && !invalidFilters,
	);
	function changeDefaultPeriod(period: AnalysisDefaultPeriod) {
		setDefaultPeriod(period);
		if (!saveAnalysisDefaultPeriod(period))
			toast.error('Varsayılan dönem bu tarayıcıda kaydedilemedi.');
		const range = analysisDefaultRange(period);
		changeFilters({ ...filters, from: range.from, until: range.until });
		setPage(1);
	}
	function changeFilters(next: AnalysisFilters) {
		setSearch(analysisSearch(preset.id, next, view, groupBy), {
			replace: true,
		});
		setPage(1);
	}
	function selectPreset(next: Preset) {
		setSearch(
			analysisSearch(
				next.id,
				presetFilters(filters, next),
				next.id === 'bayis' ? 'bayi' : 'movements',
				groupBy,
			),
		);
		setPage(1);
	}
	const query = preset.kind === 'balance' ? finance : stock;
	return (
		<main className='mx-auto w-full min-w-0 max-w-7xl space-y-4 px-3 py-4 text-text sm:px-6 sm:py-6'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<AdminPageHeading title='Analiz' />
				<button
					type='button'
					className={STOCK_BUTTON}
					onClick={async () => {
						try {
							const url = new URL(window.location.href);
							url.search = analysisSearch(
								preset.id,
								filters,
								view,
								groupBy,
							).toString();
							setSearch(analysisSearch(preset.id, filters, view, groupBy), {
								replace: true,
							});
							await navigator.clipboard.writeText(url.toString());
							toast.success('Filtreli rapor bağlantısı kopyalandı');
						} catch {
							toast.error(
								'Bağlantı kopyalanamadı. Adres çubuğundaki URL’yi kopyalayabilirsiniz.',
							);
						}
					}}
				>
					Rapor bağlantısını kopyala
				</button>
				<div className='flex gap-2'>
					<Link className={STOCK_BUTTON} to={PAGE_PATHS.PURCHASES}>
						Alış
					</Link>
					<Link className={STOCK_BUTTON} to={PAGE_PATHS.SALES}>
						Satış
					</Link>
					<Link className={STOCK_BUTTON} to={PAGE_PATHS.BALANCE}>
						Gelir / gider ekle
					</Link>
				</div>
			</div>
			<AnalysisOptions
				defaultPeriod={defaultPeriod}
				onChange={changeDefaultPeriod}
			/>
			<section
				className='space-y-3 rounded-xl border border-border bg-button-bg/30 p-3 sm:p-4'
				aria-labelledby='analysis-presets'
			>
				<h2
					id='analysis-presets'
					className='flex items-center gap-2 font-semibold'
				>
					<ChartNoAxesCombined size={18} aria-hidden />
					Hazır analizler
				</h2>
				<p className='text-xs text-text/70'>
					Bir başlangıç raporu seçin, ardından aşağıdaki ortak filtrelerle
					sonuçları daraltın. Seçilen filtreler bu seçeneği değiştirirken
					korunur.
				</p>
				<div
					className='flex flex-wrap gap-2'
					role='group'
					aria-label='Analiz hazır raporları'
				>
					{presets.map((item) => {
						const Icon = item.icon;
						return (
							<button
								key={item.id}
								type='button'
								aria-pressed={preset.id === item.id}
								onClick={() => selectPreset(item)}
								className={
									'inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs ' +
									(preset.id === item.id
										? 'border-text bg-text text-bg'
										: 'border-border bg-button-bg hover:bg-button-hover-bg')
								}
							>
								<Icon size={15} aria-hidden />
								{item.label}
							</button>
						);
					})}
				</div>
			</section>
			<div>
				<h2 className='font-semibold'>{preset.label}</h2>
				<p className='text-sm text-text/70'>{preset.description}</p>
			</div>
			<ReportFilters
				key={preset.kind}
				value={filters}
				reportKind={preset.kind}
				defaultPeriod={defaultPeriod}
				onChange={changeFilters}
				categoryGroup={
					finance.data?.categories.find((c) => c._id === filters.categoryId)
						?.group
				}
				categoryName={
					finance.data?.categories.find((c) => c._id === filters.categoryId)
						?.name
				}
			>
				{preset.kind === 'balance' && (
					<FinanceReportFields
						filters={filters}
						categories={finance.data?.categories ?? []}
						onChange={changeFilters}
					/>
				)}
			</ReportFilters>
			{invalidFilters ? (
				<p role='alert' className='text-sm text-red-500'>
					Bağlantıdaki filtreler geçersiz. Filtreleri yeniden seçip uygulayın.
				</p>
			) : preset.kind === 'purchase' ? (
				<PurchaseAnalysisReport
					key={JSON.stringify(filters)}
					filters={filters}
				/>
			) : (
				<>
					{query.isPending && <p role='status'>Analiz yükleniyor...</p>}
					{query.isError && (
						<p role='alert' className='text-red-500'>
							{query.error.message}{' '}
							<button
								type='button'
								className='underline'
								onClick={() => void query.refetch()}
							>
								Tekrar dene
							</button>
							{query.error.status === 401 && (
								<Link to={PAGE_PATHS.LOGIN}>Giriş yap</Link>
							)}
						</p>
					)}
					{preset.kind === 'balance' && finance.data && (
						<BalanceAnalysisReport
							data={finance.data}
							filters={filters}
							page={page}
							pageSize={pageSize}
							onPageChange={setPage}
							onPageSizeChange={(size) => {
								setPageSize(size);
								setPage(1);
							}}
							loading={finance.isFetching}
						/>
					)}
					{preset.kind === 'stock' && stock.data && (
						<>
							<SelectableStockReport
								controls={
									<StockReportFields
										filters={filters}
										onChange={changeFilters}
										view={view}
										setView={setView}
										groupBy={groupBy}
										setGroupBy={setGroupBy}
									/>
								}
								key={JSON.stringify(filters)}
								data={stock.data}
								filters={filters}
								view={view}
								groupBy={groupBy}
								page={page}
								pageSize={pageSize}
								onPageChange={setPage}
								onPageSizeChange={(size) => {
									setPageSize(size);
									setPage(1);
								}}
								loading={stock.isFetching}
							/>
						</>
					)}
				</>
			)}
		</main>
	);
}
