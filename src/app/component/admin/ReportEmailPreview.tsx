import { useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { ModalCloseButton } from '../ModalCloseButton';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { STOCK_BUTTON } from '../../constants/stockStyles.constant';
export type EmailPreview = {
	subject: string;
	html: string;
	attachments: string[];
};
export function ReportEmailPreview({
	preview,
	onClose,
	onSend,
	sending,
}: {
	preview: EmailPreview;
	onClose: () => void;
	onSend: () => void;
	sending: boolean;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const dismiss = useModalDismiss(onClose);
	useEffect(() => {
		const dialog = ref.current;
		dialog?.showModal();
		return () => dialog?.close();
	}, []);
	return (
		<dialog
			ref={ref}
			{...dismiss}
			aria-labelledby='report-email-preview-title'
			className='m-auto flex h-[90dvh] max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] max-w-5xl flex-col gap-3 overflow-hidden rounded-xl border border-border bg-modal-bg p-3 text-text backdrop:bg-black/60 sm:p-4'
		>
			<div className='flex shrink-0 items-start justify-between gap-3'>
				<div className='min-w-0'>
					<h2
						id='report-email-preview-title'
						className='break-words font-semibold'
					>
						{preview.subject}
					</h2>
					<p className='mt-1 text-xs text-text/70'>
						Önizleme e-posta göndermez. Gönderirken rapor güncel verilerle
						hazırlanır.
					</p>
				</div>
				<ModalCloseButton onClick={onClose} />
			</div>
			<iframe
				title='Rapor e-postası önizlemesi'
				sandbox=''
				srcDoc={preview.html}
				className='min-h-0 w-full flex-1 rounded-lg border border-border bg-white'
			/>
			<div className='flex shrink-0 flex-wrap items-center justify-between gap-3'>
				<p className='min-w-0 break-words text-xs text-text/70'>
					Ekler:{' '}
					{preview.attachments.length
						? preview.attachments
								.map((name) =>
									name.endsWith('.pdf')
										? 'PDF'
										: name.endsWith('.json')
											? 'JSON'
											: name,
								)
								.join(', ')
						: 'Yok'}
				</p>
				<button
					type='button'
					disabled={sending}
					className={STOCK_BUTTON + ' gap-2'}
					onClick={onSend}
				>
					<Send size={15} aria-hidden />
					{sending ? 'Gönderiliyor…' : 'E-posta gönder'}
				</button>
			</div>
		</dialog>
	);
}
