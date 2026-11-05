export type PromotionSettings = {
	enabled: boolean;
	showEveryVisit: boolean;
	brandLabel: string | null;
	title: string | null;
	tagline: string | null;
	description: string | null;
};

export const DEFAULT_PROMOTION: PromotionSettings = {
	enabled: true,
	showEveryVisit: false,
	brandLabel: 'HY GLOBAL ÇÖPÇÜ',
	title: 'Hurda telefon anakartlarınızı değerlendiriyoruz!',
	tagline: 'Atıklar değere dönüşür',
	description:
		'Tüm marka telefon anakartlarınız için hafıza ve işlemci bazlı alım. Fiyat listemizi inceleyin, ürünleriniz için bizimle iletişime geçin.',
};
