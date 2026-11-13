import type { PurchaseChartSettings } from '../../helpers/purchaseChartSeries.helper';
import { ModalCloseButton } from '../ModalCloseButton';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type {
	PurchaseFilters,
	PurchasesResponse,
} from '../../hooks/api/endpoints/usePurchases';
// Graphs temporarily disabled; retain the component and settings for restoration.
// import { PurchaseCharts } from './PurchaseCharts';
import { PurchaseChartTable } from './PurchaseChartTable';
import { purchaseReportDocument } from '../../helpers/purchaseReport.helper';
import { purchaseReportFilename } from '../../helpers/purchasePeriod.helper';
import { createPdfFile, downloadPdfFile } from '../../helpers/pdf.helper';
import {
	formatPurchaseProduct,
	formatPurchaseQuantity,
} from '../../helpers/purchaseProduct.helper';
import { formatPurchaseMoney } from '../../constants/purchaseReports.constant';
import { STOCK_BUTTON } from '../../constants/stockStyles.constant';

export function PurchaseReportPdfModal({
	data,
	filters,
	onClose,
	action,
}: {
	data: PurchasesResponse;
	filters: PurchaseFilters;
	onClose: () => void;
	settings?: PurchaseChartSettings;
	action?: 'download' | 'share';
}) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const dismiss = useModalDismiss(onClose);
	const [retry, setRetry] = useState(0);
	const [prepared, setPrepared] = useState<{
		data: PurchasesResponse;
		filters: PurchaseFilters;
		retry: number;
		file: File;
	} | null>(null);
	const [failure, setFailure] = useState<{
		data: PurchasesResponse;
		filters: PurchaseFilters;
		retry: number;
		message: string;
	} | null>(null);
	const [sharing, setSharing] = useState(false);
	const file =
		prepared?.data === data &&
		prepared.filters === filters &&
		prepared.retry === retry
			? prepared.file
			: null;
	const error =
		failure?.data === data &&
		failure.filters === filters &&
		failure.retry === retry
			? failure.message
			: '';
	useEffect(() => {
		const dialog = dialogRef.current;
		dialog?.showModal();
		return () => dialog?.close();
	}, []);
	useEffect(() => {
		let cancelled = false;
		void createPdfFile(
			purchaseReportDocument(data, filters, []),
			purchaseReportFilename(data, filters),
		)
			.then((file) => {
				if (!cancelled) setPrepared({ data, filters, retry, file });
			})
			.catch((error: unknown) => {
				if (!cancelled)
					setFailure({
						data,
						filters,
						retry,
						message:
							error instanceof Error ? error.message : 'PDF hazırlanamadı.',
					});
			});
		return () => {
			cancelled = true;
		};
	}, [data, filters, retry]);
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
			await navigator.share({ files: [file], title: 'Alış raporu' });
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError'))
				toast.error('PDF paylaşılamadı. Dosyayı indirip paylaşabilirsiniz.');
		} finally {
			setSharing(false);
		}
	}
	return (
		<dialog
			ref={dialogRef}
			{...dismiss}
			className='m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] min-w-0 max-w-3xl overflow-y-auto rounded-2xl border border-border bg-modal-bg p-4 text-text backdrop:bg-black/60 sm:p-6'
			aria-labelledby='history-pdf-title'
		>
			<div className='mb-4 flex items-start justify-between gap-3'>
				<div>
					<h2 id='history-pdf-title' className='text-lg font-semibold'>
						Alış raporu · PDF
					</h2>
					<p className='mt-1 text-xs text-text/70'>
						{data.summary.count} alış ·{' '}
						{formatPurchaseMoney(data.summary.total)}
					</p>
				</div>
				<ModalCloseButton onClick={onClose} />
			</div>
			<PurchaseChartTable
				title='Rapora dahil edilen ürünler'
				headers={['Ürün', 'Miktar', 'Alış tutarı']}
				rows={(data.byTypeAndMemory ?? []).map((line) => [
					formatPurchaseProduct(line),
					formatPurchaseQuantity(line.quantity, line.quantityUnit),
					formatPurchaseMoney(line.total),
				])}
			/>
			{/* Graph controls and preview temporarily disabled:
   <PurchaseCharts data={data} filters={filters} refreshing={false} initialSettings={settings} exportAction={action}/>
   */}
			<div className='mt-4 flex flex-wrap gap-2'>
				<button
					type='button'
					className={STOCK_BUTTON}
					disabled={!file || sharing}
					onClick={() => {
						if (file) downloadPdfFile(file);
					}}
				>
					PDF indir
				</button>
				<button
					type='button'
					className={STOCK_BUTTON}
					disabled={!file || sharing}
					onClick={() => void share()}
					autoFocus={action === 'share'}
				>
					{sharing ? 'Paylaşılıyor...' : 'Paylaş'}
				</button>
			</div>
			{!file && !error && (
				<p role='status' className='mt-2 text-xs text-text/70'>
					PDF hazırlanıyor...
				</p>
			)}
			{error && (
				<p role='alert' className='mt-2 text-sm text-red-500'>
					{error}{' '}
					<button
						type='button'
						className='underline'
						onClick={() => setRetry((value) => value + 1)}
					>
						Tekrar dene
					</button>
				</p>
			)}
		</dialog>
	);
}
