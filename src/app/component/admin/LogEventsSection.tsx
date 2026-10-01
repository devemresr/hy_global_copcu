import { useState } from 'react';
import {
	Plus,
	Pencil,
	Trash2,
	Layers,
	ChevronDown,
	ChevronRight,
	Wrench,
	Megaphone,
	type LucideIcon,
} from 'lucide-react';
import {
	useGetLogEvents,
	type LogEntityType,
	type LogEventDto,
	type LogEventFieldChange,
} from '../../hooks/api/endpoints/useLogEvents';
import { FIELD_REGISTRY } from '../../constants/fieldRegistry.constant';
import { PUBLIC_PAGES } from '../../constants/publicPages.constant';
import { DisplayValue } from './DisplayValue';
import { Pagination } from './Pagination';

// Items and site settings log to the same collection (see the server's
// LogEvent model comment), so this covers both action sets rather than
// assuming every entry is an item edit.
const ACTION_LABELS: Record<string, string> = {
	'items:create': 'Ürün oluşturuldu',
	'items:update': 'Ürün güncellendi',
	'items:delete': 'Ürün silindi',
	'site:maintenance_update': 'Bakım modu güncellendi',
	'site:notice_update': 'Duyuru güncellendi',
};

// Site-settings changes get their own kinds (and colors) so they stand out
// from routine catalog edits.
type ActionKind = 'create' | 'update' | 'delete' | 'maintenance' | 'notice';

const ACTION_KIND: Record<string, ActionKind> = {
	'items:create': 'create',
	'items:update': 'update',
	'items:delete': 'delete',
	'site:maintenance_update': 'maintenance',
	'site:notice_update': 'notice',
};

const ACTION_STYLE: Record<ActionKind, { icon: LucideIcon; badge: string }> = {
	create: {
		icon: Plus,
		badge: 'bg-green-500/15 text-green-600 dark:text-green-400',
	},
	update: {
		icon: Pencil,
		badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
	},
	delete: {
		icon: Trash2,
		badge: 'bg-red-500/15 text-red-600 dark:text-red-400',
	},
	maintenance: {
		icon: Wrench,
		badge: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400',
	},
	notice: {
		icon: Megaphone,
		badge: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
	},
};

const SITE_ENTITY_TYPES: LogEntityType[] = ['site_maintenance', 'site_notice'];

const SITE_FIELD_LABELS: Record<string, string> = {
	enabled: 'Durum',
	message: 'Mesaj',
	from: 'Başlangıç',
	until: 'Bitiş',
	type: 'Tür',
	pages: 'Sayfalar',
	dismissible: 'Ziyaretçi kapatabilir',
};

const PAGE_LABELS: Record<string, string> = Object.fromEntries(
	PUBLIC_PAGES.map((page) => [page.path, page.label]),
);

// Site-settings values are stored raw (booleans, ISO dates, comma-joined
// paths) - this turns them into what the admin panel shows.
function formatSiteValue(
	field: string,
	value: LogEventFieldChange['newValue'],
): string | null {
	switch (field) {
		case 'enabled':
			return value ? 'Açık' : 'Kapalı';
		case 'dismissible':
			return value ? 'Evet' : 'Hayır';
		case 'from':
			return value ? new Date(String(value)).toLocaleString('tr-TR') : 'Hemen';
		case 'until':
			return value
				? new Date(String(value)).toLocaleString('tr-TR')
				: 'Süresiz';
		case 'type':
			return value === 'warning' ? 'Uyarı' : 'Bilgi';
		case 'pages':
			return value
				? String(value)
						.split(', ')
						.map((path) => PAGE_LABELS[path] ?? path)
						.join(', ')
				: 'Tüm sayfalar';
		default:
			return value === null ? null : String(value);
	}
}

