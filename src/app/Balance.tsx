import { FinanceCategoryPicker } from './component/admin/FinanceCategoryPicker';
import { AdminPageHeading } from './component/admin/AdminPageHeading';
import { InvestorPicker } from './component/admin/InvestorPicker';
import { useState } from 'react';
import { Link } from 'react-router';
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
} from './hooks/api/endpoints/useFinance';
import { istanbulToday } from './helpers/purchasePeriod.helper';
import { NumberInputWithSteppers } from './component/NumberInputWithSteppers';
import { AdminSummary } from './component/admin/AdminCollapseHeading';

const money = (value: number) =>
	value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
type EntryInput = {
	investorId?: string;
	requestId: string;
	categoryId: string;
	amount: number;
	date: string;
	description: string;
};

export default function BalancePage() {
	const report = useFinance({}, 1, 1);
	const [categoryId, setCategoryId] = useState('system:other');
	const [investorId, setInvestorId] = useState('');
	const [amount, setAmount] = useState<number | ''>('');
	const [date, setDate] = useState(istanbulToday);
	const [description, setDescription] = useState('');
	const [requestId, setRequestId] = useState(() => crypto.randomUUID());
	const create = useFinanceMutation<EntryInput>('/finance/entries');
	const categories = report.data?.categories ?? [];
	const group =
		categories.find((row) => row._id === categoryId)?.group ?? 'other';
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
			<AdminPageHeading title='Bakiye' />
			<p className='text-sm text-text/70'>
				Alışlar ödenmiş gider, satışlar tahsil edilmiş gelir olarak otomatik
				dahil edilir. Diğer giderleri ve yatırımları ürün oluşturmadan
				ekleyebilirsiniz. Otomatik alış/satış kayıtlarını ayrıca manuel
				eklemeyin.
			</p>
			{report.isError && (
				<p role='alert' className='text-red-500'>
					Bakiye güncellenemedi: {report.error.message}
				</p>
			)}
			<details className='space-y-3 rounded-xl border border-border p-3'>
				<AdminSummary index={0}>Gelir / gider ekle</AdminSummary>
				<form
					noValidate
					onSubmit={(event) => {
						event.preventDefault();
						const category = categories.find((row) => row._id === categoryId);
						const error =
							!category || !['other', 'investment'].includes(category.group)
								? 'Gelir / gider türünü seçin.'
								: amount === '' || !Number.isFinite(amount) || amount <= 0
									? 'Tutar alanına sıfırdan büyük bir değer girin.'
									: amount > 1e12
										? 'Tutar en fazla 1.000.000.000.000 TL olabilir.'
										: !date ||
											  Number.isNaN(Date.parse(date)) ||
											  new Date(date).toISOString().slice(0, 10) !== date
											? 'Geçerli bir işlem tarihi seçin.'
											: group === 'investment' && !investorId
												? 'Seçtiğiniz gelir türü için bir yatırımcı seçin.'
												: null;
						if (error) {
							toast.error(error);
							return;
						}
						create.mutate(
							{
								requestId,
								categoryId,
								amount: Number(amount),
								date,
								description,
								...(group === 'investment' ? { investorId } : {}),
							},
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
						disabled={create.isPending}
						className='flex flex-wrap items-end gap-3'
					>
						<FinanceCategoryPicker
							categories={categories}
							value={categoryId}
							onChange={(id) => {
								setCategoryId(id);
								setInvestorId('');
								setRequestId(crypto.randomUUID());
							}}
							disabled={create.isPending}
						/>
						{group === 'investment' && (
							<InvestorPicker
								value={investorId}
								onChange={(id) => {
									setInvestorId(id);
									setRequestId(crypto.randomUUID());
								}}
								disabled={create.isPending}
							/>
						)}
						<label className='flex flex-col gap-1 text-xs'>
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
						<label className='flex flex-col gap-1 text-xs'>
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
			</details>
			<div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4'>
				<p>
					Genel bakiye: <strong>{money(data.balance)}</strong>
				</p>
				<Link
					className={STOCK_BUTTON}
					to={PAGE_PATHS.ANALYSIS + '?preset=balance'}
				>
					Bakiye hareketleri ve raporlar · Analiz
				</Link>
			</div>
		</main>
	);
}
