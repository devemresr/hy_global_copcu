import type { Dispatch, SetStateAction } from 'react';
import { FIELD_KEYS, filterOpsForField, fieldMeta, type FieldKey } from '../../constants/fieldRegistry.constant';
import { FILTER_OPERATORS, newFilterCondition, type FilterCondition } from '../../helpers/adminPageHelpers/filterConditions.helper';
import { StorageSizeInput } from '../StorageSizeInput';
import { CrossButton } from '../CrossButton';

const fields = FIELD_KEYS.filter((field) => !['uretici', 'eslesmeTuru', 'sorgulananDeger'].includes(field));
const controlClass = 'h-9 min-w-0 max-w-full rounded-lg bg-button-focus-bg px-2 py-1.5 text-sm';

export function FilterConditionEditor({ conditions, onChange, allowedFields = fields }: {
	conditions: FilterCondition[];
	onChange: Dispatch<SetStateAction<FilterCondition[]>>;
	allowedFields?: readonly FieldKey[];
}) {
	function update(id: string, patch: Partial<FilterCondition>) {
		onChange((current) => current.map((condition) => condition.id === id ? { ...condition, ...patch } : condition));
	}
	return (
		<div className='flex flex-col gap-2'>
			{conditions.map((condition) => {
				const meta = fieldMeta(condition.field);
				const operators = FILTER_OPERATORS.filter((operator) => filterOpsForField(condition.field).includes(operator.value));
				const lengthFilter = condition.op.startsWith('length');
				const needsValue = FILTER_OPERATORS.find((operator) => operator.value === condition.op)?.needsValue;
				return (
					<div key={condition.id} className='flex flex-wrap items-center gap-2'>
						<select aria-label='Koşul alanı' value={condition.field} className={controlClass} onChange={(event) => {
							const field = event.target.value as FieldKey;
							const allowed = filterOpsForField(field);
							update(condition.id, { field, op: allowed.includes(condition.op) ? condition.op : allowed[0], value: '' });
						}}>
							{allowedFields.map((field) => <option key={field} value={field}>{fieldMeta(field).label}</option>)}
						</select>
						<select aria-label='Koşul işleci' value={condition.op} className={controlClass} onChange={(event) => update(condition.id, { op: event.target.value as FilterCondition['op'] })}>
							{operators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
						</select>
						{needsValue && (meta.options ? (
							<select aria-label='Koşul değeri' value={condition.value} className={controlClass} onChange={(event) => update(condition.id, { value: event.target.value })}>
								<option value=''>Seçin</option>
								{meta.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
							</select>
						) : condition.field === 'depolama' ? <label className='min-w-0 max-w-full'>
							<span className='sr-only'>Koşul değeri</span>
							<StorageSizeInput value={condition.value.trim() === '' ? '' : Number(condition.value)} onChange={(change) => {
								const current = condition.value.trim() === '' ? '' : Number(condition.value);
								const next = typeof change === 'function' ? change(current) : change;
								update(condition.id, { value: String(next) });
							}} className={controlClass} />
						</label> : <input aria-label='Koşul değeri' type={lengthFilter ? 'number' : 'text'} min={lengthFilter ? 0 : undefined} step={lengthFilter ? 1 : undefined} value={condition.value} placeholder={lengthFilter ? 'Karakter sayısı' : 'Değer'} onChange={(event) => update(condition.id, { value: event.target.value })} className={controlClass} />)}
						<CrossButton label='Koşulu sil' onClick={() => onChange((current) => current.length > 1 ? current.filter((item) => item.id !== condition.id) : [{ ...newFilterCondition(), field: condition.field }])} />
					</div>
				);
			})}
			<button type='button' className='self-start rounded-xl bg-button-focus-bg px-2 py-1 text-xs' onClick={() => onChange((current) => [...current, newFilterCondition()])}>+ Koşul Ekle</button>
		</div>
	);
}
