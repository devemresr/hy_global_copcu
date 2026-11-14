import { useState } from 'react';
import { Link } from 'react-router';
import { InfoTooltip } from '../InfoTooltip';
import { analysisReportUrlSchema } from '../../schemas/analysisReportUrl.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import env from '../../config/env';
import { toast } from 'sonner';
import { apiFetch, type ApiError } from '../../hooks/api/core/api-client';
import {
	STOCK_BUTTON,
	STOCK_CONTROL,
} from '../../constants/stockStyles.constant';
import { PURCHASE_PERIOD_PRESETS } from '../../constants/purchaseReports.constant';
import { PAGE_PATHS } from '../../constants/pagePaths.constant';
import { AdminSummary } from './AdminCollapseHeading';
import { Switch } from './Switch';

type ScheduleInput = {
	source: 'analysis' | 'umami';
	includeData: boolean;
	name: string;
	analysisUrl: string;
	enabled: boolean;
	includePdf: boolean;
	frequency: 'daily' | 'weekly' | 'monthly';
	time: string;
	weekday: number;
	monthDay: number;
	relativePeriod: string;
	recipients: string[];
};
type Schedule = ScheduleInput & {
	_id: string;
	nextRunAt: string;
	lastQueuedAt?: string | null;
	lastError?: string | null;
};
const initial: ScheduleInput = {
	source: 'analysis',
	includeData: true,
	name: '',
	analysisUrl: '',
	enabled: false,
	includePdf: true,
	frequency: 'daily',
	time: '09:00',
	weekday: 1,
	monthDay: 1,
	relativePeriod: 'thisMonth',
	recipients: [],
};
const weekdays = [
	'Pazar',
	'Pazartesi',
	'Salı',
	'Çarşamba',
	'Perşembe',
	'Cuma',
	'Cumartesi',
];
const date = (value: string) =>
	new Date(value).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
function inputOf(row: Schedule): ScheduleInput {
	return {
		source: row.source ?? 'analysis',
		includeData: row.includeData ?? true,
		name: row.name,
		analysisUrl: row.analysisUrl,
		enabled: row.enabled,
		includePdf: row.includePdf,
		frequency: row.frequency,
		time: row.time,
		weekday: row.weekday,
		monthDay: row.monthDay,
		relativePeriod: row.relativePeriod,
		recipients: row.recipients,
	};
}

