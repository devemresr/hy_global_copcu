import type { Dispatch, SetStateAction } from 'react';
import { FIELD_KEYS, OPS_BY_KIND, fieldMeta, type FieldKey } from '../../constants/fieldRegistry.constant';
import { FILTER_OPERATORS, newFilterCondition, type FilterCondition } from '../../helpers/adminPageHelpers/filterConditions.helper';

const fields = FIELD_KEYS.filter((field) => !['uretici', 'eslesmeTuru', 'sorgulananDeger'].includes(field));

export function FilterConditionEditor({ conditions, onChange }: {
	conditions: FilterCondition[];
	onChange: Dispatch<SetStateAction<FilterCondition[]>>;
}) {
	function update(id: string, patch: Partial<FilterCondition>) {
		onChange((current) => current.map((condition) => condition.id === id ? { ...condition, ...patch } : condition));
	}
	return (
		<div className='flex flex-col gap-2'>
			{conditions.map((condition) => {
				const meta = fieldMeta(condition.field);
				const operators = FILTER_OPERATORS.filter((operator) => OPS_BY_KIND[meta.kind].includes(operator.value));
				const needsValue = FILTER_OPERATORS.find((operator) => operator.value === condition.op)?.needsValue;
				return (
					<div key={condition.id} className='flex flex-wrap items-center gap-2'>
						<select aria-label='Koşul alanı' value={condition.field} className='max-w-full rounded-xl bg-button-focus-bg px-2 py-1' onChange={(event) => {
							const field = event.target.value as FieldKey;
							const allowed = OPS_BY_KIND[fieldMeta(field).kind];
							update(condition.id, { field, op: allowed.includes(condition.op) ? condition.op : allowed[0], value: '' });
						}}>
							{fields.map((field) => <option key={field} value={field}>{fieldMeta(field).label}</option>)}
						</select>
						<select aria-label='Koşul işleci' value={condition.op} className='max-w-full rounded-xl bg-button-focus-bg px-2 py-1' onChange={(event) => update(condition.id, { op: event.target.value as FilterCondition['op'] })}>
							{operators.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
						</select>
						{needsValue && (meta.options ? (
							<select aria-label='Koşul değeri' value={condition.value} className='rounded-xl bg-button-focus-bg px-2 py-1' onChange={(event) => update(condition.id, { value: event.target.value })}>
								<option value=''>Seçin</option>
								{meta.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
							</select>
						) : <input aria-label='Koşul değeri' type='text' value={condition.value} placeholder='Değer' onChange={(event) => update(condition.id, { value: event.target.value })} className='min-w-0 max-w-full rounded-xl bg-button-focus-bg px-2 py-1' />)}
						{conditions.length > 1 && <button type='button' aria-label='Koşulu sil' className='rounded-lg px-2 py-1 hover:bg-button-hover-bg' onClick={() => onChange((current) => current.filter((item) => item.id !== condition.id))}>×</button>}
					</div>
				);
			})}
			<button type='button' className='self-start rounded-xl bg-button-focus-bg px-2 py-1 text-xs' onClick={() => onChange((current) => [...current, newFilterCondition()])}>+ Koşul Ekle</button>
		</div>
	);
}
