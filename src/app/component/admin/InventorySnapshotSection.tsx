import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive } from 'lucide-react';
import { Eye, RefreshCw } from 'lucide-react';
import env from '../../config/env';
import { z } from '../../util/zodTurkish';
import { toast } from 'sonner';
import { apiFetch, type ApiError } from '../../hooks/api/core/api-client';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';
import {
	STOCK_BUTTON,
	STOCK_NUMBER_CONTROL,
	STOCK_STEPPER,
} from '../../constants/stockStyles.constant';
import { AdminSummary } from './AdminCollapseHeading';

type SnapshotSchedule = {
	intervalMinutes: number;
	nextRunAt: string | null;
	lastExportedAt: string | null;
	lastItemCount: number | null;
	lastError: string | null;
};
const intervalSchema = z
	.number()
	.int()
	.min(1, 'Yenileme aralığı en az 1 dakika olmalıdır.')
	.max(10080, 'Yenileme aralığı en fazla 7 gün olabilir.');
const date = (value: string) =>
	new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
export function InventorySnapshotSection() {
	const client = useQueryClient();
	const query = useQuery<{ schedule: SnapshotSchedule }, ApiError>({
		queryKey: ['inventorySnapshotSchedule'],
		queryFn: () => apiFetch('/admins/inventory-snapshot'),
		refetchInterval: 30_000,
	});
	const [draft, setDraft] = useState<number | '' | null>(null);
	const [error, setError] = useState('');
	const save = useMutation<{ schedule: SnapshotSchedule }, ApiError, number>({
		mutationFn: (intervalMinutes) =>
			apiFetch('/admins/inventory-snapshot', {
				method: 'PUT',
				body: { intervalMinutes },
			}),
		onSuccess: (data) => {
			client.setQueryData(['inventorySnapshotSchedule'], data);
			setDraft(null);
			setError('');
			toast.success('Yedek liste yenileme aralığı güncellendi.');
		},
		onError: (error) => setError(error.message),
	});
	const value = draft ?? query.data?.schedule.intervalMinutes ?? '';
	const refresh = useMutation<{ schedule: SnapshotSchedule }, ApiError>({
		mutationFn: () =>
			apiFetch('/admins/inventory-snapshot/refresh-now', { method: 'POST' }),
		onSuccess: (data) => {
			client.setQueryData(['inventorySnapshotSchedule'], data);
			void client.invalidateQueries({ queryKey: ['itemsSnapshot'] });
			toast.success('Yedek ürün listesi şimdi yenilendi.');
		},
		onError: (error) => {
			setError(error.message);
			void query.refetch();
		},
	});
	return (
		<details className='mb-3 min-w-0 rounded-xl bg-button-bg p-3 text-sm text-text'>
			<AdminSummary index={5}>
				<Archive size={16} aria-hidden />
				Yedek ürün listesi
			</AdminSummary>
			<div className='mt-3 space-y-3'>
				<p className='text-xs text-text/70'>
					Canlı ürün servisine ulaşılamadığında ziyaretçilere son başarılı ürün
					listesi, kayıt tarihi uyarısıyla gösterilir. Bu kopya aşağıdaki
					aralıkla otomatik yenilenir. Yenileme başarısız olursa önceki kopya
					korunur.
				</p>
				{query.isPending && <p role='status'>Yenileme ayarı yükleniyor…</p>}
				{query.isError && <p role='alert'>{query.error.message}</p>}
				{query.data && (
					<>
						<form
							aria-label='Yedek ürün listesi yenileme sıklığı'
							className='flex flex-wrap items-end gap-3'
							onSubmit={(event) => {
								event.preventDefault();
								if (save.isPending) return;
								const parsed = intervalSchema.safeParse(value);
								if (!parsed.success) {
									setError(parsed.error.issues[0].message);
									return;
								}
								save.mutate(parsed.data);
							}}
						>
							<div className='space-y-1'>
								<label className='block text-xs' htmlFor='snapshot-interval'>
									Yenileme aralığı (dakika)
								</label>
								<NumberInputWithSteppers
									id='snapshot-interval'
									value={value}
									onChange={(action) => {
										setDraft(
											typeof action === 'function' ? action(value) : action,
										);
										setError('');
									}}
									disabled={save.isPending}
									disableWheel
									decimalPlaces={0}
									steppers={[
										{ amount: 15, label: '+15' },
										{ amount: 60, label: '+60' },
									]}
									className={STOCK_NUMBER_CONTROL}
									stepperClassName={STOCK_STEPPER}
								/>
							</div>
							<button
								type='submit'
								className={STOCK_BUTTON}
								disabled={save.isPending}
							>
								{save.isPending ? 'Kaydediliyor…' : 'Yenileme aralığını kaydet'}
							</button>
						</form>
						<p className='text-xs text-text/70'>
							1–10.080 dakika. Örneğin 60 dakika = saatte bir. Yeni aralık
							kaydettiğiniz andan itibaren hesaplanır.
						</p>
						<div className='space-y-1 text-xs' role='status'>
							<p>
								Son başarılı yenileme:{' '}
								{query.data.schedule.lastExportedAt
									? date(query.data.schedule.lastExportedAt)
									: 'Henüz yenilenmedi'}
								{query.data.schedule.lastItemCount !== null
									? ' · ' + query.data.schedule.lastItemCount + ' ürün'
									: ''}
							</p>
							<p>
								Sonraki yenileme:{' '}
								{query.data.schedule.nextRunAt
									? date(query.data.schedule.nextRunAt)
									: 'Servis başladığında'}{' '}
								(İstanbul)
							</p>
						</div>
						{query.data.schedule.lastError && (
							<p
								role='alert'
								className='text-xs text-amber-600 dark:text-amber-300'
							>
								{query.data.schedule.lastError}
							</p>
						)}
					</>
				)}
				{error && (
					<p role='alert' className='text-xs text-red-500'>
						{error}
					</p>
				)}
				{import.meta.env.DEV && env.VITE_ENV === 'development' && (
					<div className='flex flex-wrap items-center gap-2 border-t border-border pt-3'>
						<button
							type='button'
							className={STOCK_BUTTON + ' gap-2'}
							disabled={refresh.isPending || save.isPending}
							onClick={() => {
								setError('');
								refresh.mutate();
							}}
						>
							<RefreshCw size={15} aria-hidden />
							{refresh.isPending ? 'Yenileniyor…' : 'Şimdi yenile'}
						</button>
						<a
							className={STOCK_BUTTON + ' gap-2'}
							href={import.meta.env.BASE_URL + 'items-snapshot.json'}
							target='_blank'
							rel='noopener noreferrer'
						>
							<Eye size={15} aria-hidden />
							Yedek listeyi görüntüle
						</a>
					</div>
				)}
			</div>
		</details>
	);
}
