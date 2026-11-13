import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { normalizeBayiPhone } from '../../helpers/bayiPhone.helper';
import { ModalCloseButton } from '../ModalCloseButton';
import {
	STOCK_BUTTON,
	STOCK_CONTROL,
} from '../../constants/stockStyles.constant';

export type RecordField = {
	key: string;
	label: string;
	type?: 'text' | 'phone' | 'select';
	options?: { value: string; label: string }[];
	maxLength?: number;
	autoComplete?: string;
	disabled?: boolean;
};

// Shared add/edit lifecycle: fields, labels and the save adapter are supplied by the caller.
export function RecordEditorModal({
	title,
	fields,
	initialValues,
	onSave,
	onClose,
}: {
	title: string;
	fields: RecordField[];
	initialValues: Record<string, string>;
	onSave: (values: Record<string, string>, requestId: string) => Promise<void>;
	onClose: () => void;
}) {
	const id = useId();
	const dialog = useRef<HTMLDialogElement>(null);
	const [values, setValues] = useState(initialValues);
	const [requestId, setRequestId] = useState(() => crypto.randomUUID());
	const [saving, setSaving] = useState(false);
	const submitting = useRef(false);
	const [error, setError] = useState('');
	const dismiss = useModalDismiss(onClose, { disabled: saving });
	useEffect(() => {
		const element = dialog.current;
		element?.showModal();
		return () => element?.close();
	}, []);
	return createPortal(
		<dialog
			ref={dialog}
			{...dismiss}
			aria-labelledby={id + '-title'}
			className='m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-modal-bg p-4 text-text backdrop:bg-black/60 sm:p-6'
		>
			<div className='mb-4 flex items-center justify-between gap-3'>
				<h3 id={id + '-title'} className='text-lg font-semibold'>
					{title}
				</h3>
				<ModalCloseButton onClick={onClose} disabled={saving} />
			</div>
			<form
				noValidate
				className='space-y-3'
				onSubmit={async (event) => {
					event.preventDefault();
					event.stopPropagation();
					if (submitting.current) return;
					const input = { ...values };
					for (const field of fields) {
						input[field.key] = (input[field.key] ?? '')
							.normalize('NFKC')
							.trim()
							.replace(/\s+/gu, ' ');
						if (!input[field.key]) {
							setError(
								field.type === 'phone'
									? 'Telefon numarasını girin.'
									: field.label +
											(field.type === 'select' ? ' seçin.' : ' girin.'),
							);
							return;
						}
						if (field.type === 'phone') {
							input[field.key] = normalizeBayiPhone(input[field.key]);
							if (!input[field.key]) {
								setError('Geçerli bir telefon numarası girin.');
								return;
							}
						}
					}
					submitting.current = true;
					setSaving(true);
					setError('');
					try {
						await onSave(input, requestId);
					} catch (failure) {
						setError(
							failure instanceof Error
								? failure.message
								: 'Kayıt kaydedilemedi.',
						);
					} finally {
						submitting.current = false;
						setSaving(false);
					}
				}}
			>
				{fields.map((field, index) => (
					<label
						key={field.key}
						htmlFor={id + '-' + field.key}
						className='flex flex-col gap-1 text-sm'
					>
						{field.label}
						{field.type === 'select' ? (
							<select
								id={id + '-' + field.key}
								className={STOCK_CONTROL}
								value={values[field.key] ?? ''}
								disabled={saving || field.disabled}
								onChange={(event) => {
									setValues({ ...values, [field.key]: event.target.value });
									setRequestId(crypto.randomUUID());
									setError('');
								}}
							>
								{field.options?.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						) : (
							<input
								id={id + '-' + field.key}
								autoFocus={index === 0}
								className={STOCK_CONTROL}
								type={field.type === 'phone' ? 'tel' : 'text'}
								inputMode={field.type === 'phone' ? 'numeric' : undefined}
								autoComplete={field.autoComplete}
								required
								maxLength={
									field.type === 'phone' ? 17 : (field.maxLength ?? 120)
								}
								value={values[field.key] ?? ''}
								disabled={saving || field.disabled}
								onChange={(event) => {
									setValues({
										...values,
										[field.key]:
											field.type === 'phone'
												? event.target.value.replace(/\D/g, '').slice(0, 17)
												: event.target.value,
									});
									setRequestId(crypto.randomUUID());
									setError('');
								}}
							/>
						)}
					</label>
				))}
				{error && (
					<p role='alert' className='text-sm text-red-500'>
						{error}
					</p>
				)}
				<button type='submit' className={STOCK_BUTTON} disabled={saving}>
					{saving ? 'Kaydediliyor...' : 'Kaydet'}
				</button>
			</form>
		</dialog>,
		document.body,
	);
}
