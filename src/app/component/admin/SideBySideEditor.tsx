import { useMemo, useState } from 'react';
import type { ItemDto } from '../../hooks/api/endpoints/useItems';
import type { EditableField, EditableInventoryItem } from '../../types';
import { EDITABLE_FIELD_KEYS, fieldMeta } from '../../constants/fieldRegistry.constant';
import type { ItemRule } from '../../helpers/adminPageHelpers/itemRules.helper';
import { buildStorageEditGroups, planStorageEdit, type StorageEditPlan } from '../../helpers/adminPageHelpers/storageBulkEdit.helper';
import { ConfirmDialog } from './ConfirmDialog';
import { DisplayValue } from './DisplayValue';
import { StorageSizeInput } from '../StorageSizeInput';

type Props = {
	items: ItemDto[];
	rules: readonly ItemRule[];
	disabled: boolean;
	requireApproval: boolean;
	enterEnabled: boolean;
	escapeEnabled: boolean;
	onApply: (items: ItemDto[], fields: Partial<EditableInventoryItem>) => Promise<void | number>;
};

export function SideBySideEditor({ items, rules, disabled, requireApproval, enterEnabled, escapeEnabled, onApply }: Props) {
	const [open, setOpen] = useState(false);
	const [field, setField] = useState<EditableField>('fiyat');
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	const [skipExceptions, setSkipExceptions] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [pending, setPending] = useState<StorageEditPlan[] | null>(null);
	const [completed, setCompleted] = useState(0);
	const groups = useMemo(() => buildStorageEditGroups(items, field), [items, field]);
	const meta = fieldMeta(field);
	const busy = saving || disabled || Boolean(pending);
	const rows = useMemo(() => open ? groups.map((group) => {
		const value = drafts[group.id] ?? String(group.commonValue ?? '');
		try { return { group, value, plan: planStorageEdit(group, field, value, rules, skipExceptions), error: '' }; }
		catch (error) { return { group, value, plan: null, error: (error as Error).message }; }
	}) : [], [open, groups, drafts, field, rules, skipExceptions]);
	const plans = rows.flatMap((row) => Object.hasOwn(drafts, row.group.id) && row.plan?.items.length ? [row.plan] : []);
	const invalidDraft = rows.some((row) => Object.hasOwn(drafts, row.group.id) && row.error);
	const affected = plans.reduce((count, plan) => count + plan.items.length, 0);

	function updateValue(id: string, value: string) {
		setDrafts((current) => ({ ...current, [id]: value })); setError(''); setCompleted(0);
	}
	async function apply(targets: StorageEditPlan[]) {
		if (saving || disabled) return;
		setSaving(true); setError(''); setCompleted(0);
		let applied = 0;
		try {
			for (const target of targets) {
				// The bulk endpoint accepts at most 1000 selected products per request.
				for (let start = 0; start < target.items.length; start += 1000) {
					const batch = target.items.slice(start, start + 1000);
					const updatedCount = await onApply(batch, target.fields);
					applied += typeof updatedCount === 'number' ? updatedCount : batch.length; setCompleted(applied);
				}
				setDrafts((current) => { const next = { ...current }; delete next[target.group.id]; return next; });
			}
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError')) setError(`${applied} ürün uygulandı. ${(error as Error).message}`);
		}
		finally { setSaving(false); }
	}
	function requestApply(targets: StorageEditPlan[]) {
		if (busy || !targets.length) return;
		if (requireApproval) setPending(targets);
		else void apply(targets);
	}

	return <section className='mb-3 min-w-0 max-w-full rounded-xl bg-button-bg p-3'>
		<button type='button' aria-expanded={open} disabled={saving} onClick={() => setOpen((value) => !value)} className='max-w-full text-left text-sm font-medium'>Depolama gruplarını toplu düzenle {open ? '▾' : '▸'}</button>
		{open && <div className='mt-3 flex min-w-0 flex-col gap-3'>
			<label className='flex min-w-0 max-w-full flex-col gap-1 self-start text-sm sm:flex-row sm:items-center sm:gap-2'>Değiştirilecek alan <select aria-label='Yan yana düzenlenecek alan' value={field} disabled={busy} onChange={(event) => { setField(event.target.value as EditableField); setDrafts({}); setError(''); setCompleted(0); }} className='min-w-0 max-w-full rounded bg-button-focus-bg p-2'>{EDITABLE_FIELD_KEYS.map((key) => <option key={key} value={key}>{fieldMeta(key).label}</option>)}</select></label>
			<label className='flex min-w-0 items-start gap-2 text-sm'><input type='checkbox' className='mt-1 shrink-0' checked={skipExceptions} disabled={busy} onChange={(event) => setSkipExceptions(event.target.checked)} /><span>Kural nedeniyle farklı değeri olan ürünleri atla</span></label>
			<p className='text-xs opacity-70'>Her satır bir depolama grubudur. En sık kullanılan değer başlangıç olarak gösterilir; fiyatlar para birimine göre ayrılır. Tümünü uygula yalnızca düzenlediğiniz satırları kaydeder. Kuralla çelişen değerler ayrıca onay ister.</p>
			<div className='grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2'>{(['eMMC', 'eMCP'] as const).map((type) => <section key={type} aria-label={`${type} düzenleme tablosu`} className='min-w-0 rounded-xl border border-border p-2'>
				<h3 className='mb-2 font-semibold'>{type}</h3>
				<table className='block w-full min-w-0 text-left text-sm sm:table'><thead className='hidden sm:table-header-group'><tr><th className='p-2'>Depolama</th><th className='p-2'>En sık {meta.label.toLowerCase()}</th><th className='p-2'>Yeni değer</th><th className='p-2'>İşlem</th></tr></thead>
					<tbody className='block sm:table-row-group'>{rows.filter(({ group }) => group.type === type).map(({ group, value, plan, error: rowError }) => <tr key={group.id} className='grid min-w-0 grid-cols-2 border-t border-border align-top sm:table-row'>
						<td className='block min-w-0 p-2 font-medium [overflow-wrap:anywhere] sm:table-cell'><span className='mb-1 block text-xs font-normal opacity-60 sm:hidden'>Depolama</span>{group.label}<div className='text-xs font-normal opacity-60'>{group.items.length} ürün</div></td>
						<td className='block min-w-0 p-2 [overflow-wrap:anywhere] sm:table-cell'><span className='mb-1 block text-xs opacity-60 sm:hidden'>En sık {meta.label.toLowerCase()}</span><DisplayValue value={group.commonValue} /> {group.currency}<div className='text-xs opacity-60'>{group.commonCount}/{group.items.length} ürün</div></td>
						<td className='col-span-2 block min-w-0 p-2 sm:table-cell'><label className='block min-w-0 max-w-full'><span className='mb-1 block text-xs opacity-60 sm:hidden'>Yeni değer</span><span className='sr-only'>{type} {group.label} {group.currency}: {meta.label}</span>
							{meta.options ? <select value={value} disabled={busy} onChange={(event) => updateValue(group.id, event.target.value)} className='w-full min-w-0 max-w-full rounded bg-button-focus-bg p-2 sm:w-auto'>{meta.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
								: field === 'depolama' ? <StorageSizeInput value={value === '' ? '' : Number(value)} disabled={busy} onChange={(change) => updateValue(group.id, String(typeof change === 'function' ? change(value === '' ? '' : Number(value)) : change))} className='rounded bg-button-focus-bg p-1' />
								: <input type={meta.kind === 'number' ? 'number' : 'text'} step='any' min={meta.kind === 'number' ? 0 : undefined} value={value} disabled={busy} onChange={(event) => updateValue(group.id, event.target.value)} className='w-full min-w-0 max-w-full rounded bg-button-focus-bg p-2 sm:w-24' />}
						</label>{Object.hasOwn(drafts, group.id) && rowError && <p role='alert' className='text-xs text-red-500 [overflow-wrap:anywhere]'>{rowError}</p>}</td>
						<td className='col-span-2 block min-w-0 p-2 sm:table-cell'><button type='button' aria-label={`${type} ${group.label} ${group.currency} uygula`} disabled={busy || !plan?.items.length} onClick={() => plan && requestApply([plan])} className='w-full rounded bg-button-focus-bg px-3 py-2 disabled:opacity-40 sm:w-auto'>Uygula</button><div className='mt-1 text-xs opacity-70'>{plan?.items.length ?? 0} değişecek{Boolean(plan?.skipped) && <span className='block'>{plan!.skipped} kural istisnası atlanacak</span>}</div></td>
					</tr>)}</tbody>
				</table>{!rows.some(({ group }) => group.type === type) && <p className='p-2 text-xs opacity-60'>Ürün yok</p>}
			</section>)}</div>
			{error && <p role='alert' className='text-sm text-red-500 [overflow-wrap:anywhere]'>{error}</p>}
			{completed > 0 && <p role='status' className='text-sm'>{completed} ürün uygulandı.</p>}
			<button type='button' disabled={busy || !plans.length || invalidDraft} onClick={() => requestApply(plans)} className='w-full rounded-xl bg-button-focus-bg px-3 py-2 text-sm font-medium disabled:opacity-40 sm:w-auto sm:self-end'>{saving ? 'Uygulanıyor...' : `Tümünü uygula (${affected} ürün)`}</button>
		</div>}
		{pending && <ConfirmDialog title='Toplu değişikliği onayla' message={<div className='max-h-72 overflow-y-auto text-sm'>{pending.map((target) => <p key={target.group.id}>{target.group.type} {target.group.label}: <DisplayValue value={target.group.commonValue} /> → <DisplayValue value={target.fields[field] ?? null} /> {target.group.currency} ({target.items.length} ürün, {target.skipped} atlanan)</p>)}<p className='mt-2 text-xs opacity-70'>Kuralla çelişen değerler ayrıca onay ister.</p></div>} enterEnabled={enterEnabled} escapeEnabled={escapeEnabled} onCancel={() => setPending(null)} onConfirm={() => { const targets = pending; setPending(null); void apply(targets); }} />}
	</section>;
}
