import { ModalCloseButton } from '../ModalCloseButton';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
	useBayiler,
	useSaveBayi,
	type Bayi,
} from '../../hooks/api/endpoints/useBayiler';
import {
	bayiConflictSchema,
	bayiInputSchema,
	type BayiConflict,
} from '../../schemas/bayi.schema';

const control =
	'min-h-10 w-full min-w-0 rounded-lg border border-border bg-button-bg px-3 py-2 text-sm text-text';
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
	const dialogRef = useRef<HTMLDialogElement>(null);
	const id = useId();
	const [name, setName] = useState(bayi?.name ?? '');
	const [phone, setPhone] = useState((bayi?.phone ?? '').replace(/\D/g, ''));
	const [error, setError] = useState('');
	const save = useSaveBayi();
	const dismiss = useModalDismiss(onClose, { disabled: save.isPending });
	useEffect(() => {
		const dialog = dialogRef.current;
		dialog?.showModal();
		return () => dialog?.close();
	}, []);
	async function submit() {
		const parsed = bayiInputSchema.safeParse({ name, phone });
		if (!parsed.success) {
			const message = parsed.error.issues[0].message;
			setError(message);
			toast.error(message);
			return;
		}
		setError('');
		try {
			const result = await save.mutateAsync({
				id: bayi?._id,
				input: parsed.data,
			});
			onSaved(result.bayi);
			toast.success(bayi ? 'Bayi güncellendi' : 'Bayi eklendi');
		} catch (failure) {
			const apiError = failure as { message?: string; details?: unknown };
			const conflict = bayiConflictSchema.safeParse(apiError.details);
			if (conflict.success) {
				onConflict(conflict.data, apiError.message ?? 'Bu bayi zaten kayıtlı.');
				toast.info('Mevcut bayi seçildi', { description: apiError.message });
				return;
			}
			const message = apiError.message ?? 'Bayi kaydedilemedi.';
			setError(message);
			toast.error('Bayi kaydedilemedi', { description: message });
		}
	}
	return (
		<dialog
			ref={dialogRef}
			aria-labelledby={`${id}-title`}
			{...dismiss}
			className='m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-modal-bg p-4 text-text backdrop:bg-black/60 sm:p-6'
		>
			<div className='mb-4 flex items-center justify-between gap-3'>
				<h3 id={`${id}-title`} className='text-lg font-semibold'>
					{bayi ? 'Bayiyi düzenle' : 'Bayi ekle'}
				</h3>
				<ModalCloseButton onClick={onClose} disabled={save.isPending} />
			</div>
			<form
				className='space-y-3'
				noValidate
				onSubmit={(event) => {
					event.preventDefault();
					void submit();
				}}
			>
				<label className='flex flex-col gap-1 text-sm' htmlFor={`${id}-name`}>
					Bayi adı
					<input
						id={`${id}-name`}
						className={control}
						autoFocus
						autoComplete='organization'
						required
						maxLength={120}
						value={name}
						disabled={save.isPending}
						onChange={(event) => setName(event.target.value)}
					/>
				</label>
				<label className='flex flex-col gap-1 text-sm' htmlFor={`${id}-phone`}>
					Telefon numarası
					<input
						id={`${id}-phone`}
						className={`${control} font-mono tracking-wider tabular-nums`}
						type='tel'
						inputMode='numeric'
						autoComplete='tel'
						required
						maxLength={17}
						placeholder='05551234567'
						value={phone}
						disabled={save.isPending}
						onChange={(event) =>
							setPhone(event.target.value.replace(/\D/g, '').slice(0, 17))
						}
					/>
				</label>
				{error && (
					<p role='alert' className='text-sm text-red-500'>
						{error}
					</p>
				)}
				<div className='flex flex-wrap gap-2 pt-1'>
					<button type='submit' className={button} disabled={save.isPending}>
						{save.isPending ? 'Kaydediliyor...' : 'Kaydet'}
					</button>
				</div>
			</form>
		</dialog>
	);
}

export function BayiPicker({
	value,
	onChange,
	disabled,
}: {
	value: string;
	onChange: (id: string) => void;
	disabled: boolean;
}) {
	const list = useBayiler();
	const bayiler = useMemo(
		() =>
			[...(list.data?.bayiler ?? [])].sort((a, b) =>
				a.name.localeCompare(b.name, 'tr', { sensitivity: 'base' }),
			),
		[list.data],
	);
	const id = useId();
	const [editor, setEditor] = useState<{ bayi: Bayi | null } | null>(null);
	const [notice, setNotice] = useState<{
		conflict: BayiConflict;
		message: string;
	} | null>(null);
	const selected = bayiler.find((bayi) => bayi._id === value);
	return (
		<div className='mb-4 w-full min-w-0 max-w-lg space-y-2'>
			<label htmlFor={`${id}-bayi`} className='block text-sm font-medium'>
				Bayi
			</label>
			<div className='flex min-w-0 flex-wrap items-center gap-2'>
				<select
					id={`${id}-bayi`}
					aria-label='Bayi seçin'
					className={`${control} flex-1 basis-48`}
					value={value}
					disabled={disabled || list.isPending || (!list.data && list.isError)}
					onChange={(event) => {
						if (event.target.value === '__add_bayi__') {
							setEditor({ bayi: null });
							return;
						}
						setNotice(null);
						onChange(event.target.value);
					}}
				>
					<option value='' disabled hidden>
						{list.isPending ? 'Bayiler yükleniyor...' : 'Bayi seçin'}
					</option>
					{bayiler.map((bayi) => (
						<option key={bayi._id} value={bayi._id}>
							{bayi.name}
						</option>
					))}
					<option value='__add_bayi__'>+ Bayi ekle</option>
				</select>
				{selected && (
					<button
						type='button'
						className={button}
						disabled={disabled}
						onClick={() => setEditor({ bayi: selected })}
					>
						Bayiyi düzenle
					</button>
				)}
			</div>
			{list.isSuccess && !list.data.bayiler.length && (
				<p className='text-xs opacity-70'>
					Henüz bayi yok. Listeden “Bayi ekle”yi seçin.
				</p>
			)}
			{list.isError && (
				<p role='alert' className='text-sm text-red-500'>
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
						{notice.conflict.matches.find((match) => match.bayi._id === value)
							?.bayi.name ?? selected?.name}
					</p>
					{notice.conflict.matches.length > 1 && (
						<div className='flex flex-wrap gap-2'>
							{notice.conflict.matches.map(({ bayi }) => (
								<button
									type='button'
									key={bayi._id}
									className={button}
									onClick={() => onChange(bayi._id)}
								>
									{bayi.name} · {bayi.phone}
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
					onSaved={(bayi) => {
						setNotice(null);
						onChange(bayi._id);
						setEditor(null);
					}}
					onConflict={(conflict, message) => {
						setNotice({ conflict, message });
						onChange(conflict.selectedBayiId);
						setEditor(null);
					}}
				/>
			)}
		</div>
	);
}
