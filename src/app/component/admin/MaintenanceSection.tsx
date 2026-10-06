import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
	getSchedulePhase,
	useScheduleClock,
	useSiteStatus,
	useUpdateMaintenance,
	useUpdateNotice,
	type MaintenanceDto,
	type NoticeDto,
	type NoticeType,
	type SchedulePhase,
	type ScheduleDto,
} from '../../hooks/api/endpoints/useSiteStatus';
import { PUBLIC_PAGES } from '../../constants/publicPages.constant';
import { Switch } from './Switch';
import { useWindowSize } from '../../hooks/useWindowSize';

// Tailwind's md breakpoint, where the two cards sit side by side.
const ROW_LAYOUT_MIN_WIDTH = 768;

type CardName = 'maintenance' | 'notice';

const inputClass =
	'rounded-xl bg-button-focus-bg px-2 py-1.5 text-text outline-none';
const buttonClass =
	'rounded-xl bg-button-focus-bg px-3 py-1.5 font-medium hover:bg-button-hover-bg disabled:opacity-50';

// <input type='datetime-local'> works in local time without a zone.
function toLocalInputValue(iso: string | null): string {
	if (!iso) return '';
	const date = new Date(iso);
	const offsetMs = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

function formatDate(iso: string | null): string {
	return iso
		? new Date(iso).toLocaleString('tr-TR', {
				dateStyle: 'medium',
				timeStyle: 'short',
			})
		: '';
}

// Returns an error message, or null when the schedule can be saved.
function validateSchedule(
	enabled: boolean,
	from: string,
	until: string,
): string | null {
	if (from && until && new Date(from) >= new Date(until)) {
		return 'Bitiş zamanı başlangıçtan sonra olmalı';
	}
	if (enabled && until && new Date(until).getTime() <= Date.now()) {
		return 'Bitiş zamanı gelecekte olmalı';
	}
	return null;
}

const PHASE_BADGE_TONE = {
	neutral: 'bg-button-hover-bg opacity-80',
	amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
	red: 'bg-red-500/15 text-red-600 dark:text-red-400',
	green: 'bg-green-500/15 text-green-600 dark:text-green-400',
};

function PhaseBadge({
	schedule,
	phase,
	activeLabel,
	activeTone,
}: {
	schedule: ScheduleDto;
	phase: SchedulePhase;
	activeLabel: string;
	activeTone: keyof typeof PHASE_BADGE_TONE;
}) {
	const { label, tone } = {
		off: { label: 'Kapalı', tone: 'neutral' as const },
		ended: { label: 'Süresi doldu', tone: 'neutral' as const },
		scheduled: {
			label: `Planlandı: ${formatDate(schedule.from)}`,
			tone: 'amber' as const,
		},
		active: {
			label: schedule.until
				? `${activeLabel} · ${formatDate(schedule.until)} tarihine kadar`
				: activeLabel,
			tone: activeTone,
		},
	}[phase];
	return (
		<span
			className={`rounded-full px-2 py-0.5 text-xs ${PHASE_BADGE_TONE[tone]}`}
		>
			{label}
		</span>
	);
}

function ScheduleFields({
	from,
	until,
	onFromChange,
	onUntilChange,
}: {
	from: string;
	until: string;
	onFromChange: (value: string) => void;
	onUntilChange: (value: string) => void;
}) {
	const fields = [
		{ label: 'Başlangıç (boş: hemen)', value: from, onChange: onFromChange },
		{
			label: 'Bitiş (boş: süresiz)',
			value: until,
			onChange: onUntilChange,
		},
	];
	return (
		<div className='flex flex-wrap gap-3'>
			{fields.map((field) => (
				<label key={field.label} className='flex flex-col gap-1'>
					<span className='opacity-70'>{field.label}</span>
					<span className='flex gap-1'>
						<input
							type='datetime-local'
							value={field.value}
							onChange={(e) => field.onChange(e.target.value)}
							className={inputClass}
						/>
						{field.value && (
							<button
								type='button'
								onClick={() => field.onChange('')}
								className='rounded-xl px-2 py-1.5 hover:bg-button-hover-bg'
							>
								Temizle
							</button>
						)}
					</span>
				</label>
			))}
		</div>
	);
}

const chevron = (open: boolean) =>
	open ? (
		<ChevronDown className='h-4 w-4 shrink-0' />
	) : (
		<ChevronRight className='h-4 w-4 shrink-0' />
	);

// Stacked, each card is its own collapsible box. Side by side it sits inside
// MaintenanceSection's shared panel, which owns the toggle, so the header is
// just a label. The body stays mounted either way so unsaved edits survive.
function SettingsCard({
	title,
	badge,
	collapsible,
	open,
	onToggle,
	children,
}: {
	title: string;
	badge: React.ReactNode;
	collapsible: boolean;
	open: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}) {
	const header = (
		<>
			{title}
			<span className='flex items-center gap-2 font-normal'>
				{badge}
				{collapsible && chevron(open)}
			</span>
		</>
	);
	const headerClass =
		'flex w-full flex-wrap items-center justify-between gap-2 text-left font-medium';

	return (
		<section
			className={`flex flex-col gap-3 rounded-xl p-3 text-sm ${
				collapsible ? 'bg-button-bg' : 'border border-border'
			}`}
		>
			{collapsible ? (
				<button
					type='button'
					onClick={onToggle}
					aria-expanded={open}
					className={headerClass}
				>
					{header}
				</button>
			) : (
				<div className={headerClass}>{header}</div>
			)}
			<div className={open ? 'flex flex-col gap-3' : 'hidden'}>{children}</div>
		</section>
	);
}

export function MaintenanceSection() {
	const { data } = useSiteStatus();
	const now = useScheduleClock(data?.maintenance, data?.notice);
	const { width } = useWindowSize();
	const isRow = width >= ROW_LAYOUT_MIN_WIDTH;
	// Collapsed by default, like BulkEditPanel.
	const [rowOpen, setRowOpen] = useState(false);
	const [openCards, setOpenCards] = useState<Record<CardName, boolean>>({
		maintenance: false,
		notice: false,
	});
	if (!data) return null;

	const cardProps = (card: CardName) => ({
		collapsible: !isRow,
		open: isRow || openCards[card],
		onToggle: () => setOpenCards((prev) => ({ ...prev, [card]: !prev[card] })),
	});

	// The forms keep the same position in the tree in both layouts, so
	// resizing across the breakpoint doesn't wipe unsaved edits. Each one
	// remounts on a server-side change so it shows the saved state.
	return (
		<section
			className={
				isRow
					? 'mb-3 flex flex-col gap-3 rounded-xl bg-button-bg p-3 text-sm'
					: 'mb-3 flex flex-col gap-3'
			}
		>
			{isRow && (
				<button
					type='button'
					onClick={() => setRowOpen((open) => !open)}
					aria-expanded={rowOpen}
					className='flex w-full flex-wrap items-center justify-between gap-2 text-left font-medium'
				>
					Site ayarları
					<span className='flex flex-wrap items-center gap-2 font-normal'>
						<span className='text-xs opacity-70'>Bakım</span>
						<PhaseBadge
							schedule={data.maintenance}
							phase={getSchedulePhase(data.maintenance, now)}
							activeLabel='Site kapalı'
							activeTone='red'
						/>
						<span className='text-xs opacity-70'>Duyuru</span>
						<PhaseBadge
							schedule={data.notice}
							phase={getSchedulePhase(data.notice, now)}
							activeLabel='Yayında'
							activeTone='green'
						/>
						{chevron(rowOpen)}
					</span>
				</button>
			)}
			<div
				className={
					isRow ? (rowOpen ? 'grid grid-cols-2 gap-3' : 'hidden') : 'contents'
				}
			>
				<MaintenanceForm
					key={JSON.stringify(data.maintenance)}
					maintenance={data.maintenance}
					now={now}
					{...cardProps('maintenance')}
				/>
				<NoticeForm
					key={JSON.stringify(data.notice)}
					notice={data.notice}
					now={now}
					{...cardProps('notice')}
				/>
			</div>
		</section>
	);
}

type CardControlProps = {
	collapsible: boolean;
	open: boolean;
	onToggle: () => void;
};

function MaintenanceForm({
	maintenance,
	now,
	...cardControl
}: {
	maintenance: MaintenanceDto;
	now: number;
} & CardControlProps) {
	const [enabled, setEnabled] = useState(maintenance.enabled);
	const [message, setMessage] = useState(maintenance.message ?? '');
	const [from, setFrom] = useState(toLocalInputValue(maintenance.from));
	const [until, setUntil] = useState(toLocalInputValue(maintenance.until));
	const updateMaintenance = useUpdateMaintenance();

	function handleSave() {
		const error = validateSchedule(enabled, from, until);
		if (error) {
			toast.error(error);
			return;
		}
		updateMaintenance.mutate(
			{
				enabled,
				message: message.trim() || null,
				from: toIso(from),
				until: toIso(until),
			},
			{
				onSuccess: () => toast.success('Bakım ayarları kaydedildi'),
				onError: (err) =>
					toast.error('Kaydedilemedi', { description: err.message }),
			},
		);
	}

	return (
		<SettingsCard
			title='Bakım modu'
			{...cardControl}
			badge={
				<PhaseBadge
					schedule={maintenance}
					phase={getSchedulePhase(maintenance, now)}
					activeLabel='Site kapalı'
					activeTone='red'
				/>
			}
		>
			<p className='opacity-70'>
				Aktifken ziyaretçiler tüm sayfalarda bilgilendirme ekranını görür.
				Yönetim paneli etkilenmez.
			</p>

			<Switch
				checked={enabled}
				onChange={setEnabled}
				label='Bakım modunu etkinleştir'
			/>

			<label className='flex flex-col gap-1'>
				<span className='opacity-70'>Ziyaretçilere gösterilecek mesaj</span>
				<textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					rows={3}
					maxLength={1000}
					placeholder='Hizmetimiz geçici olarak kullanılamıyor.'
					className={inputClass}
				/>
			</label>

			<ScheduleFields
				from={from}
				until={until}
				onFromChange={setFrom}
				onUntilChange={setUntil}
			/>

			<button
				type='button'
				onClick={handleSave}
				disabled={updateMaintenance.isPending}
				className={`self-start ${buttonClass}`}
			>
				{updateMaintenance.isPending ? 'Kaydediliyor...' : 'Kaydet'}
			</button>
		</SettingsCard>
	);
}

function NoticeForm({
	notice,
	now,
	...cardControl
}: {
	notice: NoticeDto;
	now: number;
} & CardControlProps) {
	const [enabled, setEnabled] = useState(notice.enabled);
	const [message, setMessage] = useState(notice.message ?? '');
	const [type, setType] = useState<NoticeType>(notice.type);
	const [pages, setPages] = useState<string[]>(notice.pages);
	const [dismissible, setDismissible] = useState(notice.dismissible);
	const [from, setFrom] = useState(toLocalInputValue(notice.from));
	const [until, setUntil] = useState(toLocalInputValue(notice.until));
	const updateNotice = useUpdateNotice();

	function togglePage(path: string) {
		setPages((current) =>
			current.includes(path)
				? current.filter((p) => p !== path)
				: [...current, path],
		);
	}

	function handleSave() {
		const error =
			enabled && !message.trim()
				? 'Duyuru mesajı boş olamaz'
				: validateSchedule(enabled, from, until);
		if (error) {
			toast.error(error);
			return;
		}
		updateNotice.mutate(
			{
				enabled,
				message: message.trim() || null,
				type,
				pages,
				dismissible,
				from: toIso(from),
				until: toIso(until),
			},
			{
				onSuccess: () => toast.success('Duyuru ayarları kaydedildi'),
				onError: (err) =>
					toast.error('Kaydedilemedi', { description: err.message }),
			},
		);
	}

	const chipClass = (selected: boolean) =>
		`rounded-full px-3 py-1 text-xs ${
			selected
				? 'bg-text text-bg'
				: 'bg-button-focus-bg hover:bg-button-hover-bg'
		}`;

	return (
		<SettingsCard
			title='Sayfa duyurusu'
			{...cardControl}
			badge={
				<PhaseBadge
					schedule={notice}
					phase={getSchedulePhase(notice, now)}
					activeLabel='Yayında'
					activeTone='green'
				/>
			}
		>
			<p className='opacity-70'>
				Seçilen sayfalarda köşede kalıcı bir bildirim gösterir. Site açık kalır.
			</p>

			<Switch
				checked={enabled}
				onChange={setEnabled}
				label='Duyuruyu etkinleştir'
			/>

			<label className='flex flex-col gap-1'>
				<span className='opacity-70'>Duyuru mesajı</span>
				<textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					rows={3}
					maxLength={1000}
					placeholder='Örn. alımlar durdurulmuştur.'
					className={inputClass}
				/>
			</label>

			<div className='flex flex-col gap-1'>
				<span className='opacity-70'>Tür</span>
				<div className='flex gap-2'>
					{(
						[
							['info', 'Bilgi'],
							['warning', 'Uyarı'],
						] as const
					).map(([value, label]) => (
						<button
							key={value}
							type='button'
							aria-pressed={type === value}
							onClick={() => setType(value)}
							className={chipClass(type === value)}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			<div className='flex flex-col gap-1'>
				<span className='opacity-70'>Gösterilecek sayfalar</span>
				<div className='flex flex-wrap gap-2'>
					<button
						type='button'
						aria-pressed={pages.length === 0}
						onClick={() => setPages([])}
						className={chipClass(pages.length === 0)}
					>
						Tüm sayfalar
					</button>
					{PUBLIC_PAGES.map((page) => (
						<button
							key={page.path}
							type='button'
							aria-pressed={pages.includes(page.path)}
							onClick={() => togglePage(page.path)}
							className={chipClass(pages.includes(page.path))}
						>
							{page.label}
						</button>
					))}
				</div>
			</div>

			<Switch
				checked={dismissible}
				onChange={setDismissible}
				label='Ziyaretçi kapatabilsin (o ziyaret boyunca gizlenir)'
			/>

			<ScheduleFields
				from={from}
				until={until}
				onFromChange={setFrom}
				onUntilChange={setUntil}
			/>

			<button
				type='button'
				onClick={handleSave}
				disabled={updateNotice.isPending}
				className={`self-start ${buttonClass}`}
			>
				{updateNotice.isPending ? 'Kaydediliyor...' : 'Kaydet'}
			</button>
		</SettingsCard>
	);
}
