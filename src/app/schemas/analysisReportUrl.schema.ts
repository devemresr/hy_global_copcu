import { z } from '../util/zodTurkish';
import env from '../config/env';
import { PAGE_PATHS } from '../constants/pagePaths.constant';
import { readAnalysisFilters } from '../helpers/analysisUrl.helper';

export const analysisReportUrlSchema = z
	.string()
	.trim()
	.max(20000)
	.url(
		'http:// veya https:// ile başlayan geçerli bir Analiz bağlantısı girin.',
	)
	.superRefine((value, context) => {
		let url: URL;
		try {
			url = new URL(value);
		} catch {
			return;
		}
		if (
			!['http:', 'https:'].includes(url.protocol) ||
			url.username ||
			url.password ||
			url.pathname !== PAGE_PATHS.ANALYSIS ||
			![
				'purchases',
				'sales',
				'stock',
				'bayis',
				'balance',
				'income',
				'expenses',
			].includes(url.searchParams.get('preset') ?? '') ||
			!readAnalysisFilters(url.searchParams)
		) {
			context.addIssue({
				code: 'custom',
				message:
					'Analiz sayfasında filtrelerinizi seçin ve “Rapor bağlantısını kopyala” düğmesinden aldığınız bağlantıyı yapıştırın.',
			});
		}
		if (
			env.VITE_ENV === 'production' &&
			url.origin !== window.location.origin
		) {
			context.addIssue({
				code: 'custom',
				message: 'Rapor bağlantısı bu sitenin alan adına ait olmalıdır.',
			});
		}
	});
