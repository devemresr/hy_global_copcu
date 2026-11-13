import type { PurchaseChartSettings } from '../../helpers/purchaseChartSeries.helper';
import { ModalCloseButton } from '../ModalCloseButton';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { useEffect, useRef } from 'react';
import type {
	PurchaseFilters,
	PurchasesResponse,
} from '../../hooks/api/endpoints/usePurchases';
import { PurchaseCharts } from './PurchaseCharts';

export function PurchaseReportPdfModal({
	data,
	filters,
	onClose,
	settings,
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
	useEffect(() => {
		const dialog = dialogRef.current;
		dialog?.showModal();
		return () => dialog?.close();
	}, []);
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
					<p className='mt-1 text-xs opacity-70'>
						Rapora dahil ettiğiniz {data.summary.count} alış. PDF içeriğini
						aşağıdan seçin.
					</p>
				</div>
				<ModalCloseButton onClick={onClose} />
			</div>
			<PurchaseCharts
				data={data}
				filters={filters}
				refreshing={false}
				initialSettings={settings}
				exportAction={action}
			/>
		</dialog>
	);
}
