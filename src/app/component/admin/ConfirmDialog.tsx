import type { ReactNode } from 'react';
import { useModalHotkeys } from '../../hooks/useModalHotkeys';

type ConfirmDialogProps = {
	danger?: boolean;
	title: string;
	message: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
	additionalAction?: { label: string; onClick: () => void };
	// Optional so a caller that doesn't track the admin's hotkey settings
	// (there's no other one today, but this is a generic dialog) still gets
	// working Enter/Escape by default.
	enterEnabled?: boolean;
	escapeEnabled?: boolean;
};

export function ConfirmDialog({
	danger = false,
	title,
	message,
	confirmLabel = 'Onayla',
	cancelLabel = 'Vazgeç',
	onConfirm,
	onCancel,
	additionalAction,
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
				role='dialog'
				aria-modal='true'
				aria-label={title}
				className='w-full max-w-sm bg-modal-bg text-text rounded-xl p-4'
				onClick={(e) => e.stopPropagation()}
			>
				<p className='text-sm font-semibold mb-2'>{title}</p>
				<div className='text-sm opacity-90 mb-4'>{message}</div>
				<div className='flex flex-col justify-end gap-2 sm:flex-row sm:flex-wrap'>
					<button
						type='button'
						onClick={onCancel}
						className='rounded-xl bg-button-bg px-3 py-1.5 text-sm font-medium hover:bg-button-hover-bg'
					>
						{cancelLabel}
					</button>
					{additionalAction && <button type='button' onClick={additionalAction.onClick} className='rounded-xl border border-border bg-button-focus-bg px-3 py-1.5 text-sm font-medium hover:bg-button-hover-bg'>{additionalAction.label}</button>}
					<button
						type='button'
						onClick={onConfirm}
						className={`rounded-xl px-3 py-1.5 text-sm font-medium ${danger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-button-focus-bg hover:bg-button-hover-bg'}`}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
