import { useState } from 'react';
import { useGetLogEvents } from '../../hooks/api/endpoints/useLogEvents';
import { FIELD_REGISTRY } from '../../constants/fieldRegistry.constant';

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

// Pricing-rule fields (category/sizeGb/price/currency) aren't in
// FIELD_REGISTRY - fall back to the raw field name for those.
function fieldLabel(field: string): string {
	return (
		(FIELD_REGISTRY as Record<string, { label: string } | undefined>)[field]
			?.label ?? field
	);
}

export function LogEventsSection() {
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);

	const { data, status, isPlaceholderData } = useGetLogEvents(page, pageSize);
	const events = data?.events ?? [];
	const totalPages = data?.totalPages ?? 1;

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
						{events.map((event) => (
							<div
								key={event._id}
								className='rounded-xl bg-button-bg px-3 py-2'
							>
								<p>
									{new Date(event.createdAt).toLocaleString('tr-TR')} —{' '}
									{event.adminUsername} — {event.entityKey} —{' '}
									{ACTION_LABELS[event.action] ?? event.action}
								</p>
								{event.fields.map((f, i) => (
									<p key={i} className='pl-4 opacity-80'>
										{fieldLabel(f.field)}: {f.previousValue ?? '—'} →{' '}
										{f.newValue ?? '—'}
									</p>
								))}
							</div>
						))}
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

						<div className='flex items-center gap-2'>
							<button
								type='button'
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page <= 1}
								className='rounded-xl bg-button-focus-bg px-3 py-1.5 font-medium hover:bg-button-hover-bg disabled:opacity-40'
							>
								Önceki
							</button>
							<span className='opacity-70'>
								Sayfa {page} / {totalPages} ({data?.total ?? 0} kayıt)
							</span>
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
				</div>
			)}
		</>
	);
}
