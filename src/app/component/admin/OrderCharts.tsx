import { AdminSummary, AdminCollapseButton } from './AdminCollapseHeading';
import { useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
	Chart as ChartJS,
	ArcElement,
	BarElement,
	CategoryScale,
	LinearScale,
	LineElement,
	PointElement,
	Tooltip,
	Legend,
	type ChartOptions,
	type Plugin,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import type {
	Order,
	OrderFilters,
	OrdersResponse,
} from '../../hooks/api/endpoints/useOrders';
import {
	ORDER_CHART_PALETTES,
	ORDER_CHART_TITLES,
	ORDER_TYPE_LABELS,
	formatOrderMoney,
	orderTypeColorIndex,
	orderMemoryColorIndex,
} from '../../constants/orderReports.constant';
import {
	downloadOrderReport,
	orderReportDocument,
	type OrderChartImage,
} from '../../helpers/orderReport.helper';
import { useTheme } from '../../hooks/useTheme';
import {
	OrderPdfChartOptions,
	type PdfChartSelection,
} from './OrderPdfChartOptions';
import {
	downloadSingleOrderPdf,
	singleOrderDocument,
} from '../../helpers/singleOrderReport.helper';
import { OrderChartTable } from './OrderChartTable';
import { OrderDateView } from './OrderDateView';
import { captureOrderChart } from '../../helpers/orderChartCapture.helper';
import { createPdfFile } from '../../helpers/pdf.helper';
import {
	istanbulToday,
	orderReportFilename,
} from '../../helpers/orderPeriod.helper';
import {
	formatOrderProduct,
	formatOrderQuantity,
	formatOrderUnitTotals,
} from '../../helpers/orderProduct.helper';

ChartJS.register(
	ArcElement,
	BarElement,
	CategoryScale,
	LinearScale,
	LineElement,
	PointElement,
	Tooltip,
	Legend,
);
// Canvas backgrounds must also be drawn into the bitmap used by PDF export.
function backgroundPlugin(color: string): Plugin {
	return {
		id: 'orderReportBackground',
		beforeDraw: (chart) => {
			const { ctx, width, height } = chart;
			ctx.save();
			ctx.globalCompositeOperation = 'destination-over';
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, width, height);
			ctx.restore();
		},
	};
}

