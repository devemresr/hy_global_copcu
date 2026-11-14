import { NavLink, useLocation } from 'react-router';
import { LogOut } from 'lucide-react';
import { useLogout } from '../hooks/api/endpoints/useAuth';
import { AdminHeaderBalance } from './admin/AdminHeaderBalance';
import { Lottie } from 'lottie-react';
import toggleThemeAnimation from '../assets/icons/DarkLightInteractiveToggle.json';
import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type RefObject,
	type SetStateAction,
} from 'react';
import type { LottieHandle } from 'lottie-react';
import { whatsappUrl } from '../constants/url.constant';
import { LOGO } from '../assets/photos/photos';
import WhatsappIcon from '../assets/icons/icons8-whatsapp.svg?react';
import '../App.css';
interface HeaderProps {
	isOpen: boolean;
	onToggle: () => void;
	setTheme: Dispatch<SetStateAction<Theme>>;
	// owned by Layout so the sidebar's own cancel button can drive the same
	// animation instance as this header's toggle button
	sidebarAnimationRef: RefObject<LottieHandle | null>;
	sidebarAnimationSrc: object;
}

import { useTheme, type Theme } from '../hooks/useTheme';
import logger from '../util/logger';
import { PAGE_PATHS } from '../constants/pagePaths.constant';
const TARGET_DURATION_THEME_ANIMATION = 0.9;

// Shared by the nav links and the WhatsApp link so they read as one row.
const HEADER_LINK_TEXT =
	'whitespace-nowrap text-sm text-text sm:text-base lg:text-lg';

const NAV_LINKS = [
	{ href: '/', label: 'Ürünler' },
	{ href: '/fiyatlandirma', label: 'Fiyatlandırma' },
	{ href: '/bilgi', label: 'Kaynaklar' },
	{ href: '/hakkimizda', label: 'Hakkımızda' },
];
const ADMIN_LINKS = [
	{ href: PAGE_PATHS.ADMIN, label: 'Yönetim' },
	{ href: PAGE_PATHS.PURCHASES, label: 'Alış' },
	{ href: PAGE_PATHS.SALES, label: 'Satış' },
	{ href: PAGE_PATHS.STOCK, label: 'Stok' },
	{ href: PAGE_PATHS.BALANCE, label: 'Bakiye' },
	{ href: PAGE_PATHS.ANALYSIS, label: 'Analiz' },
];
function AdminLogoutButton() {
	const logout = useLogout();
	return (
		<button
			type='button'
			onClick={() => logout.mutate()}
			disabled={logout.isPending}
			aria-label={logout.isPending ? 'Çıkış yapılıyor...' : 'Çıkış yap'}
			title='Çıkış yap'
			className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-text hover:bg-button-hover-bg disabled:opacity-50'
		>
			<LogOut size={18} aria-hidden />
		</button>
	);
}
const FRAME_RATE = 60;

