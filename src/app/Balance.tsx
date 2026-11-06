import { useState } from 'react';
import { Link } from 'react-router';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PAGE_PATHS } from './constants/pagePaths.constant';
import {
	STOCK_BUTTON,
	STOCK_CONTROL,
	STOCK_NUMBER_CONTROL,
	STOCK_STEPPER,
} from './constants/stockStyles.constant';
import {
	useFinance,
	useFinanceMutation,
	type FinanceFilters,
	type FinanceGroup,
} from './hooks/api/endpoints/useFinance';
import { istanbulToday } from './helpers/orderPeriod.helper';
import { NumberInputWithSteppers } from './component/NumberInputWithSteppers';
import { AdminSummary } from './component/admin/AdminCollapseHeading';
import { OrderHistoryFilters } from './component/admin/OrderHistoryFilters';
import { Pagination } from './component/admin/Pagination';
import { ConfirmDialog } from './component/admin/ConfirmDialog';

const groups = {
	purchase: 'Mal alış',
	other: 'Diğer',
	sale: 'Satış',
	investment: 'Yatırım',
};
const money = (value: number) =>
	value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
type EntryInput = {
	requestId: string;
	categoryId: string;
	amount: number;
	date: string;
	description: string;
};

function VoidEntry({ id, onClose }: { id: string; onClose: () => void }) {
	const remove = useFinanceMutation<undefined>(
		`/finance/entries/${encodeURIComponent(id)}`,
		'DELETE',
	);
	return (
		<ConfirmDialog
			title='Kaydı iptal et'
			message='Bu manuel kayıt bakiyeden çıkarılacak. İptal işlemi kayıt geçmişinde tutulur.'
			confirmLabel={remove.isPending ? 'İptal ediliyor...' : 'Kaydı iptal et'}
			onCancel={() => {
				if (!remove.isPending) onClose();
			}}
			onConfirm={() => {
				if (!remove.isPending)
					remove.mutate(undefined, {
						onSuccess: onClose,
						onError: (error) => toast.error(error.message),
					});
			}}
		/>
	);
}

