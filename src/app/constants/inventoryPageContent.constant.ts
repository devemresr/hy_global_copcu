import { PAGE_PATHS } from './pagePaths.constant';

// Copy for the inventory (home) page. Claims here are restated from the
// Kaynaklar (explanationContent.constant.ts) and Hakkımızda (About.tsx) pages,
// so the home page never promises more than those do.
export const inventoryPageContent = {
	hero: {
		heading: 'Hurda Anakart Bellek Sorgulama',
		body: 'Hurda anakartın değerini belirleyen, üzerindeki bellek çipidir. Çip üzerindeki model/parça kodunu aşağıdaki listede aratarak belleğin tipini ve kapasitesini hemen öğrenebilirsiniz.',
		primaryCta: { label: 'Fiyatları incele', href: '/fiyatlandirma' },
		secondaryCta: { label: 'Kodu nasıl bulurum?', href: '/bilgi' },
	},
	// A step link without href focuses the search box instead of navigating.
	steps: [
		{
			title: 'Kodu bulun',
			text: 'Anakart üzerindeki bellek çipinin model/parça kodunu tespit edin.',
			link: { label: 'Kodu nasıl bulurum?', href: PAGE_PATHS.INFO },
		},
		{
			title: 'Listede arayın',
			text: 'Kodu aşağıdaki arama alanına yazın, eşleşen kayıtları görün.',
			link: { label: 'Aramaya başla' },
		},
		{
			title: 'Değerini öğrenin',
			text: 'Bellek tipi ve kapasitesine göre fiyatlandırmayı değerlendirin.',
			link: { label: 'Fiyatları incele', href: PAGE_PATHS.PRICING },
		},
	],
	whyUs: {
		heading: 'Neden Global Çöpçü?',
		items: [
			{
				title: 'Dürüst ayrıştırma',
				text: 'Her ürünü kendi değeri üzerinden, gizli kesinti yapmadan değerlendiririz.',
			},
			{
				title: 'Aynı gün ödeme',
				text: 'Değerlendirmesi tamamlanan ürünlerin ödemesini aynı gün çıkarırız.',
			},
			{
				title: 'Türkiye geneli kargo',
				text: 'Ürünlerinizi Türkiye’nin her yerinden kargo ile teslim alırız.',
			},
		],
	},
	contact: {
		heading: 'Bir gün değil, her gün alıyoruz.',
		body: 'Ürünlerinizi Türkiye’nin her yerinden kargo ile gönderin, ödemenizi aynı gün yapalım. Sorularınız için bize WhatsApp’tan yazın.',
		cta: 'WhatsApp’tan yazın',
	},
};
