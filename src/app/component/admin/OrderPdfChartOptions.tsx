import { Switch } from './Switch';
import { ORDER_CHART_TITLES } from '../../constants/orderReports.constant';

export type PdfChartSelection = {
	daily: boolean;
	byType: boolean;
	byMemory: boolean;
};
export function OrderPdfChartOptions({
	value,
	onChange,
	disabled,
	hideDaily = false,
	hideMemory = false,
}: {
	value: PdfChartSelection;
	onChange: (value: PdfChartSelection) => void;
	disabled: boolean;
	hideDaily?: boolean;
	hideMemory?: boolean;
}) {
	return (
		<fieldset
			className='min-w-0 space-y-3 rounded-xl border border-border p-3'
			disabled={disabled}
		>
			<legend className='px-1 text-sm font-medium'>
				PDF içeriği · Grafikler
			</legend>
			<div className='flex flex-col gap-3'>
				{(Object.keys(ORDER_CHART_TITLES) as (keyof PdfChartSelection)[])
					.filter(
						(key) =>
							(!hideDaily || key !== 'daily') &&
							(!hideMemory || key !== 'byMemory'),
					)
					.map((key) => (
						<Switch
							key={key}
							checked={value[key]}
							disabled={disabled}
							onChange={(checked) => onChange({ ...value, [key]: checked })}
							label={ORDER_CHART_TITLES[key]}
						/>
					))}
			</div>
			<p className='text-xs opacity-70'>
				Kapattığınız grafikler yalnızca PDF dışında bırakılır. Alış bilgileri ve
				fiyat değişiklikleri her zaman dahil edilir.
			</p>
		</fieldset>
	);
}
