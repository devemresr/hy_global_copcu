import { BayiMenu, type BayiMenuOption } from './BayiMenu';
import { RecordEditorModal } from './RecordEditorModal';
import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
	useBayiler,
	useSaveBayi,
	type Bayi,
} from '../../hooks/api/endpoints/useBayiler';
import {
	bayiConflictSchema,
	type BayiConflict,
} from '../../schemas/bayi.schema';

const button =
	'min-h-9 rounded-lg border border-border bg-button-bg px-3 py-2 text-xs text-text hover:bg-button-hover-bg disabled:opacity-40';

function BayiEditor({
	bayi,
	onClose,
	onSaved,
	onConflict,
}: {
	bayi: Bayi | null;
	onClose: () => void;
	onSaved: (bayi: Bayi) => void;
	onConflict: (conflict: BayiConflict, message: string) => void;
}) {
	const save = useSaveBayi();
	return (
		<RecordEditorModal
			title={bayi ? 'Bayiyi düzenle' : 'Bayi ekle'}
			initialValues={{
				name: bayi?.name ?? '',
				phone: (bayi?.phone ?? '').replace(/\D/g, ''),
			}}
			fields={[
				{ key: 'name', label: 'Bayi adı', autoComplete: 'organization' },
				{
					key: 'phone',
					label: 'Telefon numarası',
					type: 'phone',
					autoComplete: 'tel',
				},
			]}
			onClose={onClose}
			onSave={async (values) => {
				try {
					const result = await save.mutateAsync({
						id: bayi?._id,
						input: { name: values.name, phone: values.phone },
					});
					onSaved(result.bayi);
					toast.success(bayi ? 'Bayi güncellendi' : 'Bayi eklendi');
				} catch (failure) {
					const apiError = failure as { message?: string; details?: unknown };
					const conflict = bayiConflictSchema.safeParse(apiError.details);
					if (conflict.success) {
						onConflict(
							conflict.data,
							apiError.message ?? 'Bu bayi zaten kayıtlı.',
						);
						toast.info('Mevcut bayi seçildi', {
							description: apiError.message,
						});
						return;
					}
					throw failure;
				}
			}}
		/>
	);
}

type BayiSelection =
	| { multiple: true; value: string[]; onChange: (ids: string[]) => void }
	| { multiple?: false; value: string; onChange: (id: string) => void };
type BayiPickerProps = BayiSelection & {
	disabled?: boolean;
	id?: string;
	label?: string;
	compact?: boolean;
	options?: BayiMenuOption[];
	addOptions?: BayiMenuOption[];
	canAdd?: boolean;
	allowCreate?: boolean;
	onAdd?: (id: string) => void;
};
export function BayiPicker(props: BayiPickerProps) {
	const {
		disabled = false,
		label = 'Bayi seçin',
		compact = false,
		options,
		addOptions,
		canAdd,
		allowCreate = false,
		onAdd,
	} = props;
	const list = useBayiler();
	const bayiler = useMemo(
		() =>
			[...(list.data?.bayiler ?? [])].sort((a, b) =>
				a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }),
			),
		[list.data],
	);
	const generatedId = useId();
	const id = props.id ?? generatedId + '-bayi';
	const [editor, setEditor] = useState<{ bayi: Bayi | null } | null>(null);
	const [notice, setNotice] = useState<{
		conflict: BayiConflict;
		message: string;
	} | null>(null);
	const menuOptions =
		options ?? bayiler.map((bayi) => ({ id: bayi._id, label: bayi.name }));
	function select(id: string) {
		setNotice(null);
		if (props.multiple) {
			props.onChange(
				props.value.includes(id) ? props.value : [...props.value, id],
			);
		} else props.onChange(id);
	}
	function saved(bayi: Bayi) {
		// Editing an unselected option must not replace the current purchase, supplier or report selection.
		if (
			!editor?.bayi &&
			(!options || options.some((option) => option.id === bayi._id))
		)
			select(bayi._id);
		setNotice(null);
		setEditor(null);
	}
	return (
		<div
			className={
				compact ? 'min-w-0 space-y-2' : 'mb-4 w-full min-w-0 max-w-lg space-y-2'
			}
		>
			{!compact && (
				<label htmlFor={id} className='block text-sm font-medium'>
					Bayi
				</label>
			)}
			<BayiMenu
				id={id}
				label={label}
				value={props.multiple ? '' : props.value}
				options={menuOptions}
				selectedIds={props.multiple ? props.value : undefined}
				allLabel={
					list.isPending && !options
						? 'Bayiler yükleniyor...'
						: props.multiple
							? 'Bayi seçin · filtre yok'
							: 'Bayi seçin'
				}
				disabled={disabled || (list.isPending && !options)}
				onChange={select}
				onToggle={(id) => {
					if (props.multiple) {
						setNotice(null);
						props.onChange(
							props.value.includes(id)
								? props.value.filter((selected) => selected !== id)
								: [...props.value, id],
						);
					}
				}}
				onClear={props.multiple ? () => props.onChange([]) : undefined}
				onEdit={(id) => {
					const bayi = bayiler.find((bayi) => bayi._id === id);
					if (bayi) setEditor({ bayi });
				}}
				canEdit={(id) => bayiler.some((bayi) => bayi._id === id)}
				onCreate={allowCreate ? () => setEditor({ bayi: null }) : undefined}
				addOptions={addOptions}
				canAdd={canAdd}
				onAdd={onAdd}
			/>
			{list.isSuccess && !bayiler.length && !options && (
				<p className='text-xs opacity-70'>
					{allowCreate
						? 'Henüz bayi yok. Listeden “Bayi ekle”yi seçin.'
						: 'Henüz bayi yok. Alış sayfasından bayi ekleyebilirsiniz.'}
				</p>
			)}
			{list.isError && (
				<p role='alert' className='text-xs text-red-500'>
					Bayiler yüklenemedi.{' '}
					<button
						type='button'
						className='underline'
						onClick={() => void list.refetch()}
					>
						Tekrar dene
					</button>
				</p>
			)}
			{notice && (
				<div
					role='status'
					className='space-y-2 rounded-lg border border-border bg-button-bg/40 p-3 text-sm'
				>
					<p>{notice.message}</p>
					<p className='font-medium'>
						Seçilen bayi:{' '}
						{(props.multiple ? props.value : [props.value])
							.map(
								(id) =>
									bayiler.find((bayi) => bayi._id === id)?.name ??
									notice.conflict.matches.find((match) => match.bayi._id === id)
										?.bayi.name ??
									id,
							)
							.filter(Boolean)
							.join(', ')}
					</p>
					{notice.conflict.matches.length > 1 && (
						<div className='flex flex-wrap gap-2'>
							{notice.conflict.matches.map(({ bayi }) => (
								<button
									type='button'
									key={bayi._id}
									className={button}
									onClick={() => select(bayi._id)}
								>
									{bayi.name}
								</button>
							))}
						</div>
					)}
				</div>
			)}
			{editor && (
				<BayiEditor
					bayi={editor.bayi}
					onClose={() => setEditor(null)}
					onSaved={saved}
					onConflict={(conflict, message) => {
						if (
							!editor.bayi &&
							(!options ||
								options.some((option) => option.id === conflict.selectedBayiId))
						)
							select(conflict.selectedBayiId);
						setNotice({ conflict, message });
						setEditor(null);
					}}
				/>
			)}
		</div>
	);
}