export function ReportSchedulesSection() {
	const client = useQueryClient();
	const list = useQuery<
		{ schedules: Schedule[]; umamiConfigured?: boolean },
		ApiError
	>({
		queryKey: ['reportSchedules'],
		queryFn: () => apiFetch('/admins/report-schedules'),
		retry: false,
	});
	const [draft, setDraft] = useState<ScheduleInput>(initial);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [recipientText, setRecipientText] = useState('');
	// const [includeGraphs, setIncludeGraphs] = useState(false);
	const save = useMutation<
		unknown,
		ApiError,
		{ id?: string; input: ScheduleInput }
	>({
		mutationFn: ({ id, input }) =>
			apiFetch('/admins/report-schedules' + (id ? '/' + id : ''), {
				method: id ? 'PUT' : 'POST',
				body: input,
			}),
		onSuccess: () =>
			client.invalidateQueries({ queryKey: ['reportSchedules'] }),
		onError: (error) => toast.error(error.message),
	});
	const remove = useMutation<unknown, ApiError, string>({
		mutationFn: (id) =>
			apiFetch('/admins/report-schedules/' + id, { method: 'DELETE' }),
		onSuccess: () =>
			client.invalidateQueries({ queryKey: ['reportSchedules'] }),
		onError: (error) => toast.error(error.message),
	});
	const sendNow = useMutation<
		{ success: boolean; pdfAttached: boolean; dataAttached?: boolean },
		ApiError,
		string
	>({
		mutationFn: (id) =>
			apiFetch('/admins/report-schedules/' + id + '/send-now', {
				method: 'POST',
			}),
		onSuccess: (result) =>
			toast.success(
				result.dataAttached
					? 'Umami raporu JSON verileri' +
							(result.pdfAttached ? ' ve PDF ekiyle' : 'yle') +
							' e-posta sunucusuna gönderildi.'
					: result.pdfAttached
						? 'Rapor PDF ekiyle e-posta sunucusuna gönderildi.'
						: 'E-posta özeti gönderildi. PDF eki bu zamanlamada kapalı.',
			),
		onError: (error) => toast.error(error.message),
	});
	function reset() {
		setDraft(initial);
		setEditingId(null);
		setRecipientText('');
	}
	function edit(row: Schedule) {
		setDraft(inputOf(row));
		setEditingId(row._id);
		setRecipientText(row.recipients.join(', '));
	}
	function pasteUrl(analysisUrl: string) {
		let relativePeriod = draft.relativePeriod;
		try {
			const url = new URL(analysisUrl, window.location.origin);
			const period = url.searchParams.get('period');
			if (
				period &&
				(period === 'allTime' ||
					PURCHASE_PERIOD_PRESETS.some((p) => p.id === period))
			) {
				relativePeriod = period;
			}
		} catch {
			/* Validate the complete URL when saving. */
		}
		setDraft({ ...draft, analysisUrl, relativePeriod });
	}
	const busy = save.isPending || remove.isPending || sendNow.isPending;
	const urlValidation = analysisReportUrlSchema.safeParse(draft.analysisUrl);
	const urlError =
		draft.analysisUrl && !urlValidation.success
			? urlValidation.error.issues[0]?.message
			: null;
	return (
		<details className='mb-3 min-w-0 rounded-xl bg-button-bg p-3 text-sm text-text'>
			<AdminSummary index={4}>
				<Clock size={16} aria-hidden />
				Zamanlanmış raporlar
			</AdminSummary>
			<p className='mt-3 text-xs text-text/70'>
				Raporlar aşağıdaki saatlerde e-postayla gönderilir. Saat dilimi:
				İstanbul.
			</p>
			<form
				aria-label='Rapor zamanlaması'
				className='mt-3 space-y-3'
				onSubmit={(event) => {
					event.preventDefault();
					if (busy) return;
					if (draft.source === 'analysis' && !urlValidation.success) {
						toast.error(urlValidation.error.issues[0]?.message);
						return;
					}
					save.mutate(
						{
							id: editingId ?? undefined,
							input: {
								...draft,
								analysisUrl:
									draft.source === 'analysis' && urlValidation.success
										? urlValidation.data
										: '',
								recipients: recipientText
									.split(/[;,]/)
									.map((value) => value.trim())
									.filter(Boolean),
							},
						},
						{
							onSuccess: () => {
								toast.success(
									editingId
										? 'Rapor görevi güncellendi'
										: 'Rapor görevi eklendi',
								);
								reset();
							},
						},
					);
				}}
			>
				<fieldset
					disabled={busy}
					className='min-w-0 space-y-3 disabled:opacity-60'
				>
					<label className='flex max-w-xs flex-col gap-1 text-xs'>
						Rapor kaynağı
						<select
							className={STOCK_CONTROL}
							value={draft.source}
							onChange={(event) =>
								setDraft({
									...draft,
									source: event.target.value as ScheduleInput['source'],
								})
							}
						>
							<option value='analysis'>Analiz raporu</option>
							<option value='umami'>Umami ziyaretçi analitiği</option>
						</select>
					</label>
					<div className='grid min-w-0 gap-3 sm:grid-cols-2'>
						<label className='flex min-w-0 flex-col gap-1 text-xs'>
							Rapor adı
							<input
								required
								maxLength={120}
								value={draft.name}
								className={STOCK_CONTROL + ' w-full!'}
								onChange={(e) => setDraft({ ...draft, name: e.target.value })}
							/>
						</label>
						<label className='flex min-w-0 flex-col gap-1 text-xs'>
							Alıcılar (isteğe bağlı)
							<input
								value={recipientText}
								placeholder='Virgülle ayırın; boşsa varsayılan alıcılar kullanılır'
								className={STOCK_CONTROL + ' w-full!'}
								onChange={(e) => setRecipientText(e.target.value)}
							/>
						</label>
					</div>
					{draft.source === 'analysis' ? (
						<div className='flex min-w-0 flex-col gap-1 text-xs'>
							<div className='flex items-center gap-1'>
								<label htmlFor='scheduled-analysis-url'>
									Analiz raporu bağlantısı
								</label>
								<InfoTooltip label='Rapor bağlantısı nasıl alınır?'>
									<p>
										Analiz sayfasını açın, istediğiniz raporu ve filtreleri
										seçin. “Rapor bağlantısını kopyala” düğmesine basıp
										bağlantıyı bu alana yapıştırın. Bağlantı http:// veya
										https:// ile başlamalıdır; www veya .com zorunlu değildir.
									</p>
									<Link
										className='mt-2 inline-block font-medium underline'
										to={PAGE_PATHS.ANALYSIS}
									>
										Analiz sayfasını aç
									</Link>
								</InfoTooltip>
							</div>
							<textarea
								id='scheduled-analysis-url'
								aria-invalid={!!urlError}
								aria-describedby={
									urlError ? 'scheduled-analysis-url-error' : undefined
								}
								required
								rows={2}
								maxLength={20000}
								value={draft.analysisUrl}
								className={STOCK_CONTROL + ' h-auto! w-full! py-2 break-all'}
								onChange={(e) => pasteUrl(e.target.value)}
							/>
							{urlError && (
								<p
									id='scheduled-analysis-url-error'
									role='alert'
									className='text-red-500'
								>
									{urlError}
								</p>
							)}
						</div>
					) : (
						<div className='space-y-2 rounded-lg border border-border p-3 text-xs'>
							<p>
								Ziyaretçi ve oturum sayıları, sayfalar, trafik kaynakları,
								tarayıcılar, işletim sistemleri, cihazlar, konumlar ve özel
								olaylar seçili rapor dönemi için alınır. E-posta / PDF her
								dağılımın ilk 20 satırını; JSON eki tüm getirilen metrikleri,
								zaman serilerini ve desteklenen özellik özetlerini içerir.
							</p>
							{!list.data?.umamiConfigured && (
								<p role='status'>
									Umami bağlantısı henüz yapılandırılmadı. Sunucuda
									UMAMI_BASE_URL, UMAMI_WEBSITE_ID ve UMAMI_API_TOKEN veya
									UMAMI_USERNAME / UMAMI_PASSWORD ayarlarını yapın. Görevi
									duraklatılmış olarak kaydedebilirsiniz.
								</p>
							)}
						</div>
					)}
					<div className='flex min-w-0 flex-wrap items-end gap-3'>
						<label className='flex max-w-full flex-col gap-1 text-xs'>
							Sıklık
							<select
								value={draft.frequency}
								className={STOCK_CONTROL + ' w-auto!'}
								onChange={(e) =>
									setDraft({
										...draft,
										frequency: e.target.value as ScheduleInput['frequency'],
									})
								}
							>
								<option value='daily'>Her gün</option>
								<option value='weekly'>Her hafta</option>
								<option value='monthly'>Her ay</option>
							</select>
						</label>
						<label className='flex max-w-full flex-col gap-1 text-xs'>
							Saat (İstanbul)
							<input
								required
								type='time'
								value={draft.time}
								className={STOCK_CONTROL + ' w-auto!'}
								onChange={(e) => setDraft({ ...draft, time: e.target.value })}
							/>
						</label>
						{draft.frequency === 'weekly' && (
							<label className='flex max-w-full flex-col gap-1 text-xs'>
								Haftanın günü
								<select
									value={draft.weekday}
									className={STOCK_CONTROL + ' w-auto!'}
									onChange={(e) =>
										setDraft({ ...draft, weekday: Number(e.target.value) })
									}
								>
									{weekdays.map((label, day) => (
										<option key={day} value={day}>
											{label}
										</option>
									))}
								</select>
							</label>
						)}
						{draft.frequency === 'monthly' && (
							<label className='flex max-w-full flex-col gap-1 text-xs'>
								Ayın günü
								<select
									value={draft.monthDay}
									className={STOCK_CONTROL + ' w-auto!'}
									onChange={(e) =>
										setDraft({ ...draft, monthDay: Number(e.target.value) })
									}
								>
									{Array.from({ length: 28 }, (_, i) => (
										<option key={i + 1} value={i + 1}>
											{i + 1}
										</option>
									))}
								</select>
							</label>
						)}
						<label className='flex max-w-full flex-col gap-1 text-xs'>
							Rapor dönemi
							<select
								value={draft.relativePeriod}
								className={STOCK_CONTROL + ' w-auto!'}
								onChange={(e) =>
									setDraft({ ...draft, relativePeriod: e.target.value })
								}
							>
								{PURCHASE_PERIOD_PRESETS.map((p) => (
									<option key={p.id} value={p.id}>
										{p.label}
									</option>
								))}
								<option value='allTime'>Tüm zamanlar</option>
							</select>
						</label>
					</div>
					<p className='text-xs text-text/70'>
						Bağlantıdaki tarih sınırları yerine seçtiğiniz rapor dönemi her
						çalışmada yeniden hesaplanır. Örneğin “Bu ay”, o ayın başlangıcından
						rapor gününe kadar olan kayıtları kapsar. Gönderim sıklığı yalnızca
						raporun ne zaman gönderileceğini belirler.
					</p>
					<div className='flex flex-wrap gap-4'>
						<Switch
							checked={draft.enabled}
							onChange={(enabled) => setDraft({ ...draft, enabled })}
							label='Görev etkin'
						/>
						{draft.source === 'umami' && (
							<Switch
								checked={draft.includeData}
								onChange={(includeData) => setDraft({ ...draft, includeData })}
								label='JSON verilerini ekle'
							/>
						)}
						<Switch
							checked={draft.includePdf}
							onChange={(includePdf) => setDraft({ ...draft, includePdf })}
							label='PDF ekle'
						/>
						{/* <Switch checked={includeGraphs} onChange={setIncludeGraphs} label='Grafikleri ekle' /> */}
					</div>
					<div className='flex flex-wrap gap-2'>
						<button type='submit' className={STOCK_BUTTON}>
							{save.isPending
								? 'Kaydediliyor...'
								: editingId
									? 'Rapor görevini güncelle'
									: 'Rapor görevi ekle'}
						</button>
						{editingId && (
							<button type='button' className={STOCK_BUTTON} onClick={reset}>
								Vazgeç
							</button>
						)}
						<a href={PAGE_PATHS.ANALYSIS} className={STOCK_BUTTON}>
							Analiz sayfasını aç
						</a>
					</div>
				</fieldset>
			</form>
			{list.isError && (
				<p role='alert' className='mt-3 text-xs text-red-500'>
					{list.error.message}
				</p>
			)}
			<div className='mt-4 min-w-0 space-y-2'>
				{list.data?.schedules.map((row, index) => (
					<details
						key={row._id}
						className='min-w-0 rounded-lg border border-border p-2'
					>
						<AdminSummary index={index}>
							<span className='min-w-0 flex-1 break-words'>{row.name}</span>
							<span className='shrink-0 text-xs'>
								{row.enabled ? 'Etkin' : 'Duraklatıldı'}
							</span>
						</AdminSummary>
						<div className='mt-3 min-w-0 space-y-2 px-2'>
							<p className='text-xs'>
								{row.frequency === 'daily'
									? 'Her gün'
									: row.frequency === 'weekly'
										? 'Her ' + weekdays[row.weekday]
										: 'Her ayın ' + row.monthDay + '. günü'}{' '}
								· {row.time} · İstanbul
							</p>
							<p className='text-xs'>
								{row.source === 'umami' ? 'Umami analitiği' : 'Analiz raporu'} ·
								Rapor dönemi:{' '}
								{row.relativePeriod === 'allTime'
									? 'Tüm zamanlar'
									: PURCHASE_PERIOD_PRESETS.find(
											(period) => period.id === row.relativePeriod,
										)?.label}{' '}
								· Her çalışmada yeniden hesaplanır
							</p>
							{row.enabled && (
								<p className='text-xs'>
									Sonraki hazırlama: {date(row.nextRunAt)}
								</p>
							)}
							{row.lastQueuedAt && (
								<p className='text-xs'>
									Son rapor kuyruğa alındı: {date(row.lastQueuedAt)}
								</p>
							)}
							{row.lastError && (
								<p role='alert' className='text-xs text-red-500'>
									{row.lastError}
								</p>
							)}
							<p className='break-words text-xs'>
								{row.recipients.length
									? row.recipients.join(', ')
									: 'Varsayılan alıcılar'}{' '}
								· {row.includePdf ? 'PDF eklenecek' : 'PDF eki kapalı'}{' '}
								{row.source === 'umami' && row.includeData
									? '· JSON eklenecek'
									: ''}
							</p>
							<div className='flex flex-wrap items-center gap-3'>
								<Switch
									checked={row.enabled}
									disabled={busy}
									label={row.enabled ? 'Etkin' : 'Duraklatıldı'}
									onChange={(enabled) =>
										save.mutate({
											id: row._id,
											input: { ...inputOf(row), enabled },
										})
									}
								/>
								<button
									type='button'
									disabled={busy}
									className={STOCK_BUTTON}
									aria-label={row.name + ' zamanlamasını düzenle'}
									onClick={() => edit(row)}
								>
									<Pencil size={15} aria-hidden />
								</button>
								{import.meta.env.DEV && env.VITE_ENV === 'development' && (
									<button
										type='button'
										disabled={busy}
										className={STOCK_BUTTON + ' inline-flex items-center gap-2'}
										aria-label={row.name + ' raporunu şimdi gönder'}
										onClick={() => sendNow.mutate(row._id)}
									>
										<Send size={15} aria-hidden />
										{sendNow.isPending && sendNow.variables === row._id
											? 'Gönderiliyor...'
											: 'Şimdi gönder'}
									</button>
								)}
								<button
									type='button'
									disabled={busy}
									className={STOCK_BUTTON}
									aria-label={row.name + ' zamanlamasını sil'}
									onClick={() =>
										remove.mutate(row._id, {
											onSuccess: () => {
												if (editingId === row._id) reset();
											},
										})
									}
								>
									<Trash2 size={15} aria-hidden />
								</button>
							</div>
						</div>
					</details>
				))}
				{list.isSuccess && !list.data.schedules.length && (
					<p className='flex items-center gap-2 text-xs text-text/70'>
						<Plus size={14} aria-hidden />
						Henüz rapor zamanlaması yok.
					</p>
				)}
			</div>
		</details>
	);
}
