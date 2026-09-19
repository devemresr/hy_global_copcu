import { MixedText, type TextSegment } from './Terms';

type AboutSection = {
	title: string;
	body: TextSegment[];
};

export const aboutContent: AboutSection[] = [
	{
		title: 'Biz Kimiz',
		body: [
			{ text: 'Global Çöpçü', bold: true },
			{
				text: ', hurda telefon anakartlarını ve elektronik parçaları ',
				bold: false,
			},
			{ text: 'değerlerine göre değerlendirip satın alan', bold: true },
			{
				text: ' bir alım platformudur.',
				bold: false,
			},
		],
	},
	{
		title: 'Ne Yapıyoruz',
		body: [
			{
				text: 'İşimizin özü basit: gönderdiğiniz ürünleri ',
				bold: false,
			},
			{ text: 'dürüst bir şekilde ayrıştırıp doğru fiyat üzerinden değerlendiriyor', bold: true },
			{
				text: ' ve ',
				bold: false,
			},
			{ text: 'aynı gün ödemesini çıkarıyoruz', bold: true, italic: true },
			{
				text: '. Güncel alım fiyatlarımızı ve değerlendirme kriterlerimizi ',
				bold: false,
			},
			{ text: 'fiyatlandırma sayfamızdan', bold: false, italic: true },
			{ text: ' inceleyebilirsiniz.', bold: false },
		],
	},
	{
		title: 'Değerlerimiz',
		body: [
			{ text: 'Şeffaflık, güvenilirlik ve dürüst ayrıştırma', bold: true },
			{
				text: ' işimizin merkezinde yer alır. Her ürünü kendi değeri üzerinden, gizli kesinti yapmadan değerlendiririz.',
				bold: false,
			},
		],
	},
	{
		title: 'Neden Biz?',
		body: [
			{
				text: 'Ürünlerinizi ',
				bold: false,
			},
			{ text: 'kendi değerine göre, doğru ve güncel fiyatlarla', bold: true },
			{
				text: ' değerlendiriyor, ',
				bold: false,
			},
			{ text: 'Türkiye genelinde kargo ile teslim alıyor ve aynı gün ödeme yapıyoruz', bold: true, italic: true },
			{
				text: ' - bir gün değil, her gün.',
				bold: false,
			},
		],
	},
	{
		title: 'İletişim',
		body: [
			{
				text: 'Sorularınız veya geri bildirimleriniz için ',
				bold: false,
			},
			{ text: 'WhatsApp üzerinden bize ulaşabilirsiniz', bold: true, italic: true },
			{ text: ', size en kısa sürede dönüş yapmaktan memnuniyet duyarız.', bold: false },
		],
	},
];

export function AboutPage() {
	return (
		<div className='mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8'>
			<h1 className='mb-6 text-2xl font-bold text-text sm:text-3xl'>
				Hakkımızda
			</h1>
			<div className='flex flex-col gap-6'>
				{aboutContent.map((section) => (
					<section key={section.title}>
						<h2 className='mb-1 text-lg font-semibold text-text'>
							{section.title}
						</h2>
						<MixedText
							parts={section.body}
							className='text-sm leading-relaxed text-text sm:text-base'
						/>
					</section>
				))}
			</div>
		</div>
	);
}
