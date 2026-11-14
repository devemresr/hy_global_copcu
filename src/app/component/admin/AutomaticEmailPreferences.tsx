import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, type ApiError } from '../../hooks/api/core/api-client';
import { AdminSummary } from './AdminCollapseHeading';
import { Switch } from './Switch';
type Preferences = {
	purchase: boolean;
	sale: boolean;
	conversion: boolean;
	financeCreate: boolean;
	financeVoid: boolean;
};
const labels: Record<keyof Preferences, string> = {
	purchase: 'Alış kaydı',
	sale: 'Satış kaydı',
	conversion: 'Stok birimi dönüşümü',
	financeCreate: 'Gelir / gider ekleme',
	financeVoid: 'Gelir / gider iptali',
};
export function AutomaticEmailPreferences() {
	const client = useQueryClient();
	const settings = useQuery<{ preferences: Preferences }, ApiError>({
		queryKey: ['emailPreferences'],
		queryFn: () => apiFetch('/admins/email-preferences'),
	});
	const save = useMutation<{ preferences: Preferences }, ApiError, Preferences>(
		{
			mutationFn: (body) =>
				apiFetch('/admins/email-preferences', { method: 'PUT', body }),
			onSuccess: (data) => client.setQueryData(['emailPreferences'], data),
			onError: (error) => toast.error(error.message),
		},
	);
	return (
		<details className='mb-3 min-w-0 rounded-xl bg-button-bg p-3 text-sm text-text'>
			<AdminSummary index={3}>
				<Mail size={16} aria-hidden />
				Otomatik e-posta bildirimleri
			</AdminSummary>
			<div className='mt-3 space-y-3'>
				<p className='text-xs text-text/70'>
					Hangi işlemlerin yapılandırılmış alıcılara otomatik özet göndereceğini
					seçin. Kapatılan türde bekleyen e-postalar da gönderilmez. Zamanlanmış
					raporlar kendi görev anahtarlarından yönetilir.
				</p>
				{settings.isPending && <p role='status'>Ayarlar yükleniyor…</p>}
				{settings.isError && <p role='alert'>{settings.error.message}</p>}
				<div className='flex flex-wrap gap-4'>
					{settings.data &&
						(Object.keys(labels) as (keyof Preferences)[]).map((key) => (
							<Switch
								key={key}
								checked={settings.data.preferences[key]}
								disabled={save.isPending}
								label={labels[key]}
								onChange={(checked) =>
									save.mutate({ ...settings.data!.preferences, [key]: checked })
								}
							/>
						))}
				</div>
			</div>
		</details>
	);
}
