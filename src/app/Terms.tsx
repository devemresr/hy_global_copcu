type TextSegment = {
	text: string;
	bold?: boolean;
	italic?: boolean;
};

type TermsSection = {
	title: string;
	body: TextSegment[];
};

type MixedTextProps = {
	parts: TextSegment[];
	className?: string;
};

export const termsAndConditions: TermsSection[] = [
	{
		title: '1. Kabul',
		body: [
			{
				text: 'Bu web sitesine ve hizmetlerine erişerek veya bunları kullanarak, ',
				bold: false,
			},
			{ text: 'işbu Kullanım Koşulları', bold: true },
			{
				text: "'nı kabul etmiş sayılırsınız. Koşulların herhangi bir bölümünü kabul etmiyorsanız hizmete erişmemelisiniz.",
				bold: false,
			},
		],
	},
	{
		title: '2. Hizmetin Kullanımı',
		body: [
			{
				text: 'Bu hizmeti yalnızca yasalara uygun amaçlarla kullanmayı kabul edersiniz. Hesap bilgilerinizin ',
				bold: false,
			},
			{
				text: 'gizliliğinden ve hesabınız altında gerçekleşen tüm etkinliklerden',
				bold: true,
				italic: true,
			},
			{ text: ' siz sorumlusunuz.', bold: false },
		],
	},
	{
		title: '3. Fikri Mülkiyet',
		body: [
			{
				text: 'Bu sitedeki tüm içerik, marka, logo ve materyaller Şirket veya lisans verenlerinin mülkiyetindedir. ',
				bold: false,
			},
			{ text: 'İzinsiz kullanım kesinlikle yasaktır.', bold: true },
		],
	},
	{
		title: '4. Kullanıcı Davranışı',
		body: [
			{
				text: 'Hizmeti aksatan veya bozan herhangi bir faaliyette bulunmamayı kabul edersiniz; buna hackleme, spam gönderme veya kötü amaçlı yazılım yayma dahildir. İhlaller ',
				bold: false,
			},
			{ text: 'hesabınızın derhal sonlandırılmasına', bold: true },
			{ text: ' yol açabilir.', bold: false },
		],
	},
	{
		title: '5. Sorumluluğun Sınırlandırılması',
		body: [
			{
				text: 'Şirket, hizmeti kullanmanızdan veya kullanamamanızdan kaynaklanan ',
				bold: false,
			},
			{
				text: 'dolaylı, arızi, özel veya sonuç niteliğindeki',
				bold: false,
				italic: true,
			},
			{ text: ' zararlardan sorumlu tutulamaz.', bold: false },
		],
	},
	{
		title: '6. Fesih',
		body: [
			{
				text: 'Bu Koşulları ihlal ettiğinize veya diğer kullanıcılara zarar verdiğinize inandığımız durumlarda, ',
				bold: false,
			},
			{ text: 'önceden bildirimde bulunmaksızın', bold: true },
			{
				text: ' hesabınıza erişimi askıya alma veya sonlandırma hakkımızı saklı tutarız.',
				bold: false,
			},
		],
	},
	{
		title: '7. Koşullardaki Değişiklikler',
		body: [
			{
				text: 'Bu Kullanım Koşullarını zaman zaman güncelleyebiliriz. Değişiklikler yayımlandıktan sonra hizmeti kullanmaya devam etmeniz, ',
				bold: false,
			},
			{ text: 'güncellenmiş koşulları kabul ettiğiniz', bold: true },
			{ text: ' anlamına gelir.', bold: false },
		],
	},
	{
		title: '8. Uygulanacak Hukuk',
		body: [
			{
				text: 'Bu Koşullar, kanunlar ihtilafı hükümleri dikkate alınmaksızın ',
				bold: false,
			},
			{ text: 'ilgili yargı bölgesinin yasalarına', bold: false, italic: true },
			{ text: ' tabidir ve bu doğrultuda yorumlanır.', bold: false },
		],
	},
];

export function MixedText({ parts, className }: MixedTextProps) {
	return (
		<p className={className}>
			{parts.map(({ text, bold, italic }, i) => (
				<span
					key={i}
					className={`${bold ? 'font-bold' : 'font-normal'} ${italic ? 'italic' : ''}`}
				>
					{text}
				</span>
			))}
		</p>
	);
}

export function TermsPage() {
	return (
		<div className='mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8'>
			<h1 className='mb-6 text-2xl font-bold text-text sm:text-3xl'>
				Kullanım Koşulları
			</h1>
			<div className='flex flex-col gap-6'>
				{termsAndConditions.map((section) => (
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
