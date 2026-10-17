import { useState } from 'react';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { fieldLabel } from '../../constants/fieldRegistry.constant';
import { FILTER_OPERATORS, newFilterCondition, type FilterCondition } from '../../helpers/adminPageHelpers/filterConditions.helper';
import { validateItemRule, type ItemRule } from '../../helpers/adminPageHelpers/itemRules.helper';
import type { BulkAction } from '../../helpers/adminPageHelpers/bulkEdit.helper';
import { FilterConditionEditor } from './FilterConditionEditor';
import { BulkActionEditor } from './BulkActionEditor';
import { FilterWorkspace } from './FilterWorkspace';
import { ConfirmDialog } from './ConfirmDialog';
import { Switch } from './Switch';

export function ItemRulesPanel({ rules, onChange, disabled = false }: { rules: ItemRule[]; onChange: (rules: ItemRule[]) => void | Promise<void>; disabled?: boolean }) {
	const [open, setOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [name, setName] = useState('');
	const [conditions, setConditions] = useState<FilterCondition[]>([{ ...newFilterCondition(), field: 'model', op: 'contains' }]);
	const [actions, setActions] = useState<BulkAction[]>([{ field: 'fiyat', value: '' }]);
	const [error, setError] = useState('');
	const [deleting, setDeleting] = useState<ItemRule | null>(null);
	const [saving, setSaving] = useState(false);
	const buttonClass = 'rounded-lg bg-button-focus-bg px-2 py-1 text-xs hover:bg-button-hover-bg disabled:opacity-30';
	function reset() {
		setEditingId(null); setName(''); setError('');
		setConditions([{ ...newFilterCondition(), field: 'model', op: 'contains' }]);
		setActions([{ field: 'fiyat', value: '' }]);
	}
	async function persist(next: ItemRule[]) {
		if (saving || disabled) return false;
		setSaving(true);
		try { await onChange(next); setError(''); return true; }
		catch (error) { setError((error as { message?: string }).message ?? 'Kurallar kaydedilemedi.'); return false; }
		finally { setSaving(false); }
	}
	async function save() {
		try {
			const rule = validateItemRule({
				id: editingId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
				name, conditions, actions,
				enabled: editingId ? rules.find((item) => item.id === editingId)?.enabled ?? true : true,
			});
			if (await persist(editingId ? rules.map((item) => item.id === editingId ? rule : item) : [...rules, rule])) reset();
		} catch { setError('Kural adı, tamamlanmış koşullar ve geçerli varsayılan değerler girin.'); }
	}
	function move(index: number, offset: number) {
		const next = [...rules];
		[next[index], next[index + offset]] = [next[index + offset], next[index]];
		persist(next);
	}
	return (
		<section id='item-creation-rules' className='mb-3 flex flex-col gap-3 rounded-xl bg-button-bg p-3 text-sm'>
			<button type='button' aria-expanded={open} onClick={() => setOpen((value) => !value)} className='flex items-center justify-between gap-2 text-left font-medium'>
				<span>Yeni Ürün Kuralları <span className='text-xs opacity-60'>({rules.filter((rule) => rule.enabled).length} etkin)</span></span>
				{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
			</button>
			{open && <fieldset disabled={saving || disabled} className='flex min-w-0 flex-col gap-3'>
				<p className='text-xs opacity-70'>Yeni ürün oluştururken eşleşen alanlar otomatik doldurulur. Kurallar yukarıdan aşağıya uygulanır; aynı alan için ilk eşleşen kural geçerlidir. Mevcut ürünler değiştirilmez.</p>
				<p className='text-xs opacity-60'>Kurallar sunucuda saklanır ve yeni ürün formunda uygulanır.</p>
				<ol className='flex flex-col gap-2'>
					{rules.map((rule, index) => <li key={rule.id} id={`item-rule-${rule.id}`} className='rounded-xl bg-button-focus-bg p-3'>
						<div className='flex flex-wrap items-center gap-2'>
							<b className='min-w-0 flex-1 break-words'>{index + 1}. {rule.name}</b>
							<Switch checked={rule.enabled} disabled={saving || disabled} label={<span className='text-xs'>Etkin</span>} onChange={(enabled) => { void persist(rules.map((item) => item.id === rule.id ? { ...item, enabled } : item)); }} />
							<button type='button' aria-label={`${rule.name} önceliğini artır`} className={buttonClass} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
							<button type='button' aria-label={`${rule.name} önceliğini azalt`} className={buttonClass} disabled={index === rules.length - 1} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
							<button type='button' className={buttonClass} onClick={() => { setEditingId(rule.id); setName(rule.name); setConditions(rule.conditions.map((condition) => ({ ...newFilterCondition(), ...condition }))); setActions(rule.actions.map((action) => ({ ...action }))); setError(''); }}>Düzenle</button>
							<button type='button' className={buttonClass} onClick={() => setDeleting(rule)}>Sil</button>
						</div>
						<p className='mt-2 text-xs opacity-70'>{rule.conditions.map((condition) => `${fieldLabel(condition.field)} ${FILTER_OPERATORS.find((operator) => operator.value === condition.op)?.label ?? condition.op} ${condition.value}`).join(' ve ')}</p>
						<p className='mt-1 text-xs text-amber-700 dark:text-amber-300'>{rule.actions.map((action) => `${fieldLabel(action.field)} → ${action.value || 'boş'}`).join(', ')}</p>
					</li>)}
				</ol>
				{rules.length === 0 && <p className='text-xs opacity-60'>Henüz kural yok. Örnek: Model içerir “pa” → Fiyat 150.</p>}
				<div className='flex flex-col gap-3 border-t border-border pt-3'>
					<h3 className='font-medium'>{editingId ? 'Kuralı düzenle' : 'Kural ekle'}</h3>
					<label className='flex flex-col gap-1 text-xs'>Kural adı<input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} className='rounded-xl bg-button-focus-bg px-2 py-2' placeholder='Örn. PA modelleri için fiyat' /></label>
					<FilterWorkspace conditions={conditions} onLoad={(saved) => setConditions(saved.map((condition) => ({ ...newFilterCondition(), ...condition })))}>
						<FilterConditionEditor conditions={conditions} onChange={setConditions} />
						<h4 className='text-xs font-medium'>Varsayılan değerler</h4>
						<BulkActionEditor actions={actions} onChange={setActions} idPrefix='rule-action' />
					</FilterWorkspace>
					{error && <p role='alert' className='text-xs text-red-600 dark:text-red-400'>{error}</p>}
					<div className='flex gap-2'>
						<button type='button' onClick={save} className={buttonClass}>{editingId ? 'Kuralı güncelle' : 'Kuralı kaydet'}</button>
						{editingId && <button type='button' className={buttonClass} onClick={reset}>Vazgeç</button>}
					</div>
				</div>
			</fieldset>}
			{deleting && <ConfirmDialog title='Kuralı sil' message={`“${deleting.name}” kuralı silinecek. Yeni ürünler için artık uygulanmayacak.`} onCancel={() => setDeleting(null)} onConfirm={() => { const id = deleting.id; setDeleting(null); void persist(rules.filter((rule) => rule.id !== id)).then((success) => { if (success && editingId === id) reset(); }); }} />}
		</section>
	);
}
