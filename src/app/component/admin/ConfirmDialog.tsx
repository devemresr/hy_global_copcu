import type { ReactNode } from 'react';
import { useModalHotkeys } from '../../hooks/useModalHotkeys';

type ConfirmDialogProps = {
	title: string;
	message: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
	// Optional so a caller that doesn't track the admin's hotkey settings
	// (there's no other one today, but this is a generic dialog) still gets
	// working Enter/Escape by default.
	enterEnabled?: boolean;
	escapeEnabled?: boolean;
};

export function ConfirmDialog({
	title,
	message,
	confirmLabel = 'Onayla',
	cancelLabel = 'Vazgeç',
	onConfirm,
	onCancel,
	enterEnabled = true,
	escapeEnabled = true,
}: ConfirmDialogProps) {
	useModalHotkeys(onConfirm, onCancel, { enterEnabled, escapeEnabled });

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4'
			onClick={onCancel}
		>
			<div
				className='w-full max-w-sm bg-modal-bg text-text rounded-xl p-4'
				onClick={(e) => e.stopPropagation()}
			>
				<p className='text-sm font-semibold mb-2'>{title}</p>
				<div className='text-sm opacity-90 mb-4'>{message}</div>
				<div className='flex justify-end gap-2'>
					<button
						type='button'
						onClick={onCancel}
						className='rounded-xl bg-button-bg px-3 py-1.5 text-sm font-medium hover:bg-button-hover-bg'
					>
						{cancelLabel}
					</button>
					<button
						type='button'
						onClick={onConfirm}
						className='rounded-xl bg-button-focus-bg px-3 py-1.5 text-sm font-medium hover:bg-button-hover-bg'
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