function formatValue(
	event: LogEventDto,
	field: string,
	value: LogEventFieldChange['newValue'],
): string | number | null {
	if (SITE_ENTITY_TYPES.includes(event.entityType)) {
		return formatSiteValue(field, value);
	}
	return typeof value === 'boolean' ? String(value) : value;
}

// A toggled `enabled` reads better as "opened"/"closed" than "updated".
function actionLabel(event: LogEventDto): string {
	const enabled = event.fields.find((f) => f.field === 'enabled');
	if (enabled && SITE_ENTITY_TYPES.includes(event.entityType)) {
		const subject =
			event.entityType === 'site_maintenance' ? 'Bakım modu' : 'Duyuru';
		return `${subject} ${enabled.newValue ? 'açıldı' : 'kapatıldı'}`;
	}
	return ACTION_LABELS[event.action] ?? event.action;
}

const LOG_FILTERS: { types: LogEntityType[]; label: string }[] = [
	{ types: ['item'], label: 'Ürünler' },
	{ types: ['site_maintenance'], label: 'Bakım modu' },
	{ types: ['site_notice'], label: 'Duyuru' },
];

// A field outside FIELD_REGISTRY (none currently, but any future one) falls
// back to its raw name instead of throwing.
function fieldLabel(field: string, entityType?: LogEntityType): string {
	if (entityType && SITE_ENTITY_TYPES.includes(entityType)) {
		return SITE_FIELD_LABELS[field] ?? field;
	}
	return (
		(FIELD_REGISTRY as Record<string, { label: string } | undefined>)[field]
			?.label ?? field
	);
}

// A cluster of adjacent entries from the same admin, setting the same field
// to the same value, within a tight time window is what a bulk edit's log
// looked like before the server started tagging bulk rows with a shared
// batchId (see listLogEvents/LogEvent's own comments) - kept here only as a
// fallback for rows recorded before that existed, which have no batchId to
// group by. A coincidence of that size happening within BULK_GROUP_WINDOW_MS
// of each other is vanishingly unlikely, so MIN_BULK_GROUP_SIZE+ of them is
// treated as one bulk event instead of that many separate ones.
const BULK_GROUP_WINDOW_MS = 15_000;
const MIN_BULK_GROUP_SIZE = 3;

type LogGroup =
	| { kind: 'single'; event: LogEventDto }
	| { kind: 'bulk'; events: LogEventDto[] };

function groupLogEvents(events: LogEventDto[]): LogGroup[] {
	const groups: LogGroup[] = [];
	const seenBatchIds = new Set<string>();
	let i = 0;

	while (i < events.length) {
		const event = events[i];

		// The server groups a bulk edit's rows under one batchId (see
		// listLogEvents), so this is exact - a single-row "batch" (every
		// matched row filtered down to no actual change but one) still renders
		// as a plain single entry since there's nothing to collapse.
		if (event.batchId) {
			if (seenBatchIds.has(event.batchId)) {
				i += 1;
				continue;
			}
			seenBatchIds.add(event.batchId);
			const batchEvents = events.filter((e) => e.batchId === event.batchId);
			groups.push(
				batchEvents.length > 1
					? { kind: 'bulk', events: batchEvents }
					: { kind: 'single', event: batchEvents[0] },
			);
			i += 1;
			continue;
		}

		const field = event.fields.length === 1 ? event.fields[0] : null;
		if (event.action !== 'items:update' || !field) {
			groups.push({ kind: 'single', event });
			i += 1;
			continue;
		}

		const startTime = new Date(event.createdAt).getTime();
		let j = i + 1;
		while (j < events.length) {
			const next = events[j];
			const nextField = next.fields.length === 1 ? next.fields[0] : null;
			const sameChange =
				!next.batchId &&
				next.action === event.action &&
				next.adminUsername === event.adminUsername &&
				nextField !== null &&
				nextField.field === field.field &&
				nextField.newValue === field.newValue;
			const withinWindow =
				Math.abs(new Date(next.createdAt).getTime() - startTime) <=
				BULK_GROUP_WINDOW_MS;
			if (!sameChange || !withinWindow) break;
			j += 1;
		}

		if (j - i >= MIN_BULK_GROUP_SIZE) {
			groups.push({ kind: 'bulk', events: events.slice(i, j) });
			i = j;
		} else {
			groups.push({ kind: 'single', event });
			i += 1;
		}
	}

	return groups;
}

