import { PartyName } from './PartyName';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
	useFinanceMutation,
	type FinanceResponse,
	type FinanceFilters,
} from '../../hooks/api/endpoints/useFinance';
import { STOCK_BUTTON } from '../../constants/stockStyles.constant';
import { AdminSummary } from './AdminCollapseHeading';
import { ConfirmDialog } from './ConfirmDialog';
import { Pagination } from './Pagination';
const groups = {
	purchase: 'Mal alış',
	other: 'Gider',
	sale: 'Satış',
	investment: 'Gelir',
};

const money = (value: number) =>
	value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
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

function BalanceMovement({
	entry,
	index,
	showBalance,
	onVoid,
}: {
	entry: FinanceResponse['entries'][number];
	index: number;
	showBalance: boolean;
	onVoid: (id: string) => void;
}) {
	return (
		<details
			key={entry.id}
			className='space-y-2 rounded-xl border border-border p-2'
		>
			<AdminSummary index={index}>
				<span className='min-w-0 flex-1 break-words'>
					{groups[entry.group]} · {entry.subtype}
					{entry.bayiName && (
						<span className='block text-xs'>
							<PartyName
								label='Bayi'
								name={entry.bayiName}
								currentName={entry.currentBayiName}
							/>
						</span>
					)}
					{entry.investorName && (
						<span className='block text-xs font-medium text-sky-600 dark:text-sky-300'>
							<PartyName
								label='Yatırımcı'
								name={entry.investorName}
								currentName={entry.currentInvestorName}
							/>
						</span>
					)}
					<span className='block text-xs text-text/70'>
						{entry.date.split('-').reverse().join('.')} ·{' '}
						{entry.source === 'manual' ? 'Manuel kayıt' : 'Otomatik kayıt'}
					</span>
				</span>
				<span
					className={`shrink-0 tabular-nums ${entry.direction === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
				>
					{entry.direction === 'income' ? '+' : '−'}
					{money(entry.amount)}
					{showBalance && entry.balanceAfter !== undefined && (
						<span className='block text-xs font-normal text-text/75'>
							Bakiye: {money(entry.balanceAfter)}
						</span>
					)}
				</span>
			</AdminSummary>
			{showBalance &&
				entry.balanceBefore !== undefined &&
				entry.balanceAfter !== undefined && (
					<p className='px-3 text-xs tabular-nums text-text/75'>
						İşlem öncesi {money(entry.balanceBefore)}{' '}
						{entry.direction === 'income' ? '+' : '−'} {money(entry.amount)} =
						İşlem sonrası {money(entry.balanceAfter)}
					</p>
				)}
			<p className='break-words px-3 text-sm'>
				{entry.description || 'Açıklama yok'}
			</p>
			{entry.editable && (
				<button
					type='button'
					className={STOCK_BUTTON}
					aria-label={`${entry.subtype} kaydını iptal et`}
					onClick={() => onVoid(entry.id)}
				>
					<Trash2 size={16} aria-hidden />
				</button>
			)}
		</details>
	);
}

export function BalanceAnalysisReport({
	data,
	filters,
	page,
	pageSize,
	onPageChange,
	onPageSizeChange,
	loading,
}: {
	data: FinanceResponse;
	filters: FinanceFilters;
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
	loading: boolean;
}) {
	const [groupDaily, setGroupDaily] = useState(true);
	const [voidId, setVoidId] = useState<string | null>(null);
	const categories = data.categories;
	const filteredGroup =
		filters.group ??
		categories.find((row) => row._id === filters.categoryId)?.group;
	const showDailyIncome =
		filters.direction !== 'expense' &&
		!['purchase', 'other'].includes(filteredGroup ?? '');
	const showDailyExpenses =
		filters.direction !== 'income' &&
		!['sale', 'investment'].includes(filteredGroup ?? '');

	return (
		<>
			{' '}
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
			<p className='text-xs text-text/70'>
				Seçili filtrelerin dönem öncesi bakiyesi: {money(data.openingBalance)} ·
				Dönem sonu: {money(data.closingBalance)}. Genel bakiye filtrelerden
				bağımsızdır. Stok maliyeti bakiyeye ikinci kez eklenmez.
			</p>
			{loading && <p role='status'>Bakiye raporu güncelleniyor...</p>}
			<details open className='space-y-3' aria-label='Bakiye hareketleri'>
				<AdminSummary index={1}>Gelir ve gider hareketleri</AdminSummary>
				{!data.entries.length && (
					<p className='text-sm text-text/70'>Filtrelere uygun hareket yok.</p>
				)}
				<label className='inline-flex items-center gap-2 text-sm'>
					<input
						type='checkbox'
						checked={groupDaily}
						onChange={(event) => setGroupDaily(event.target.checked)}
					/>
					Günlere göre grupla
				</label>
				{!data.showRunningBalance && (
					<p className='text-xs text-text/70'>
						Seçili filtreler bazı hareketleri gizlediği için işlem sonrası
						bakiye gösterilmez. Günlük tutarlar yalnızca filtrelere uyan
						hareketleri kapsar.
					</p>
				)}
				{(groupDaily
					? [...new Set(data.entries.map((entry) => entry.date))]
					: ['all']
				).map((day, dayIndex) => {
					const dayEntries =
						day === 'all'
							? data.entries
							: data.entries.filter((entry) => entry.date === day);
					const totals = data.daily?.find((row) => row.date === day);
					return (
						<section key={day} className='min-w-0 space-y-2'>
							{groupDaily && (
								<details
									open
									className='min-w-0 space-y-2 rounded-xl border border-border p-2'
								>
									<AdminSummary index={dayIndex}>
										<span className='min-w-0 flex-1'>
											{day.split('-').reverse().join('.')}
											<span className='block text-xs font-normal text-text/70'>
												{totals?.count ?? dayEntries.length} hareket ·{' '}
												{data.showRunningBalance
													? 'Günün toplamı'
													: 'Filtrelenen gün toplamı'}{' '}
											</span>
										</span>
										{totals && (
											<span className='min-w-0 text-right text-xs tabular-nums'>
												{showDailyIncome && (
													<span className='block text-emerald-600 dark:text-emerald-400'>
														Gelir {money(totals.income)}
													</span>
												)}
												{showDailyExpenses && (
													<span className='block text-rose-600 dark:text-rose-400'>
														Gider {money(totals.expenses)}
													</span>
												)}
												<span className='block font-semibold'>
													Günün net hareketi: {money(totals.net)}
												</span>
											</span>
										)}
									</AdminSummary>
									{dayEntries.map((entry, index) => (
										<BalanceMovement
											key={entry.id}
											entry={entry}
											index={index}
											showBalance={data.showRunningBalance}
											onVoid={setVoidId}
										/>
									))}
								</details>
							)}
							{!groupDaily && (
								<>
									{dayEntries.map((entry, index) => (
										<BalanceMovement
											key={entry.id}
											entry={entry}
											index={index}
											showBalance={data.showRunningBalance}
											onVoid={setVoidId}
										/>
									))}
								</>
							)}
						</section>
					);
				})}
				<Pagination
					hideNavWhenSinglePage
					page={page}
					totalPages={data.totalPages}
					pageSize={pageSize}
					onPageChange={onPageChange}
					onPageSizeChange={(size) => {
						onPageSizeChange(size);
					}}
					summary={`${data.count} hareket`}
				/>
			</details>
			{voidId && <VoidEntry id={voidId} onClose={() => setVoidId(null)} />}
		</>
	);
}