export default function BalancePage() {
	const [filters, setFilters] = useState<FinanceFilters>({});
	const [page, setPage] = useState(1),
		[pageSize, setPageSize] = useState(20);
	const report = useFinance(filters, page, pageSize);
	const [direction, setDirection] = useState<'expense' | 'income'>('expense');
	const [group, setGroup] = useState<FinanceGroup>('other');
	const [categoryId, setCategoryId] = useState('system:other');
	const [amount, setAmount] = useState<number | ''>('');
	const [date, setDate] = useState(istanbulToday);
	const [description, setDescription] = useState('');
	const [subtypeName, setSubtypeName] = useState('');
	const [requestId, setRequestId] = useState(() => crypto.randomUUID());
	const [categoryRequestId, setCategoryRequestId] = useState(() =>
		crypto.randomUUID(),
	);
	const [voidId, setVoidId] = useState<string | null>(null);
	const create = useFinanceMutation<EntryInput>('/finance/entries');
	const createCategory = useFinanceMutation<{
		requestId: string;
		group: FinanceGroup;
		name: string;
	}>('/finance/categories');
	const categories = report.data?.categories ?? [];
	function changeFilters(next: FinanceFilters) {
		setFilters(next);
		setPage(1);
	}
	function changeGroup(next: FinanceGroup) {
		setGroup(next);
		setCategoryId(`system:${next}`);
		setRequestId(crypto.randomUUID());
		setCategoryRequestId(crypto.randomUUID());
	}
	if (report.isPending)
		return (
			<p role='status' className='p-6 text-text'>
				Bakiye yükleniyor...
			</p>
		);
	if (!report.data)
		return (
			<div role='alert' className='p-6 text-text'>
				{report.error?.message}
				<Link to={PAGE_PATHS.LOGIN} className='ml-3 underline'>
					Giriş yap
				</Link>
				<button className={STOCK_BUTTON} onClick={() => void report.refetch()}>
					Tekrar dene
				</button>
			</div>
		);
	const data = report.data;
	return (
		<main className='mx-auto w-full min-w-0 max-w-7xl space-y-4 px-3 py-4 text-text sm:px-6 sm:py-6'>
			<header className='flex flex-wrap items-center justify-between gap-3'>
				<h1 className='text-2xl font-semibold'>Bakiye</h1>
				<nav className='flex gap-4 text-sm underline'>
					<Link to={PAGE_PATHS.ADMIN}>Yönetim</Link>
					<Link to={PAGE_PATHS.ORDERS}>Alış</Link>
					<Link to={PAGE_PATHS.STOCK}>Stok / Satış</Link>
				</nav>
			</header>
			<p className='text-sm text-text/70'>
				Alışlar ödenmiş gider, satışlar tahsil edilmiş gelir olarak otomatik
				dahil edilir. Diğer giderleri ve yatırımları ürün oluşturmadan
				ekleyebilirsiniz. Otomatik alış/satış kayıtlarını ayrıca manuel
				eklemeyin.
			</p>
			<section
				className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
				aria-label='Bakiye özeti'
			>
				{[
					['Genel bakiye · tüm kayıtlar', data.balance],
					['Filtrelenen gelir', data.income],
					['Filtrelenen gider', data.expenses],
					['Dönem net hareketi', data.net],
				].map(([label, value]) => (
					<div
						key={label}
						className='rounded-xl border border-border bg-button-bg/30 p-4'
					>
						<p className='text-xs text-text/70'>{label}</p>
						<p className='mt-2 break-words text-xl font-semibold tabular-nums'>
							{money(Number(value))}
						</p>
					</div>
				))}
			</section>
			<details className='space-y-3 rounded-xl border border-border p-3'>
				<AdminSummary index={0}>Gelir / gider ekle</AdminSummary>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						if (amount === '' || amount <= 0 || !categoryId) {
							toast.error('Bir alt tür ve pozitif tutar girin.');
							return;
						}
						create.mutate(
							{ requestId, categoryId, amount, date, description },
							{
								onSuccess: () => {
									setAmount('');
									setDescription('');
									setRequestId(crypto.randomUUID());
									toast.success('Bakiye kaydı eklendi');
								},
								onError: (error) => toast.error(error.message),
							},
						);
					}}
					className='space-y-3'
				>
					<fieldset
						disabled={create.isPending || createCategory.isPending}
						className='flex flex-wrap items-end gap-3'
					>
						<div
							className='flex gap-1'
							role='group'
							aria-label='Gelir veya gider'
						>
							{(['expense', 'income'] as const).map((value) => (
								<button
									key={value}
									type='button'
									aria-pressed={direction === value}
									className={`${STOCK_BUTTON} rounded-full! ${direction === value ? 'bg-text! text-bg!' : ''}`}
									onClick={() => {
										setDirection(value);
										changeGroup(value === 'expense' ? 'other' : 'investment');
									}}
								>
									{value === 'expense' ? 'Gider' : 'Gelir'}
								</button>
							))}
						</div>
						<label className='space-y-1 text-xs'>
							Ana tür
							<select
								aria-label='Bakiye ana türü'
								className={`${STOCK_CONTROL} w-auto!`}
								value={group}
								onChange={(event) =>
									changeGroup(event.target.value as FinanceGroup)
								}
							>
								{(direction === 'expense'
									? (['purchase', 'other'] as const)
									: (['sale', 'investment'] as const)
								).map((value) => (
									<option key={value} value={value}>
										{groups[value]}
									</option>
								))}
							</select>
						</label>
						<label className='space-y-1 text-xs'>
							Alt tür
							<select
								aria-label='Bakiye alt türü'
								className={`${STOCK_CONTROL} w-auto! max-w-56`}
								value={categoryId}
								onChange={(event) => {
									setCategoryId(event.target.value);
									setRequestId(crypto.randomUUID());
								}}
							>
								{categories
									.filter((category) => category.group === group)
									.map((category) => (
										<option key={category._id} value={category._id}>
											{category.name}
										</option>
									))}
							</select>
						</label>
						<label className='space-y-1 text-xs'>
							Tutar (TL)
							<NumberInputWithSteppers
								id='finance-amount'
								ariaLabel='Bakiye tutarı'
								disableWheel
								decimalPlaces={2}
								value={amount}
								onChange={(value) => {
									setAmount(value);
									setRequestId(crypto.randomUUID());
								}}
								className={STOCK_NUMBER_CONTROL}
								stepperClassName={STOCK_STEPPER}
							/>
						</label>
						<label className='space-y-1 text-xs'>
							Tarih
							<input
								type='date'
								required
								className={STOCK_CONTROL}
								value={date}
								onChange={(event) => {
									setDate(event.target.value);
									setRequestId(crypto.randomUUID());
								}}
							/>
						</label>
						<label className='flex min-w-40 flex-1 flex-col gap-1 text-xs'>
							Açıklama
							<input
								className={STOCK_CONTROL}
								maxLength={500}
								value={description}
								onChange={(event) => {
									setDescription(event.target.value);
									setRequestId(crypto.randomUUID());
								}}
							/>
						</label>
						<button className={STOCK_BUTTON} type='submit'>
							{create.isPending ? 'Kaydediliyor...' : 'Kaydı ekle'}
						</button>
					</fieldset>
				</form>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						createCategory.mutate(
							{ requestId: categoryRequestId, group, name: subtypeName },
							{
								onSuccess: (response) => {
									const created = response as { category: { _id: string } };
									setCategoryId(created.category._id);
									setSubtypeName('');
									setCategoryRequestId(crypto.randomUUID());
									setRequestId(crypto.randomUUID());
									toast.success('Alt tür eklendi');
								},
								onError: (error) => toast.error(error.message),
							},
						);
					}}
					className='flex flex-wrap items-end gap-2 border-t border-border pt-3'
				>
					<label className='flex flex-col gap-1 text-xs'>
						{groups[group]} için yeni alt tür
						<input
							className={STOCK_CONTROL}
							value={subtypeName}
							required
							maxLength={100}
							disabled={createCategory.isPending}
							onChange={(event) => {
								setSubtypeName(event.target.value);
								setCategoryRequestId(crypto.randomUUID());
							}}
						/>
					</label>
					<button
						className={STOCK_BUTTON}
						disabled={createCategory.isPending || !subtypeName.trim()}
						type='submit'
					>
						Alt tür ekle
					</button>
				</form>
			</details>
			<OrderHistoryFilters
				context='finance'
				value={filters}
				onChange={(next) =>
					changeFilters({
						...next,
						group: filters.group,
						direction: filters.direction,
						categoryId: filters.categoryId,
					})
				}
			/>
			<div className='flex flex-wrap items-end gap-3'>
				<label className='space-y-1 text-xs'>
					Hareket
					<select
						aria-label='Bakiye hareket filtresi'
						className={`${STOCK_CONTROL} w-auto!`}
						value={filters.direction ?? ''}
						onChange={(event) =>
							changeFilters({
								...filters,
								direction:
									(event.target.value as FinanceFilters['direction']) ||
									undefined,
								group: undefined,
								categoryId: undefined,
							})
						}
					>
						<option value=''>Tüm hareketler</option>
						<option value='expense'>Gider</option>
						<option value='income'>Gelir</option>
					</select>
				</label>
				<label className='space-y-1 text-xs'>
					Ana tür
					<select
						aria-label='Bakiye ana tür filtresi'
						className={`${STOCK_CONTROL} w-auto!`}
						value={filters.group ?? ''}
						onChange={(event) =>
							changeFilters({
								...filters,
								group: (event.target.value as FinanceGroup) || undefined,
								categoryId: undefined,
							})
						}
					>
						<option value=''>Tüm türler</option>
						{Object.entries(groups)
							.filter(
								([key]) =>
									!filters.direction ||
									(filters.direction === 'expense'
										? ['purchase', 'other'].includes(key)
										: ['sale', 'investment'].includes(key)),
							)
							.map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
					</select>
				</label>
				<label className='space-y-1 text-xs'>
					Alt tür
					<select
						aria-label='Bakiye alt tür filtresi'
						className={`${STOCK_CONTROL} w-auto! max-w-56`}
						value={filters.categoryId ?? ''}
						onChange={(event) =>
							changeFilters({
								...filters,
								categoryId: event.target.value || undefined,
							})
						}
					>
						<option value=''>Tüm alt türler</option>
						{categories
							.filter(
								(category) =>
									(!filters.group || category.group === filters.group) &&
									(!filters.direction ||
										(filters.direction === 'expense'
											? ['purchase', 'other'].includes(category.group)
											: ['sale', 'investment'].includes(category.group))),
							)
							.map((category) => (
								<option key={category._id} value={category._id}>
									{groups[category.group]} · {category.name}
								</option>
							))}
					</select>
				</label>
			</div>
			<p className='text-xs text-text/70'>
				Seçili filtrelerin dönem öncesi bakiyesi: {money(data.openingBalance)} ·
				Dönem sonu: {money(data.closingBalance)}. Genel bakiye filtrelerden
				bağımsızdır. Stok maliyeti bakiyeye ikinci kez eklenmez.
			</p>
			{report.isFetching && <p role='status'>Bakiye raporu güncelleniyor...</p>}
			{report.isError && <p role='alert'>{report.error.message}</p>}
			<details open className='space-y-3' aria-label='Bakiye hareketleri'>
				<AdminSummary index={1}>Gelir ve gider hareketleri</AdminSummary>
				{!data.entries.length && (
					<p className='text-sm text-text/70'>Filtrelere uygun hareket yok.</p>
				)}
				{data.entries.map((entry, index) => (
					<details
						key={entry.id}
						className='space-y-2 rounded-xl border border-border p-2'
					>
						<AdminSummary index={index}>
							<span className='min-w-0 flex-1 break-words'>
								{groups[entry.group]} · {entry.subtype}
								<span className='block text-xs text-text/70'>
									{entry.date.split('-').reverse().join('.')} ·{' '}
									{entry.source === 'manual'
										? 'Manuel kayıt'
										: 'Otomatik kayıt'}
								</span>
							</span>
							<span
								className={`shrink-0 tabular-nums ${entry.direction === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
							>
								{entry.direction === 'income' ? '+' : '−'}
								{money(entry.amount)}
							</span>
						</AdminSummary>
						<p className='break-words px-3 text-sm'>
							{entry.description || 'Açıklama yok'}
						</p>
						{entry.editable && (
							<button
								type='button'
								className={STOCK_BUTTON}
								aria-label={`${entry.subtype} kaydını iptal et`}
								onClick={() => setVoidId(entry.id)}
							>
								<Trash2 size={16} aria-hidden />
							</button>
						)}
					</details>
				))}
				<Pagination
					hideNavWhenSinglePage
					page={page}
					totalPages={data.totalPages}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={(size) => {
						setPageSize(size);
						setPage(1);
					}}
					summary={`${data.count} hareket`}
				/>
			</details>
			{voidId && <VoidEntry id={voidId} onClose={() => setVoidId(null)} />}
		</main>
	);
}
