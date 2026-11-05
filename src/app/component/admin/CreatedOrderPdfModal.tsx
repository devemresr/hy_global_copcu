import { ModalCloseButton } from '../ModalCloseButton';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Order } from '../../hooks/api/endpoints/useOrders';
import {
	singleOrderDocument,
	singleOrderFilename,
} from '../../helpers/singleOrderReport.helper';
import { createPdfFile, downloadPdfFile } from '../../helpers/pdf.helper';
import { formatOrderMoney } from '../../constants/orderReports.constant';
import {
	formatOrderProduct,
	formatOrderQuantity,
	formatOrderUnitTotals,
} from '../../helpers/orderProduct.helper';
import { OrderChartTable } from './OrderChartTable';

export function CreatedOrderPdfModal({
	order,
	onClose,
	mode = 'created',
}: {
	order: Order;
	onClose: () => void;
	mode?: 'created' | 'existing';
}) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const dismiss = useModalDismiss(onClose);
	const [prepared, setPrepared] = useState<{ order: Order; file: File } | null>(
		null,
	);
	const [error, setError] = useState('');
	const [retry, setRetry] = useState(0);
	const [sharing, setSharing] = useState(false);
	const file = prepared?.order === order ? prepared.file : null;
	useEffect(() => {
		const dialog = dialogRef.current;
		dialog?.showModal();
		return () => dialog?.close();
	}, []);
	useEffect(() => {
		let cancelled = false;
		setError('');
		setPrepared(null);
		void createPdfFile(
			singleOrderDocument(order, []),
			singleOrderFilename(order),
		)
			.then((pdf) => {
				if (!cancelled) setPrepared({ order, file: pdf });
			})
			.catch((failure: unknown) => {
				if (cancelled) return;
				const message =
					failure instanceof Error ? failure.message : 'PDF hazırlanamadı.';
				setError(message);
				toast.error('PDF hazırlanamadı', { description: message });
			});
		return () => {
			cancelled = true;
		};
	}, [order, retry]);
	async function share() {
		if (!file) return;
		if (
			typeof navigator.share !== 'function' ||
			typeof navigator.canShare !== 'function' ||
			!navigator.canShare({ files: [file] })
		) {
			downloadPdfFile(file);
			toast.info('Bu tarayıcı dosya paylaşımını desteklemiyor. PDF indirildi.');
			return;
		}
		setSharing(true);
		try {
			await navigator.share({ files: [file], title: order.name || order._id });
		} catch (failure) {
			if (!(failure instanceof DOMException && failure.name === 'AbortError'))
				toast.error('PDF paylaşılamadı. Dosyayı indirip paylaşabilirsiniz.');
		} finally {
			setSharing(false);
		}
	}
	const button =
		'min-h-9 rounded-xl border border-border bg-button-bg px-3 py-2 text-sm hover:bg-button-hover-bg disabled:opacity-40';
	return (
		<dialog
			ref={dialogRef}
			{...dismiss}
			className='m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] min-w-0 max-w-3xl overflow-y-auto rounded-2xl border border-border bg-modal-bg p-4 text-text backdrop:bg-black/60 sm:p-6'
			aria-labelledby='created-order-pdf-title'
		>
			<div className='mb-4 flex flex-wrap items-start justify-between gap-3'>
				<div className='min-w-0'>
					<h2 id='created-order-pdf-title' className='text-lg font-semibold'>
						{mode === 'created' ? 'Alış kaydedildi' : 'Alış PDF belgesi'}
					</h2>
					<p className='mt-1 break-words text-sm'>{order.name || order._id}</p>
					{order.bayiPhone && (
						<p className='mt-1 text-xs opacity-70'>
							Telefon: {order.bayiPhone}
						</p>
					)}
					<p className='mt-1 text-xs opacity-70'>
						{new Date(order.createdAt).toLocaleString('tr-TR', {
							timeZone: 'Europe/Istanbul',
						})}
					</p>
				</div>
				<ModalCloseButton onClick={onClose} />
			</div>
			<OrderChartTable
				title='Alış özeti'
				headers={['Ürün', 'Miktar', 'Birim fiyat', 'Tutar']}
				rows={order.lines.map((line) => [
					formatOrderProduct(line),
					formatOrderQuantity(line.quantity, line.quantityUnit),
					formatOrderMoney(line.unitPrice),
					formatOrderMoney(line.total),
				])}
			/>
			<div className='my-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-button-bg/40 p-3'>
				<span className='text-sm'>{formatOrderUnitTotals(order)}</span>
				<strong>Genel toplam: {formatOrderMoney(order.total)}</strong>
			</div>
			{!error && (
				<p role='status' className='mb-3 text-xs opacity-70'>
					{file ? 'PDF hazır' : 'PDF hazırlanıyor...'}
				</p>
			)}
			{error && (
				<div role='alert' className='mb-3 text-sm text-red-500'>
					{error}{' '}
					<button
						type='button'
						className='underline'
						onClick={() => setRetry((current) => current + 1)}
					>
						Tekrar dene
					</button>
				</div>
			)}
			<div className='flex flex-wrap gap-2'>
				<button
					type='button'
					data-action='download-order'
					className={button}
					disabled={!file || sharing}
					onClick={() => {
						if (file) {
							downloadPdfFile(file);
							toast.success('PDF indirildi');
						}
					}}
				>
					PDF indir
				</button>
				<button
					type='button'
					data-action='share-order'
					className={button}
					disabled={!file || sharing}
					onClick={() => void share()}
				>
					{sharing ? 'Paylaşılıyor...' : 'Paylaş'}
				</button>
			</div>
		</dialog>
	);
}
