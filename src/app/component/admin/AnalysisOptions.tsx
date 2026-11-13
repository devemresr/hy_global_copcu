import { StockPalettePicker } from './StockPalettePicker';
import { AdminSummary } from './AdminCollapseHeading';
import { STOCK_CONTROL } from '../../constants/stockStyles.constant';
import {
	ANALYSIS_PERIOD_OPTIONS,
	type AnalysisDefaultPeriod,
} from '../../helpers/analysisPreferences.helper';
export function AnalysisOptions({
	defaultPeriod,
	onChange,
}: {
	defaultPeriod: AnalysisDefaultPeriod;
	onChange: (period: AnalysisDefaultPeriod) => void;
}) {
	return (
		<details className='space-y-3 rounded-xl border border-border p-3 sm:p-4'>
			<AdminSummary index={0}>Analiz seçenekleri</AdminSummary>
			<label className='flex w-fit max-w-full flex-col gap-1 text-xs'>
				Varsayılan tarih dönemi
				<select
					aria-label='Analiz varsayılan tarih dönemi'
					className={STOCK_CONTROL + ' w-auto! max-w-64'}
					value={defaultPeriod}
					onChange={(event) =>
						onChange(event.target.value as AnalysisDefaultPeriod)
					}
				>
					{ANALYSIS_PERIOD_OPTIONS.map((period) => (
						<option key={period.id} value={period.id}>
							{period.label}
						</option>
					))}
				</select>
			</label>
			<p className='text-xs text-text/70'>
				Bu tercih bu tarayıcıda saklanır ve Analiz açıldığında uygulanır.
				Buradan değiştirdiğinizde mevcut raporun tarihleri de güncellenir.
				Filtrelerden geçici bir tarih seçmek varsayılanı değiştirmez.
			</p>
			<div className='border-t border-border pt-3'>
				<StockPalettePicker />
			</div>
		</details>
	);
}
