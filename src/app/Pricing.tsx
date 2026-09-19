import { useState } from 'react';
import {
	ShieldCheck,
	Truck,
	Coins,
	Recycle,
	TriangleAlert,
	MapPin,
	Package,
	Search,
	Wallet,
	CalendarDays,
} from 'lucide-react';
import { Skeleton } from './component/Skelaton';
import WhatsappIcon from './assets/icons/icons8-whatsapp.svg?react';
import { whatsappUrl } from './url.constant';
import { pricing } from './assets/photos/photos';

function HeroCarousel() {
	const [loaded, setLoaded] = useState(false);

	return (
		<div className='w-full flex items-center justify-center relative overflow-hidden my-4 rounded-lg dark:bg-[#0B1F12] bg-[#457e59] bg-[#457e59]'>
			{!loaded && <Skeleton className='absolute inset-0 rounded-sm' />}
			<img
				src={pricing.url}
				alt={pricing.alt}
				onLoad={() => setLoaded(true)}
				className={`max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
			/>
		</div>
	);
}

export function Pricing() {
	return (
		<div className='min-h-screen dark:bg-[#0B1F12] bg-[#80a98d] font-[Inter]'>
			<div className='mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10'>
				{/* Header */}
				<header className='text-center mb-6'>
					<h1 className='font-[Big_Shoulders_Display] text-3xl sm:text-4xl md:text-5xl text-white tracking-tight'>
						Hurda Telefon Anakartı Alım Listesi
					</h1>
					<p className='text-white mt-2'>Eylül ayı güncel fiyatlarımız</p>
				</header>

				<HeroCarousel />

				{/* Trust strip */}
				<div className='grid grid-cols-2 md:grid-cols-4 gap-3 my-8'>
					<div className='flex items-center gap-2 text-white text-sm'>
						<ShieldCheck size={20} className='text-white shrink-0' />
						Güvenilir alım
					</div>
					<div className='flex items-center gap-2 text-white text-sm'>
						<Truck size={20} className='text-white shrink-0' />
						Türkiye geneli kargo
					</div>
					<div className='flex items-center gap-2 text-white text-sm'>
						<Coins size={20} className='text-white shrink-0' />
						Aynı gün ödeme
					</div>
					<div className='flex items-center gap-2 text-white text-sm'>
						<Recycle size={20} className='text-white shrink-0' />
						Geri dönüşüme katkı
					</div>
				</div>

				{/* Notes */}
				<div className='mt-8 rounded-lg border border-[#D4A72C]/40 bg-[#0F2417] p-5'>
					<div className='flex items-center gap-2 mb-3'>
						<TriangleAlert size={20} className='text-[#D4A72C]' />
						<h2 className='font-[Big_Shoulders_Display] text-xl text-[#EAF3EC] tracking-tight'>
							Önemli notlar
						</h2>
					</div>
					<ul className='space-y-2 text-white text-sm'>
						<li>PA, PG kodlu çipler 100 TL olarak değerlendirilir.</li>
						<li>
							Samsung Note 3, Note 4 anakartları 16 GB olarak değerlendirilir.
						</li>
						<li>Fiyatlarımız bu ay için geçerlidir.</li>
						<li>Dürüst ayrıştırma, doğru fiyat, anında ödeme.</li>
					</ul>
				</div>

				{/* Contact footer */}
				<div className='mt-8 rounded-lg bg-[#0F2417] border border-emerald-900/60 p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-8'>
					<div className='flex items-center gap-2 text-white'>
						<MapPin size={20} className='text-white shrink-0' />
						<span>İstanbul Ümraniye, elden teslim alınır</span>
					</div>
					<a className='flex items-center gap-2 text-white' href={whatsappUrl}>
						<WhatsappIcon className='shrink-0 w-5 h-5' />
						<span>0545 517 05 63</span>
					</a>
				</div>

				{/* Small footer icon row */}
				<div className='mt-6 grid grid-cols-2 md:grid-cols-4 gap-3'>
					<div className='flex items-center gap-2 text-white text-xs'>
						<Package size={16} />
						Türkiye'nin her yerinden kargo
					</div>
					<div className='flex items-center gap-2 text-white text-xs'>
						<Search size={16} />
						Ürünleriniz gelir kontrol edilir
					</div>
					<div className='flex items-center gap-2 text-white text-xs'>
						<Wallet size={16} />
						Aynı gün ödeme çıkarılır
					</div>
					<div className='flex items-center gap-2 text-white text-xs'>
						<CalendarDays size={16} />
						Bir gün değil, her gün alıyoruz
					</div>
				</div>
			</div>
		</div>
	);
}
