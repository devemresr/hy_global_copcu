import { useState } from 'react';
import {
	Plus,
	Pencil,
	Trash2,
	Layers,
	ChevronDown,
	ChevronRight,
	type LucideIcon,
} from 'lucide-react';
import {
	useGetLogEvents,
	type LogEventDto,
} from '../../hooks/api/endpoints/useLogEvents';
import { FIELD_REGISTRY } from '../../constants/fieldRegistry.constant';
import { DisplayValue } from './DisplayValue';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Both items and pricing rules log to the same collection (see the server's
// LogEvent model comment), so this covers both action sets rather than
// assuming every entry is an item edit.
const ACTION_LABELS: Record<string, string> = {
	'items:create': 'Ürün oluşturuldu',
	'items:update': 'Ürün güncellendi',
	'items:delete': 'Ürün silindi',
	'items:add_rule': 'Fiyat kuralı eklendi',
	'items:edit_rule': 'Fiyat kuralı düzenlendi',
	'items:delete_rule': 'Fiyat kuralı silindi',
};

// Groups both action sets into the same three visual buckets - an added
// pricing rule reads the same as a created item to an admin skimming the
// list, so they share create/update/delete's color and icon instead of each
// action getting its own.
type ActionKind = 'create' | 'update' | 'delete';

const ACTION_KIND: Record<string, ActionKind> = {
	'items:create': 'create',
	'items:update': 'update',
	'items:delete': 'delete',
	'items:add_rule': 'create',
	'items:edit_rule': 'update',
	'items:delete_rule': 'delete',
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
};

// Pricing-rule fields (category/sizeGb/price/currency) aren't in
// FIELD_REGISTRY - fall back to the raw field name for those.
function fieldLabel(field: string): string {
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

// A "1 … 4 5 6 … 42"-style window instead of just Önceki/Sonraki - always
// anchored on the first and last page, with a small run around the current
// one, and an ellipsis standing in for whatever's skipped in between.
function getPageWindow(
	current: number,
	total: number,
	delta = 1,
): (number | 'ellipsis')[] {
	if (total <= 1) return [1];

	const left = Math.max(2, current - delta);
	const right = Math.min(total - 1, current + delta);
	const pages: (number | 'ellipsis')[] = [1];

	if (left > 2) pages.push('ellipsis');
	for (let p = left; p <= right; p++) pages.push(p);
	if (right < total - 1) pages.push('ellipsis');
	pages.push(total);

	return pages;
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
					{ACTION_LABELS[event.action] ?? event.action}
				</span>
				<span className='font-medium'>{event.entityKey}</span>
				<span className='opacity-60'>· {event.adminUsername}</span>
				<span className='ml-auto text-xs opacity-50'>
					{new Date(event.createdAt).toLocaleString('tr-TR')}
				</span>
			</div>

			{changedFields.length > 0 && (
				<div className='flex flex-col gap-1 pl-1 text-xs'>
					{changedFields.map((f, i) => (
						<div key={i} className='flex items-center gap-1.5 opacity-80'>
							<span className='font-medium'>{fieldLabel(f.field)}:</span>
							<DisplayValue value={f.previousValue} />
							<span className='opacity-50'>→</span>
							<DisplayValue value={f.newValue} />
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
					<DisplayValue value={field.newValue} />
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
							<DisplayValue value={e.fields[0].previousValue} />
							<span className='opacity-50'>→</span>
							<DisplayValue value={e.fields[0].newValue} />
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
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
		new Set(),
	);

	const { data, status, isPlaceholderData } = useGetLogEvents(page, pageSize);
	const events = data?.events ?? [];
	const totalPages = data?.totalPages ?? 1;

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

			{status === 'pending' && (
				<p className='text-sm opacity-70'>Yükleniyor...</p>
			)}
			{status === 'error' && (
				<p className='text-sm text-red-500'>Geçmiş yüklenemedi</p>
			)}

			{status === 'success' && (
				<div className='flex flex-col gap-3 text-sm'>
					<div className='flex flex-col gap-2' style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
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

					<div className='flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3'>
						<label className='flex items-center gap-2'>
							<span className='opacity-70'>Sayfa başına:</span>
							<select
								value={pageSize}
								onChange={(e) => {
									setPageSize(Number(e.target.value));
									setPage(1);
								}}
								className='rounded-xl bg-button-focus-bg px-2 py-1'
							>
								{PAGE_SIZE_OPTIONS.map((size) => (
									<option key={size} value={size}>
										{size}
									</option>
								))}
							</select>
						</label>
						<span className='text-xs opacity-70'>
							{data?.total ?? 0} kayıt
						</span>
					</div>

					<div className='flex flex-wrap items-center gap-1 border-t border-border pt-3'>
						<button
							type='button'
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page <= 1}
							className='rounded-xl bg-button-focus-bg px-3 py-1.5 font-medium hover:bg-button-hover-bg disabled:opacity-40'
						>
							Önceki
						</button>
						{getPageWindow(page, totalPages).map((entry, i) =>
							entry === 'ellipsis' ? (
								<span
									key={`ellipsis-${i}`}
									className='px-1.5 opacity-50'
								>
									…
								</span>
							) : (
								<button
									key={entry}
									type='button'
									onClick={() => setPage(entry)}
									disabled={entry === page}
									className={`rounded-xl px-3 py-1.5 font-medium hover:bg-button-hover-bg disabled:opacity-100 ${
										entry === page
											? 'bg-button-focus-bg'
											: 'bg-button-bg'
									}`}
								>
									{entry}
								</button>
							),
						)}
						<button
							type='button'
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							disabled={page >= totalPages}
							className='rounded-xl bg-button-focus-bg px-3 py-1.5 font-medium hover:bg-button-hover-bg disabled:opacity-40'
						>
							Sonraki
						</button>
					</div>
				</div>
			)}
		</>
	);
}
