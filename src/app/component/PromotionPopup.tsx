import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, MapPin, ShieldCheck, Truck, Wallet, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { pricing } from '../assets/photos/photos';
import WhatsappIcon from '../assets/icons/icons8-whatsapp.svg?react';
import { PAGE_PATHS } from '../constants/pagePaths.constant';
import { displayPhoneNumber, whatsappUrl } from '../constants/url.constant';
import { DEFAULT_PROMOTION, type PromotionSettings } from '../constants/promotion.constant';
import { useSiteStatus } from '../hooks/api/endpoints/useSiteStatus';

const SEEN_KEY = 'hy-global-promotion-seen';
// Also remember within this visit when browser storage is unavailable.
let seenThisVisit = false;

function shouldShowPromotion() {
	try {
		return !seenThisVisit && localStorage.getItem(SEEN_KEY) !== 'true';
	} catch {
		return !seenThisVisit;
	}
}

export function HomepagePromotion() {
	const { data, isPending, fetchStatus } = useSiteStatus();
	if (isPending && fetchStatus === 'fetching') return null;
	const promotion = data?.promotion ?? DEFAULT_PROMOTION;
	return promotion.enabled ? <PromotionPopup promotion={promotion} /> : null;
}

export function PromotionPopup({ promotion = DEFAULT_PROMOTION, preview = false, onClose }: {
	promotion?: PromotionSettings;
	preview?: boolean;
	onClose?: () => void;
}) {
	// Keep local development reviewable even after a previous dismissal.
	const repeat = preview || (import.meta.env.DEV && import.meta.env.MODE !== 'test') || promotion.showEveryVisit;
	const [isOpen, setIsOpen] = useState(() => repeat || shouldShowPromotion());
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const dialog = dialogRef.current;
		if (!dialog) return;
		const previousFocus = document.activeElement;
		dialog.showModal();
		if (!repeat) {
			seenThisVisit = true;
			try {
				localStorage.setItem(SEEN_KEY, 'true');
			} catch {
				// Storage can be blocked in private browsing or by browser policy.
			}
		}
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			dialog.close();
			document.body.style.overflow = previousOverflow;
			if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
				previousFocus.focus();
			}
		};
	}, [isOpen, repeat]);

	if (!isOpen) return null;
	const close = () => { setIsOpen(false); onClose?.(); };

	return (
		<dialog
			ref={dialogRef}
			aria-labelledby='promotion-title'
			aria-describedby='promotion-description'
			onCancel={(event) => { event.preventDefault(); close(); }}
			onClick={(event) => { if (event.target === event.currentTarget) close(); }}
			className='fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-2xl border border-emerald-800 bg-[#0F2417] p-0 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm'
		>
			<div className='sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-emerald-900 bg-[#0F2417] px-4 py-3'>
				<span className='min-w-0 break-words text-xs font-semibold tracking-widest text-emerald-300'>{promotion.brandLabel || DEFAULT_PROMOTION.brandLabel}</span>
				<button type='button' autoFocus onClick={close} aria-label='Tanıtımı kapat' className='shrink-0 rounded-full bg-white/10 p-2 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300'>
					<X size={20} aria-hidden />
				</button>
			</div>
			<div className='grid md:grid-cols-2'>
				<Link to={PAGE_PATHS.PRICING} onClick={close} aria-label='Fiyat listesi ve tüm detayları görüntüle' className='block self-start bg-black/20 focus-visible:outline-2 focus-visible:outline-emerald-300'>
					<img src={pricing.url} alt='Hurda telefon anakartı alım fiyat listesi ve kargo bilgileri' className='h-auto w-full' />
				</Link>
				<div className='flex flex-col justify-center p-5 sm:p-7'>
					<p className='text-sm font-medium text-emerald-300'>{promotion.tagline || DEFAULT_PROMOTION.tagline}</p>
					<h2 id='promotion-title' className='mt-2 break-words text-2xl font-bold leading-tight sm:text-3xl'>{promotion.title || DEFAULT_PROMOTION.title}</h2>
					<p id='promotion-description' className='mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-emerald-100/80'>{promotion.description || DEFAULT_PROMOTION.description}</p>
					<ul className='my-6 space-y-3 text-sm'>
						<li className='flex items-center gap-3'><ShieldCheck size={19} className='shrink-0 text-emerald-300' aria-hidden />Güvenilir alım, doğru fiyatlandırma</li>
						<li className='flex items-center gap-3'><Wallet size={19} className='shrink-0 text-emerald-300' aria-hidden />Ürün kontrolü sonrası aynı gün ödeme</li>
						<li className='flex items-center gap-3'><Truck size={19} className='shrink-0 text-emerald-300' aria-hidden />Türkiye'nin her yerinden kargo ile gönderim</li>
						<li className='flex items-center gap-3'><MapPin size={19} className='shrink-0 text-emerald-300' aria-hidden />İstanbul Ümraniye'de elden teslim</li>
					</ul>
					<a href={whatsappUrl} onClick={close} data-umami-event='whatsapp-click' data-umami-event-location='promotion-popup' className='flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-300'>
						<WhatsappIcon className='h-5 w-5' aria-hidden />{displayPhoneNumber} · WhatsApp
					</a>
					<Link to={PAGE_PATHS.PRICING} onClick={close} className='mt-3 flex items-center justify-center gap-2 rounded-xl border border-emerald-700 px-4 py-3 text-sm font-medium hover:bg-white/10'>Fiyat listesini incele<ArrowUpRight size={17} aria-hidden /></Link>
					<button type='button' onClick={close} className='mt-4 self-center rounded px-3 py-2 text-sm text-emerald-100/70 underline underline-offset-4 hover:text-white'>Ana sayfaya devam et</button>
				</div>
			</div>
		</dialog>
	);
}