export function Header({
	isOpen,
	onToggle,
	setTheme,
	sidebarAnimationRef,
	sidebarAnimationSrc,
}: HeaderProps) {
	const { theme } = useTheme();
	const [initialTheme] = useState(theme);
	const { pathname } = useLocation();
	const isAdminPage =
		pathname === PAGE_PATHS.ADMIN ||
		pathname.startsWith(PAGE_PATHS.ADMIN + '/');

	const lottieThemeRef = useRef<LottieHandle>(null);
	const isAnimatingRef = useRef(false);
	const onCompleteRef = useRef<(() => void) | null>(null);

	const handleTheme = useCallback(() => {
		logger.debug(
			{ isAnimating: isAnimatingRef.current },
			'[handleTheme] called',
		);

		if (isAnimatingRef.current) {
			logger.debug('[handleTheme] bailing early animation already in progress');
			return;
		}

		const anim = lottieThemeRef.current?.animationItem;
		if (!anim) {
			logger.debug('[handleTheme] no animationItem found on lottieThemeRef');

			return;
		}

		isAnimatingRef.current = true;

		const segmentLength = 90;
		const speed = segmentLength / FRAME_RATE / TARGET_DURATION_THEME_ANIMATION;
		anim.setSpeed(speed);
		logger.debug(
			{ speed, FRAME_RATE, TARGET_DURATION_THEME_ANIMATION },
			'[handleTheme] setting speed',
		);

		const onComplete = () => {
			logger.debug(
				'[handleTheme] animation complete, resetting isAnimatingRef',
			);
			isAnimatingRef.current = false;
			onCompleteRef.current?.();
		};
		// Keep cleanup bound to the animation that owns the listener. Lottie
		// replaces its imperative handle when the animation finishes loading.
		onCompleteRef.current = () => {
			anim.removeEventListener('complete', onComplete);
			onCompleteRef.current = null;
		};
		anim.addEventListener('complete', onComplete);

		if (theme === 'dark') {
			anim.playSegments([91, 180], true);
		} else {
			anim.playSegments([0, 90], true);
		}

		setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
	}, [theme, setTheme]);

	// Cleanup on unmount
	useEffect(() => {
		logger.debug('[cleanup effect] mounted');
		return () => {
			onCompleteRef.current?.();
			isAnimatingRef.current = false;
		};
	}, []);

	useEffect(() => {
		logger.debug({ theme: initialTheme }, '[setup effect] running');

		let cancelled = false;
		let rafId: number | undefined;
		let removeLoadedListener: (() => void) | undefined;

		const trySetup = () => {
			if (cancelled) return;

			const anim = lottieThemeRef.current?.animationItem;

			if (!anim) {
				logger.debug('[setup effect] no animationItem yet, retrying');

				rafId = requestAnimationFrame(trySetup);
				return;
			}
			logger.debug(
				{ totalFrames: anim.totalFrames },
				'[setup effect] animationItem found',
			);

			const doSetup = () => {
				if (cancelled) return;
				removeLoadedListener?.();
				const frame = initialTheme === 'dark' ? 90 : 0;
				logger.debug({ frame }, '[setup effect] goToAndStop');
				anim.goToAndStop(frame, true);
			};

			if (anim.totalFrames > 0) {
				doSetup();
			} else {
				logger.debug('[setup effect] totalFrames is 0, waiting for DOMLoaded');
				removeLoadedListener = () =>
					anim.removeEventListener('DOMLoaded', doSetup);
				anim.addEventListener('DOMLoaded', doSetup);
			}
		};

		trySetup();

		return () => {
			logger.debug('[setup effect] cleanup, cancelling rAF loop');
			cancelled = true;
			if (rafId !== undefined) cancelAnimationFrame(rafId);
			removeLoadedListener?.();
		};
	}, [initialTheme]);

	return (
		<header className='w-full min-w-0'>
			<div
				className={`${isAdminPage ? 'min-h-15 py-2 lg:min-h-20' : 'h-15 lg:h-20'} top-0 px-4 sm:px-6 lg:px-8 bg-header-bg flex items-center justify-between gap-2 w-full border-b-2 border-border`}
			>
				<div
					className={`flex min-w-0 items-center gap-3 lg:gap-4 xl:gap-6 ${isAdminPage ? 'flex-1 flex-wrap' : ''}`}
				>
					<button
						onClick={onToggle}
						className='sm:w-7 sm:h-7 h-5 w-5 lg:h-10 lg:w-10 shrink-0'
						aria-label='Toggle menu'
					>
						<Lottie
							src={sidebarAnimationSrc}
							loop={false}
							autoplay={false}
							lottieRef={sidebarAnimationRef}
							className={`w-full h-full bg-header-bg ${
								isOpen ? 'rotate-0' : 'rotate-180'
							}`}
						/>
					</button>
					{/* The open sidebar already shows the brand and these links. */}
					<a
						href={PAGE_PATHS.HOME}
						className={`hidden sm:flex items-center gap-2 whitespace-nowrap font-bold text-heading-text lg:text-lg ${
							isOpen ? 'lg:hidden' : ''
						}`}
					>
						<img
							src={LOGO.url}
							alt='GLOBAL ÇÖPÇÜ'
							className='h-7 w-7 lg:h-9 lg:w-9'
						/>
						{/* Logo only from lg to xl, where the nav links need the room. */}
						<span className='lg:hidden xl:inline'>GLOBAL ÇÖPÇÜ</span>
					</a>
					<nav
						aria-label={isAdminPage ? 'Yönetim sayfaları' : 'Site sayfaları'}
						className={
							isAdminPage
								? 'flex min-w-0 flex-1 flex-wrap items-center gap-1'
								: `hidden items-center gap-1 ${isOpen ? '' : 'lg:flex'}`
						}
					>
						{isAdminPage
							? ADMIN_LINKS.map((link) => (
									<NavLink
										key={link.href}
										to={link.href}
										end
										className={({ isActive }) =>
											`rounded-lg px-2 py-2 text-xs font-medium text-text sm:text-sm ${isActive ? 'bg-text text-bg!' : 'hover:bg-button-hover-bg'}`
										}
									>
										{link.label}
									</NavLink>
								))
							: NAV_LINKS.map((link) => (
									<a
										key={link.href}
										href={link.href}
										aria-current={pathname === link.href ? 'page' : undefined}
										className={`${HEADER_LINK_TEXT} rounded-xl px-3 py-1.5 transition-colors hover:bg-button-hover-bg dark:hover:bg-button-bg ${
											pathname === link.href
												? 'bg-button-bg font-medium'
												: 'opacity-80'
										}`}
									>
										{link.label}
									</a>
								))}
					</nav>
					{isAdminPage && (
						<div className='flex w-full min-w-0 justify-end xl:w-auto'>
							<AdminHeaderBalance />
						</div>
					)}
				</div>
				<div className='flex min-w-0 items-center gap-1 md:gap-2'>
					<button
						onClick={handleTheme}
						className='flex h-11 w-14 shrink-0 items-center justify-center sm:w-16'
						aria-label='Temayı değiştir'
					>
						<Lottie
							src={toggleThemeAnimation}
							loop={false}
							autoplay={false}
							lottieRef={lottieThemeRef}
							className='w-full h-full'
						/>
					</button>
					{isAdminPage ? (
						<AdminLogoutButton />
					) : (
						<a
							className='hover:animate-hoverFloatUp flex items-center gap-1 md:gap-2 '
							href={whatsappUrl}
							data-umami-event='whatsapp-click'
							data-umami-event-location='header'
						>
							<span className={HEADER_LINK_TEXT}>Bizimle İletişime geçin!</span>
							<div className='w-7 h-7 lg:h-12 lg:w-12'>
								<WhatsappIcon className='w-full h-full  shrink-0' />
							</div>
						</a>
					)}
				</div>
			</div>
		</header>
	);
}
