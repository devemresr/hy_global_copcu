import { useState, type Dispatch, type SetStateAction } from 'react';
import { EDITABLE_FIELD_KEYS, fieldMeta } from '../../constants/fieldRegistry.constant';
import type { BulkAction } from '../../helpers/adminPageHelpers/bulkEdit.helper';
import type { EditableField } from '../../types';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';
import { CrossButton } from '../CrossButton';

const controlClass = 'h-9 min-w-0 max-w-full rounded-lg bg-button-focus-bg px-2 py-1.5 text-sm';

export function BulkActionEditor({ actions, onChange, idPrefix = 'bulk-action' }: {
	actions: BulkAction[];
	onChange: Dispatch<SetStateAction<BulkAction[]>>;
	idPrefix?: string;
}) {
	const [addingField, setAddingField] = useState(false);
	const availableFields = EDITABLE_FIELD_KEYS.filter((field) => !actions.some((action) => action.field === field));
	function updateValue(field: EditableField, update: SetStateAction<number | ''> | string) {
		onChange((current) => current.map((action) => {
			if (action.field !== field) return action;
			const numeric: number | '' = action.value === '' ? '' : Number(action.value);
			const value = typeof update === 'function' ? update(numeric) : update;
			return { ...action, value: String(value) };
		}));
	}
	return <div className='flex flex-col gap-2'>
		{actions.map((action) => {
			const meta = fieldMeta(action.field);
			return <div key={action.field} className='flex flex-wrap items-center gap-2'>
				<select aria-label='Değiştirilecek alan' value={action.field} className={controlClass} onChange={(event) => {
					const field = event.target.value as EditableField;
					onChange((current) => current.map((item) => item.field === action.field ? { field, value: fieldMeta(field).options?.[0]?.value ?? '' } : item));
				}}>
					{EDITABLE_FIELD_KEYS.filter((field) => field === action.field || !actions.some((item) => item.field === field)).map((field) => <option key={field} value={field}>{fieldMeta(field).label}</option>)}
				</select>
				<label className='min-w-0'>
					<span className='sr-only'>{meta.label}: Yeni değer</span>
					{meta.options ? <select value={action.value} onChange={(event) => updateValue(action.field, event.target.value)} className={controlClass}>
						{meta.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
					</select> : meta.kind === 'number' ? <NumberInputWithSteppers
						id={`${idPrefix}-${action.field}`}
						storage={action.field === 'depolama'}
						value={action.value === '' ? '' : Number(action.value)}
						steppers={meta.stepperValues}
						onChange={(update) => updateValue(action.field, update)}
						className={controlClass}
					/> : <input type='text' value={action.value} onChange={(event) => updateValue(action.field, event.target.value)} placeholder='Yeni değer' className={`w-36 ${controlClass}`} />}
				</label>
				<CrossButton label={`${meta.label} alanını kaldır`} disabled={actions.length === 1} onClick={() => onChange((current) => current.filter((item) => item.field !== action.field))} />
			</div>;
		})}
		{addingField ? (
			<select
				autoFocus
				aria-label='Eklenecek alan'
				className={`self-start ${controlClass}`}
				value=''
				onBlur={() => setAddingField(false)}
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						event.stopPropagation();
						setAddingField(false);
					}
				}}
				onChange={(event) => {
					const field = event.target.value as EditableField;
					if (!availableFields.includes(field)) return;
					onChange((current) => current.some((action) => action.field === field)
						? current
						: [...current, { field, value: fieldMeta(field).options?.[0]?.value ?? '' }]);
					setAddingField(false);
				}}
			>
				<option value='' disabled>Alan seçin</option>
				{availableFields.map((field) => <option key={field} value={field}>{fieldMeta(field).label}</option>)}
			</select>
		) : (
			<button type='button' disabled={availableFields.length === 0} className='self-start rounded-xl bg-button-focus-bg px-3 py-1 disabled:opacity-30' onClick={() => setAddingField(true)}>+ Alan ekle</button>
		)}
	</div>;
}