function LogEventCard({ event }: { event: LogEventDto }) {
	const kind = ACTION_KIND[event.action] ?? 'update';
	const { icon: Icon, badge } = ACTION_STYLE[kind];
	// A create/delete entry logs every field, including ones left blank on
	// both sides - only a field that actually carries a value somewhere is
	// worth showing.
	const changedFields = event.fields.filter(
		(f) => f.previousValue !== null || f.newValue !== null,
	);

	return (
		<div className='flex flex-col gap-2 rounded-xl bg-button-bg px-3 py-2.5'>
			<div className='flex flex-wrap items-center gap-2'>
				<span
					className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}
				>
					<Icon className='h-3.5 w-3.5' />
					{actionLabel(event)}
				</span>
				{!SITE_ENTITY_TYPES.includes(event.entityType) && (
					<span className='font-medium'>{event.entityKey}</span>
				)}
				<span className='opacity-60'>· {event.adminUsername}</span>
				<span className='ml-auto text-xs opacity-50'>
					{new Date(event.createdAt).toLocaleString('tr-TR')}
				</span>
			</div>

			{changedFields.length > 0 && (
				<div className='flex flex-col gap-1 pl-1 text-xs'>
					{changedFields.map((f, i) => (
						<div key={i} className='flex items-center gap-1.5 opacity-80'>
							<span className='font-medium'>
								{fieldLabel(f.field, event.entityType)}:
							</span>
							<DisplayValue
								value={formatValue(event, f.field, f.previousValue)}
							/>
							<span className='opacity-50'>→</span>
							<DisplayValue value={formatValue(event, f.field, f.newValue)} />
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// Collapsed by default, same as BulkEditPanel itself - a bulk change's log is
// one card with a count instead of N indistinguishable "Ürün güncellendi"
// entries, expandable to the individual rows it actually touched.
function BulkGroupCard({
	events,
	expanded,
	onToggle,
}: {
	events: LogEventDto[];
	expanded: boolean;
	onToggle: () => void;
}) {
	const first = events[0];
	const field = first.fields[0];
	const latestCreatedAt = events.reduce(
		(latest, e) => (e.createdAt > latest ? e.createdAt : latest),
		first.createdAt,
	);

	return (
		<div className='flex flex-col gap-2 rounded-xl bg-button-bg px-3 py-2.5'>
			<button
				type='button'
				onClick={onToggle}
				className='flex w-full flex-wrap items-center gap-2 text-left'
			>
				<span className='flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400'>
					<Layers className='h-3.5 w-3.5' />
					Toplu güncelleme
				</span>
				<span className='rounded-full bg-button-focus-bg px-2 py-0.5 text-xs opacity-70'>
					{events.length} öğe
				</span>
				<span className='flex items-center gap-1.5'>
					<span className='font-medium'>{fieldLabel(field.field)}:</span>
					<DisplayValue
						value={formatValue(first, field.field, field.newValue)}
					/>
				</span>
				<span className='opacity-60'>· {first.adminUsername}</span>
				<span className='ml-auto flex items-center gap-1 text-xs opacity-50'>
					{new Date(latestCreatedAt).toLocaleString('tr-TR')}
					{expanded ? (
						<ChevronDown className='h-3.5 w-3.5' />
					) : (
						<ChevronRight className='h-3.5 w-3.5' />
					)}
				</span>
			</button>

			{expanded && (
				<ul className='flex flex-col gap-1 pl-1 text-xs'>
					{events.slice(0, 50).map((e) => (
						<li key={e._id} className='flex items-center gap-1.5 opacity-80'>
							<span className='font-medium'>{e.entityKey}:</span>
							<DisplayValue
								value={formatValue(
									e,
									e.fields[0].field,
									e.fields[0].previousValue,
								)}
							/>
							<span className='opacity-50'>→</span>
							<DisplayValue
								value={formatValue(e, e.fields[0].field, e.fields[0].newValue)}
							/>
						</li>
					))}
					{events.length > 50 && (
						<li className='opacity-50'>+{events.length - 50} diğer</li>
					)}
				</ul>
			)}
		</div>
	);
}

export function LogEventsSection() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	// Which bulk groups (keyed by their first event's id) are expanded -
	// collapsed by default, same as BulkEditPanel itself.
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

	// Empty means every type ("Tümü").
	const [types, setTypes] = useState<LogEntityType[]>([]);

	const { data, status, isPlaceholderData } = useGetLogEvents(
		page,
		pageSize,
		types,
	);
	const events = data?.events ?? [];
	const totalPages = data?.totalPages ?? 1;

	function toggleFilter(filterTypes: LogEntityType[]) {
		setTypes((current) => {
			const isOn = filterTypes.every((t) => current.includes(t));
			const next = isOn
				? current.filter((t) => !filterTypes.includes(t))
				: [...current, ...filterTypes];
			// Every filter on is the same as "Tümü".
			return next.length === LOG_FILTERS.flatMap((f) => f.types).length
				? []
				: next;
		});
		setPage(1);
	}

	const chipClass = (selected: boolean) =>
		`rounded-full px-3 py-1 text-xs ${
			selected ? 'bg-text text-bg' : 'bg-button-bg hover:bg-button-hover-bg'
		}`;

	function toggleGroup(id: string) {
		setExpandedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	return (
		<>
			<h2 className='text-lg font-semibold mt-8 mb-2'>Değişiklik Geçmişi</h2>

			<div
				className='mb-3 flex flex-wrap gap-2'
				role='group'
				aria-label='Kayıt filtresi'
			>
				<button
					type='button'
					aria-pressed={types.length === 0}
					onClick={() => {
						setTypes([]);
						setPage(1);
					}}
					className={chipClass(types.length === 0)}
				>
					Tümü
				</button>
				{LOG_FILTERS.map((filter) => {
					const selected = filter.types.every((t) => types.includes(t));
					return (
						<button
							key={filter.label}
							type='button'
							aria-pressed={selected}
							onClick={() => toggleFilter(filter.types)}
							className={chipClass(selected)}
						>
							{filter.label}
						</button>
					);
				})}
			</div>

			{status === 'pending' && (
				<p className='text-sm opacity-70'>Yükleniyor...</p>
			)}
			{status === 'error' && (
				<p className='text-sm text-red-500'>Geçmiş yüklenemedi</p>
			)}

			{status === 'success' && (
				<div className='flex flex-col gap-3 text-sm'>
					<div
						className='flex flex-col gap-2'
						style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
					>
						{events.length === 0 && (
							<p className='opacity-70'>Henüz kayıt yok</p>
						)}
						{groupLogEvents(events).map((group) =>
							group.kind === 'single' ? (
								<LogEventCard key={group.event._id} event={group.event} />
							) : (
								<BulkGroupCard
									key={group.events[0]._id}
									events={group.events}
									expanded={expandedGroups.has(group.events[0]._id)}
									onToggle={() => toggleGroup(group.events[0]._id)}
								/>
							),
						)}
					</div>

					<Pagination
						page={page}
						totalPages={totalPages}
						onPageChange={setPage}
						pageSize={pageSize}
						onPageSizeChange={(size) => {
							setPageSize(size);
							setPage(1);
						}}
						summary={`${data?.total ?? 0} kayıt`}
					/>
				</div>
			)}
		</>
	);
}
