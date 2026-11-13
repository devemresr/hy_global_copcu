import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { RecordEditorModal } from './RecordEditorModal';
import {
	STOCK_CONTROL,
	STOCK_BUTTON,
} from '../../constants/stockStyles.constant';
import {
	useFinanceMutation,
	type FinanceCategory,
	type FinanceResponse,
} from '../../hooks/api/endpoints/useFinance';

function CategoryEditor({
	category,
	onClose,
	onSaved,
}: {
	category: FinanceCategory | null;
	onClose: () => void;
	onSaved: (category: FinanceCategory) => void;
}) {
	const save = useFinanceMutation<{
		requestId: string;
		name: string;
		group: 'other' | 'investment';
	}>(
		category
			? '/finance/categories/' + encodeURIComponent(category._id)
			: '/finance/categories',
		category ? 'PUT' : 'POST',
	);
	const client = useQueryClient();
	return (
		<RecordEditorModal
			title={
				category ? 'Gelir / gider türünü düzenle' : 'Gelir / gider türü ekle'
			}
			initialValues={{
				name: category?.name ?? '',
				group: category?.group ?? 'other',
			}}
			fields={[
				{
					key: 'group',
					label: 'Ana tür',
					type: 'select',
					disabled: !!category,
					options: [
						{ value: 'investment', label: 'Gelir' },
						{ value: 'other', label: 'Gider' },
					],
				},
				{ key: 'name', label: 'Alt tür', maxLength: 100 },
			]}
			onClose={onClose}
			onSave={async (values, requestId) => {
				const result = (await save.mutateAsync({
					requestId,
					name: values.name,
					group: values.group as 'other' | 'investment',
				})) as { category: FinanceCategory };
				client.setQueriesData<FinanceResponse>(
					{
						queryKey: ['finance'],
						predicate: (query) => query.queryKey[1] !== 'investors',
					},
					(old) =>
						old?.categories
							? {
									...old,
									categories: [
										...old.categories.filter(
											(row) => row._id !== result.category._id,
										),
										result.category,
									],
								}
							: old,
				);
				onSaved(result.category);
				toast.success(category ? 'Alt tür güncellendi' : 'Alt tür eklendi');
			}}
		/>
	);
}

export function FinanceCategoryPicker({
	categories,
	value,
	onChange,
	disabled,
}: {
	categories: FinanceCategory[];
	value: string;
	onChange: (id: string) => void;
	disabled: boolean;
}) {
	const [editor, setEditor] = useState<{
		category: FinanceCategory | null;
	} | null>(null);
	const choices = categories.filter(
		(row) => row.group === 'investment' || row.group === 'other',
	);
	const selected = choices.find((row) => row._id === value);
	return (
		<div className='flex min-w-0 flex-wrap items-end gap-1'>
			<label className='flex flex-col gap-1 text-xs'>
				Gelir / gider türü
				<select
					aria-label='Bakiye kayıt türü'
					className={`${STOCK_CONTROL} w-auto! max-w-64`}
					value={value}
					disabled={disabled}
					onChange={(event) => {
						if (event.target.value === '__add_category__') {
							setEditor({ category: null });
							return;
						}
						onChange(event.target.value);
					}}
				>
					{choices.map((row) => (
						<option key={row._id} value={row._id}>
							{row.group === 'investment' ? 'Gelir' : 'Gider'} · {row.name}
						</option>
					))}
					<option value='__add_category__'>+ Tür ekle</option>
				</select>
			</label>
			<div className='flex gap-1'>
				{selected && (
					<button
						type='button'
						className={STOCK_BUTTON}
						aria-label='Seçili türü düzenle'
						title='Seçili türü düzenle'
						disabled={disabled}
						onClick={() => setEditor({ category: selected })}
					>
						<Pencil size={14} aria-hidden />
					</button>
				)}
			</div>
			{editor && (
				<CategoryEditor
					category={editor.category}
					onClose={() => setEditor(null)}
					onSaved={(row) => {
						onChange(row._id);
						setEditor(null);
					}}
				/>
			)}
		</div>
	);
}
