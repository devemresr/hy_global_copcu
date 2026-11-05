import { AdminSummary } from './AdminCollapseHeading';
import { useState } from 'react';
import { toast } from 'sonner';
import {
	DEFAULT_PROMOTION,
	type PromotionSettings,
} from '../../constants/promotion.constant';
import {
	useSiteStatus,
	useUpdatePromotion,
} from '../../hooks/api/endpoints/useSiteStatus';
import { PromotionPopup } from '../PromotionPopup';

export function PromotionSection() {
	const { data, isError, refetch } = useSiteStatus();
	if (!data)
		return isError ? (
			<p className='mb-3 text-sm'>
				Tanıtım ayarları yüklenemedi.{' '}
				<button
					type='button'
					onClick={() => void refetch()}
					className='underline'
				>
					Tekrar dene
				</button>
			</p>
		) : null;
	const settings = data.promotion ?? DEFAULT_PROMOTION;
	return <PromotionForm key={JSON.stringify(settings)} initial={settings} />;
}

function PromotionForm({ initial }: { initial: PromotionSettings }) {
	const [settings, setSettings] = useState(initial);
	const [preview, setPreview] = useState(false);
	const update = useUpdatePromotion();
	const fields = [
		{ key: 'brandLabel', label: 'Üst marka yazısı', max: 120 },
		{ key: 'tagline', label: 'Kısa tanıtım yazısı', max: 120 },
		{ key: 'title', label: 'Başlık', max: 160 },
		{ key: 'description', label: 'Açıklama', max: 1000 },
	] as const;
	return (
		<details className='mb-3 rounded-xl bg-button-bg p-3 text-sm text-text'>
			<AdminSummary index={2}>Ana sayfa tanıtım penceresi</AdminSummary>
			<form
				className='mt-4 flex flex-col gap-4'
				onSubmit={(event) => {
					event.preventDefault();
					const input = { ...settings };
					for (const { key } of fields) input[key] = input[key]?.trim() || null;
					update.mutate(input, {
						onSuccess: () => toast.success('Tanıtım ayarları kaydedildi'),
						onError: (error) =>
							toast.error('Tanıtım kaydedilemedi', {
								description: error.message,
							}),
					});
				}}
			>
				<fieldset
					disabled={update.isPending}
					className='flex flex-col gap-4 disabled:opacity-60'
				>
					<label className='flex items-center gap-2'>
						<input
							type='checkbox'
							checked={settings.enabled}
							onChange={(event) =>
								setSettings({ ...settings, enabled: event.target.checked })
							}
						/>
						Tanıtım penceresini göster
					</label>
					<label className='flex items-center gap-2'>
						<input
							type='checkbox'
							checked={settings.showEveryVisit}
							onChange={(event) =>
								setSettings({
									...settings,
									showEveryVisit: event.target.checked,
								})
							}
						/>
						Her ana sayfa ziyaretinde göster
					</label>
					<p className='text-xs opacity-70'>
						Bu seçenek kapalıyken ziyaretçilere tarayıcı başına bir kez
						gösterilir. Yerel geliştirmede her zaman açılır.
					</p>
					{fields.map(({ key, label, max }) => (
						<label key={key} className='flex flex-col gap-1'>
							<span>{label}</span>
							<textarea
								rows={key === 'description' ? 4 : 2}
								maxLength={max}
								value={settings[key] ?? ''}
								placeholder={DEFAULT_PROMOTION[key] ?? ''}
								onChange={(event) =>
									setSettings({
										...settings,
										[key]: event.target.value || null,
									})
								}
								className='w-full rounded-xl bg-button-focus-bg px-3 py-2 text-text'
							/>
						</label>
					))}
					<p className='text-xs opacity-70'>
						Boş alanlarda varsayılan metin kullanılır. Görsel, mevcut fiyat
						listesi fotoğrafıdır.
					</p>
					<div className='flex flex-wrap gap-2'>
						<button
							type='submit'
							className='rounded-xl bg-button-focus-bg px-4 py-2 font-medium hover:bg-button-hover-bg'
						>
							{update.isPending ? 'Kaydediliyor...' : 'Tanıtımı kaydet'}
						</button>
						<button
							type='button'
							onClick={() => setPreview(true)}
							className='rounded-xl border border-border px-4 py-2 hover:bg-button-hover-bg'
						>
							Önizle
						</button>
					</div>
				</fieldset>
			</form>
			{preview && (
				<PromotionPopup
					promotion={settings}
					preview
					onClose={() => setPreview(false)}
				/>
			)}
		</details>
	);
}