export function OrderCharts({
	data,
	filters,
	refreshing,
	exportOrder,
	onOpenPdf,
}: {
	data: OrdersResponse;
	filters: OrderFilters;
	refreshing: boolean;
	exportOrder?: Order;
	onOpenPdf?: () => void;
}) {
	const { theme } = useTheme();
	const palette = ORDER_CHART_PALETTES[theme === 'dark' ? 'dark' : 'light'];
	const reportBackground = useMemo(
		() => backgroundPlugin(palette.background),
		[palette.background],
	);
	const [dateView, setDateView] = useState<
		'line' | 'bar' | 'calendar' | 'list'
	>('line');
	const [shareFile, setShareFile] = useState<{
		file: File;
		selection: string;
	} | null>(null);
	const baseOptions = {
		responsive: true,
		maintainAspectRatio: false,
		animation: false as const,
		color: palette.text,
	};
	const tooltip = {
		backgroundColor: palette.tooltip,
		titleColor: '#ffffff',
		bodyColor: '#ffffff',
		borderColor: palette.grid,
		borderWidth: 1,
	};
	const axis = {
		ticks: { color: palette.text },
		grid: { color: palette.grid },
		border: { color: palette.grid },
	};
	const lineOptions: ChartOptions<'line'> = {
		...baseOptions,
		plugins: {
			legend: { display: false },
			tooltip: {
				...tooltip,
				callbacks: { label: (c) => formatOrderMoney(c.parsed.y ?? 0) },
			},
		},
		scales: {
			y: {
				...axis,
				beginAtZero: true,
				title: { display: true, text: 'TL', color: palette.text },
			},
			x: { ...axis, ticks: { color: palette.text, maxTicksLimit: 10 } },
		},
	};
	const barOptions: ChartOptions<'bar'> = {
		...baseOptions,
		plugins: { legend: { display: false }, tooltip },
		scales: {
			x: axis,
			y: {
				...axis,
				beginAtZero: true,
				ticks: { color: palette.text, precision: 0 },
				title: { display: true, text: 'Adet', color: palette.text },
			},
		},
	};
	const pieOptions: ChartOptions<'pie'> = {
		...baseOptions,
		plugins: {
			legend: { position: 'bottom', labels: { color: palette.text } },
			tooltip: {
				...tooltip,
				callbacks: {
					label: (c) => `${c.label}: ${formatOrderMoney(c.parsed)}`,
				},
			},
		},
	};
	const dailyRef = useRef<ChartJS<'line'>>(null);
	const typeRef = useRef<ChartJS<'pie'>>(null);
	const memoryRef = useRef<ChartJS<'bar'>>(null);
	const dailyBarRef = useRef<ChartJS<'bar'>>(null);
	const typeBarRef = useRef<ChartJS<'bar'>>(null);
	const memoryPieRef = useRef<ChartJS<'pie'>>(null);
	const [typesAsBar, setTypesAsBar] = useState(false);
	const [memoryAsPie, setMemoryAsPie] = useState(false);
	const moneyBarOptions: ChartOptions<'bar'> = {
		...barOptions,
		scales: { ...barOptions.scales, y: lineOptions.scales!.y },
		plugins: {
			legend: { display: false },
			tooltip: {
				...tooltip,
				callbacks: { label: (c) => formatOrderMoney(c.parsed.y ?? 0) },
			},
		},
	};
	const countPieOptions: ChartOptions<'pie'> = {
		...pieOptions,
		plugins: {
			...pieOptions.plugins,
			tooltip: {
				...tooltip,
				callbacks: {
					label: (c) => `${c.label}: ${c.parsed.toLocaleString('tr-TR')} adet`,
				},
			},
		},
	};
	const [exporting, setExporting] = useState(false);
	const [exportError, setExportError] = useState('');
	const [pdfCharts, setPdfCharts] = useState<PdfChartSelection>({
		daily: !exportOrder,
		byType: !exportOrder,
		byMemory: !exportOrder,
	});
	const shareSelection = JSON.stringify([
		data,
		filters,
		exportOrder,
		pdfCharts,
		typesAsBar,
		memoryAsPie,
		dateView,
		theme,
	]);
	const [previewOpen, setPreviewOpen] = useState(false);
	const previewId = useId();
	async function exportPdf(share = false) {
		if (share && shareFile?.selection === shareSelection) {
			try {
				await navigator.share({
					files: [shareFile.file],
					title: exportOrder?.name || 'Alış raporu',
				});
			} catch (error) {
				if (!(error instanceof DOMException && error.name === 'AbortError'))
					toast.error('PDF paylaşılamadı. Dosyayı indirip paylaşabilirsiniz.');
			}
			return;
		}
		setExporting(true);
		setExportError('');
		try {
			const refs = [
				dateView === 'bar' ? dailyBarRef.current : dailyRef.current,
				typesAsBar ? typeBarRef.current : typeRef.current,
				memoryAsPie ? memoryPieRef.current : memoryRef.current,
			];
			const selected = refs
				.map((chart, index) => ({
					chart,
					key: (['daily', 'byType', 'byMemory'] as const)[index],
				}))
				.filter(
					({ key }) =>
						pdfCharts[key] &&
						(!exportOrder || key !== 'daily') &&
						(key !== 'byMemory' || data.byMemory.length > 0) &&
						(key !== 'daily' || dateView === 'line' || dateView === 'bar'),
				);
			if (selected.some(({ chart }) => !chart))
				throw new Error('Grafikler henüz hazır değil.');
			const images: OrderChartImage[] = selected.map(({ chart, key }) =>
				captureOrderChart(
					chart!,
					key,
					ORDER_CHART_TITLES[key],
					theme === 'dark',
				),
			);
			if (
				!exportOrder &&
				pdfCharts.daily &&
				(dateView === 'calendar' || dateView === 'list')
			)
				images.unshift({
					kind: 'daily',
					title: ORDER_CHART_TITLES.daily,
					image: '',
					view: dateView,
				});
			if (
				share &&
				typeof navigator.share === 'function' &&
				typeof navigator.canShare === 'function'
			) {
				const filename = exportOrder
					? `alis_${exportOrder._id}_${istanbulToday(new Date(exportOrder.createdAt))}.pdf`
					: orderReportFilename(data, filters);
				const file = await createPdfFile(
					exportOrder
						? singleOrderDocument(exportOrder, images)
						: orderReportDocument(data, filters, images),
					filename,
				);
				if (navigator.canShare({ files: [file] })) {
					setShareFile({ file, selection: shareSelection });
					toast.success(
						'PDF hazır. Paylaşmak için PDF’yi paylaş düğmesine dokunun.',
					);
					return;
				}
			}
			if (share)
				toast.info(
					'Bu tarayıcı dosya paylaşımını desteklemiyor. PDF indiriliyor.',
				);
			if (exportOrder) await downloadSingleOrderPdf(exportOrder, images);
			else await downloadOrderReport(data, filters, images);
			toast.success('PDF raporu indirildi');
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'PDF indirilemedi. Tekrar deneyin.';
			setExportError(message);
			toast.error('PDF indirilemedi', { description: message });
		} finally {
			setExporting(false);
		}
	}
	return (
		<section
			className='w-full min-w-0 max-w-full space-y-3 break-words sm:space-y-4'
			aria-label='Alış analizi'
		>
			<div>
				<h3 className='font-semibold'>
					{exportOrder ? 'Alış özeti' : 'Alış analizi'}
				</h3>
				<p className='text-xs opacity-70'>
					{exportOrder
						? 'Yalnızca bu alışın ürünleri, fiyatları ve seçtiğiniz grafikler PDF belgesine eklenir.'
						: 'Grafikler ve PDF, listedeki rapora dahil ettiğiniz alışları kapsar.'}
				</p>
			</div>
			{data.summary.count > 0 && (
				<>
					<details className='min-w-0 max-w-full rounded-xl border border-border p-3 sm:p-4'>
						<AdminSummary index={0}>
							Grafik verilerini tablo olarak göster
						</AdminSummary>
						<OrderChartTable
							title='Ürün ve miktar'
							headers={['Ürün', 'Miktar', 'Tutar']}
							rows={(exportOrder
								? exportOrder.lines
								: (data.byTypeAndMemory ?? [])
							).map((line) => [
								formatOrderProduct(line),
								formatOrderQuantity(line.quantity, line.quantityUnit),
								formatOrderMoney(line.total),
							])}
						/>
						{!exportOrder && (
							<>
								<OrderChartTable
									title='Tarihlere göre toplamlar'
									headers={['Tarih', 'Alış', 'Tutar']}
									rows={data.daily.map((day) => [
										day._id,
										day.count,
										formatOrderMoney(day.total),
									])}
								/>
								<OrderChartTable
									title='Alış detayları'
									headers={['Tarih', 'Alış', 'Miktar', 'Tutar']}
									rows={(data.timeline ?? []).map((order) => [
										new Date(order.createdAt).toLocaleString('tr-TR', {
											timeZone: 'Europe/Istanbul',
										}),
										order.name || order._id,
										formatOrderUnitTotals(order),
										formatOrderMoney(order.total),
									])}
								/>
							</>
						)}
					</details>
					<div className='min-w-0 rounded-xl border border-border p-3 sm:p-4'>
						<AdminCollapseButton
							expanded={previewOpen}
							index={1}
							aria-controls={previewId}
							onClick={() => setPreviewOpen((open) => !open)}
						>
							Grafik önizlemesini göster
						</AdminCollapseButton>
						<div
							id={previewId}
							aria-hidden={!previewOpen}
							inert={!previewOpen}
							className={
								previewOpen ? 'mt-3 min-w-0' : 'h-0 min-w-0 overflow-hidden'
							}
						>
							<div className='grid min-w-0 grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2'>
								{!exportOrder && (
									<>
										{' '}
										<figure className='m-0 min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-white p-3 sm:p-4 text-slate-700 dark:bg-[#101e19] dark:text-slate-200 lg:col-span-2'>
											<figcaption className='mb-3 flex min-w-0 flex-col items-start gap-2 text-sm sm:mb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:text-base [&_label]:min-h-11 [&_label]:min-w-0 [&_label]:max-w-full [&_label]:text-sm'>
												<span className='font-medium'>
													{ORDER_CHART_TITLES.daily}
												</span>
												<select
													aria-label='Tutar grafiği türü'
													className='max-w-full rounded-lg border border-border bg-button-bg px-3 py-1.5 text-sm text-text'
													value={dateView}
													disabled={exporting}
													onChange={(event) =>
														setDateView(event.target.value as typeof dateView)
													}
												>
													<option value='line'>Çizgi</option>
													<option value='bar'>Sütun</option>
													<option value='list'>Tarihe göre liste</option>
													<option value='calendar'>Takvim</option>
												</select>
											</figcaption>
											{dateView === 'calendar' || dateView === 'list' ? (
												<OrderDateView
													orders={data.timeline ?? []}
													value={dateView}
												/>
											) : (
												<div className='relative h-60 w-full min-w-0 max-w-full sm:h-72 [&_canvas]:max-w-full'>
													{dateView === 'bar' ? (
														<Bar
															key={theme}
															ref={dailyBarRef}
															role='img'
															aria-label={ORDER_CHART_TITLES.daily}
															plugins={[reportBackground as Plugin<'bar'>]}
															options={moneyBarOptions}
															data={{
																labels: data.daily.map((d) => d._id),
																datasets: [
																	{
																		label: 'Tutar (TL)',
																		data: data.daily.map((d) => d.total),
																		backgroundColor: palette.series[0],
																		borderRadius: 4,
																	},
																],
															}}
														/>
													) : (
														<Line
															key={theme}
															ref={dailyRef}
															role='img'
															aria-label={ORDER_CHART_TITLES.daily}
															plugins={[reportBackground as Plugin<'line'>]}
															options={lineOptions}
															data={{
																labels: data.daily.map((d) => d._id),
																datasets: [
																	{
																		label: 'Tutar (TL)',
																		data: data.daily.map((d) => d.total),
																		borderColor: palette.series[0],
																		pointBackgroundColor: palette.series[0],
																		tension: 0.2,
																	},
																],
															}}
														/>
													)}
												</div>
											)}
										</figure>
									</>
								)}
								<figure className='m-0 min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-white p-3 sm:p-4 text-slate-700 dark:bg-[#101e19] dark:text-slate-200'>
									<figcaption className='mb-3 flex min-w-0 flex-col items-start gap-2 text-sm sm:mb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:text-base [&_label]:min-h-11 [&_label]:min-w-0 [&_label]:max-w-full [&_label]:text-sm'>
										<span className='font-medium'>
											{ORDER_CHART_TITLES.byType}
										</span>
										<select
											aria-label='Ürün grafik türü'
											className='max-w-full rounded-lg border border-border bg-button-bg px-3 py-1.5 text-sm text-text'
											value={typesAsBar ? 'bar' : 'pie'}
											disabled={exporting}
											onChange={(event) =>
												setTypesAsBar(event.target.value === 'bar')
											}
										>
											<option value='pie'>Pasta</option>
											<option value='bar'>Sütun</option>
										</select>
									</figcaption>
									<div className='relative h-60 w-full min-w-0 max-w-full sm:h-72 [&_canvas]:max-w-full'>
										{typesAsBar ? (
											<Bar
												key={theme}
												ref={typeBarRef}
												role='img'
												aria-label={ORDER_CHART_TITLES.byType}
												plugins={[reportBackground as Plugin<'bar'>]}
												options={moneyBarOptions}
												data={{
													labels: data.byType.map(
														(d) => ORDER_TYPE_LABELS[d._id] ?? d._id,
													),
													datasets: [
														{
															label: 'Tutar (TL)',
															data: data.byType.map((d) => d.total),
															backgroundColor: data.byType.map(
																(entry) =>
																	palette.series[
																		orderTypeColorIndex(entry._id)
																	],
															),
															borderRadius: 4,
														},
													],
												}}
											/>
										) : (
											<Pie
												key={theme}
												ref={typeRef}
												role='img'
												aria-label={ORDER_CHART_TITLES.byType}
												plugins={[reportBackground as Plugin<'pie'>]}
												options={pieOptions}
												data={{
													labels: data.byType.map(
														(d) => ORDER_TYPE_LABELS[d._id] ?? d._id,
													),
													datasets: [
														{
															data: data.byType.map((d) => d.total),
															backgroundColor: data.byType.map(
																(entry) =>
																	palette.series[
																		orderTypeColorIndex(entry._id)
																	],
															),
															borderColor: palette.background,
															borderWidth: 2,
														},
													],
												}}
											/>
										)}
									</div>
								</figure>
								{data.byMemory.length > 0 && (
									<figure className='m-0 min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-white p-3 sm:p-4 text-slate-700 dark:bg-[#101e19] dark:text-slate-200'>
										<figcaption className='mb-3 flex min-w-0 flex-col items-start gap-2 text-sm sm:mb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:text-base [&_label]:min-h-11 [&_label]:min-w-0 [&_label]:max-w-full [&_label]:text-sm'>
											<span className='font-medium'>
												{ORDER_CHART_TITLES.byMemory}
											</span>
											<select
												aria-label='Bellek grafik türü'
												className='max-w-full rounded-lg border border-border bg-button-bg px-3 py-1.5 text-sm text-text'
												value={memoryAsPie ? 'pie' : 'bar'}
												disabled={exporting}
												onChange={(event) =>
													setMemoryAsPie(event.target.value === 'pie')
												}
											>
												<option value='bar'>Sütun</option>
												<option value='pie'>Pasta</option>
											</select>
										</figcaption>
										<div className='relative h-60 w-full min-w-0 max-w-full sm:h-72 [&_canvas]:max-w-full'>
											{memoryAsPie ? (
												<Pie
													key={theme}
													ref={memoryPieRef}
													role='img'
													aria-label={ORDER_CHART_TITLES.byMemory}
													plugins={[reportBackground as Plugin<'pie'>]}
													options={countPieOptions}
													data={{
														labels: data.byMemory.map((d) => `${d._id} GB`),
														datasets: [
															{
																label: 'Adet',
																data: data.byMemory.map((d) => d.quantity),
																backgroundColor: data.byMemory.map(
																	(entry) =>
																		palette.series[
																			orderMemoryColorIndex(entry._id)
																		],
																),
																borderColor: palette.background,
																borderWidth: 2,
															},
														],
													}}
												/>
											) : (
												<Bar
													key={theme}
													ref={memoryRef}
													role='img'
													aria-label={ORDER_CHART_TITLES.byMemory}
													plugins={[reportBackground as Plugin<'bar'>]}
													options={barOptions}
													data={{
														labels: data.byMemory.map((d) => `${d._id} GB`),
														datasets: [
															{
																label: 'Adet',
																data: data.byMemory.map((d) => d.quantity),
																backgroundColor: data.byMemory.map(
																	(entry) =>
																		palette.series[
																			orderMemoryColorIndex(entry._id)
																		],
																),
																borderRadius: 4,
															},
														],
													}}
												/>
											)}
										</div>
									</figure>
								)}
							</div>
						</div>
					</div>
				</>
			)}
			{!onOpenPdf && (
				<OrderPdfChartOptions
					value={pdfCharts}
					onChange={setPdfCharts}
					disabled={exporting}
					hideDaily={Boolean(exportOrder)}
					hideMemory={!data.byMemory.length}
				/>
			)}
			<div className='flex min-w-0 flex-wrap gap-2'>
				<button
					type='button'
					data-action='download-report'
					disabled={exporting || refreshing || data.summary.count === 0}
					onClick={() => (onOpenPdf ? onOpenPdf() : void exportPdf())}
					className='min-h-9 max-w-full rounded-xl border border-border bg-button-bg px-3 py-2 text-sm hover:bg-button-hover-bg disabled:opacity-40'
				>
					{exporting ? 'PDF hazırlanıyor...' : 'PDF raporu indir'}
				</button>
				<button
					type='button'
					data-action='share-report'
					disabled={exporting || refreshing || data.summary.count === 0}
					onClick={() => (onOpenPdf ? onOpenPdf() : void exportPdf(true))}
					className='min-h-9 rounded-xl border border-border bg-button-bg px-3 py-2 text-sm hover:bg-button-hover-bg disabled:opacity-40'
				>
					{shareFile?.selection === shareSelection ? 'PDF’yi paylaş' : 'Paylaş'}
				</button>
			</div>
			{exportError && (
				<p role='alert' className='text-red-500'>
					{exportError}
				</p>
			)}
		</section>
	);
}
