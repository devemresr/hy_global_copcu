import type { ComponentType } from 'react';
import type { EditableField } from '../../types';
import { DisplayValue } from './DisplayValue';

type AdminFieldCellProps = {
	value: unknown;
	data: Record<string, unknown> & { _id: string };
	colDef: { field?: string; headerName?: string };
	// The column's original cellRenderer (e.g. HighlightCellRenderer for
	// Model's search-match highlighting), rendered in place of the raw value
	// when one was set - this wrapper only adds the buttons around it.
	displayRenderer?: ComponentType<any>;
	onEdit: (row: any, field: EditableField, label: string) => void;
	// Omitted by Admin.tsx for fields the schema requires (e.g. model) - a
	// delete button that always fails validation doesn't make sense there.
	onDelete?: (row: any, field: EditableField, label: string) => void;
	// ag-grid computes this from the column's own valueFormatter regardless of
	// the custom cellRenderer below, so the raw-value fallback can still show
	// e.g. "128 GB" instead of the bare magnitude.
	valueFormatted?: string;
	// Every cell shares Admin.tsx's one updateAnyItemMutation instance (see its
	// own comment), so there's no per-row/field pending state to key off of -
	// disabling every cell's buttons while any one of them is in flight is what
	// keeps a fast double-click from firing a duplicate PATCH for the same edit.
	disabled?: boolean;
	[key: string]: unknown;
};

// Wraps every editable column's cell (see Admin.tsx's colDef construction)
// with a small edit/delete button pair, so admins can change or clear one
// field on one row without opening the whole-row edit modal.
export function AdminFieldCell(props: AdminFieldCellProps) {
	const {
		value,
		valueFormatted,
		data,
		colDef,
		displayRenderer: Display,
		onEdit,
		onDelete,
		disabled,
	} = props;
	const field = colDef.field as EditableField;
	const label = colDef.headerName || field;

	return (
		<div className='flex h-full w-full items-center justify-between gap-1'>
			<span className='truncate min-w-0'>
				{Display ? (
					<Display {...props} />
				) : (
					<DisplayValue
						value={valueFormatted ?? (value as string | number | null)}
					/>
				)}
			</span>
			<span className='flex shrink-0 gap-1'>
				<button
					type='button'
					onClick={() => onEdit(data, field, label)}
					disabled={disabled}
					title={`${label} düzenle`}
					className='rounded bg-button-focus-bg px-1 text-[10px] leading-4 hover:bg-button-hover-bg disabled:opacity-40'
				>
					düzenle
				</button>
				{onDelete && (
					<button
						type='button'
						onClick={() => onDelete(data, field, label)}
						disabled={disabled}
						title={`${label} sil`}
						className='rounded bg-button-focus-bg px-1 text-[10px] leading-4 hover:bg-button-hover-bg disabled:opacity-40'
					>
						sil
					</button>
				)}
			</span>
		</div>
	);
}
