import { PURCHASE_PERIOD_PRESETS } from '../constants/purchaseReports.constant';
import { purchasePresetRange } from './purchasePeriod.helper';
export const ANALYSIS_PERIOD_OPTIONS = [
	...PURCHASE_PERIOD_PRESETS,
	{ id: 'allTime', label: 'Tüm zamanlar' },
] as const;
export type AnalysisDefaultPeriod =
	(typeof ANALYSIS_PERIOD_OPTIONS)[number]['id'];
export const ANALYSIS_PREFERENCES_KEY = 'admin.analysis.preferences.v1';
export function readAnalysisDefaultPeriod(): AnalysisDefaultPeriod {
	try {
		const value: unknown = JSON.parse(
			localStorage.getItem(ANALYSIS_PREFERENCES_KEY) ?? 'null',
		);
		if (
			value &&
			typeof value === 'object' &&
			'defaultPeriod' in value &&
			ANALYSIS_PERIOD_OPTIONS.some(
				(option) => option.id === value.defaultPeriod,
			)
		)
			return value.defaultPeriod as AnalysisDefaultPeriod;
	} catch {
		/* Browser storage may be unavailable or contain outdated settings. */
	}
	return 'thisMonth';
}
export function saveAnalysisDefaultPeriod(
	defaultPeriod: AnalysisDefaultPeriod,
) {
	try {
		localStorage.setItem(
			ANALYSIS_PREFERENCES_KEY,
			JSON.stringify({ defaultPeriod }),
		);
		return true;
	} catch {
		return false;
	}
}
export function analysisDefaultRange(
	period: AnalysisDefaultPeriod,
	now = new Date(),
): { from?: string; until?: string } {
	return period === 'allTime' ? {} : purchasePresetRange(period, now);
}
