import { Lottie } from 'lottie-react';
import toggleThemeAnimation from '../assets/icons/DarkLightInteractiveToggle.json';
import {
	useCallback,
	useEffect,
	useRef,
	type Dispatch,
	type RefObject,
	type SetStateAction,
} from 'react';
import type { LottieHandle } from 'lottie-react';
import { useLocation } from 'react-router-dom';
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

import { useTheme } from './Layout';
import type { Theme } from './Layout';
import logger from '../util/logger';
import { PAGE_PATHS } from '../constants/pagePaths.constant';
const TARGET_DURATION_THEME_ANIMATION = 0.9;

// Shared by the nav links and the WhatsApp link so they read as one row.
const HEADER_LINK_TEXT = 'whitespace-nowrap text-text lg:text-lg';

const NAV_LINKS = [
	{ href: '/', label: 'Ürünler' },
	{ href: '/fiyatlandirma', label: 'Fiyatlandırma' },
	{ href: '/bilgi', label: 'Kaynaklar' },
	{ href: '/hakkimizda', label: 'Hakkımızda' },
];
const FRAME_RATE = 60;

export function Header({
	isOpen,
	onToggle,
	setTheme,
	sidebarAnimationRef,
	sidebarAnimationSrc,
}: HeaderProps) {
	const { theme } = useTheme();
	const { pathname } = useLocation();

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
			anim.removeEventListener('complete', onComplete);
			onCompleteRef.current = null;
		};
		onCompleteRef.current = onComplete;
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
			const anim = lottieThemeRef.current?.animationItem;
			if (anim && onCompleteRef.current) {
				logger.debug('[cleanup effect] listener removed');
				anim.removeEventListener('complete', onCompleteRef.current);
			} else {
				logger.debug(
					{ hasAnim: !!anim, hasHandler: !!onCompleteRef.current },
					'[cleanup effect] nothing to remove',
				);
			}
		};
	}, []);

	useEffect(() => {
		logger.debug({ theme }, '[setup effect] running');

		let cancelled = false;
		let rafId: number;

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
				const frame = theme === 'dark' ? 90 : 0;
				logger.debug({ frame }, '[setup effect] goToAndStop');
				anim.goToAndStop(frame, true);
			};

			if (anim.totalFrames > 0) {
				doSetup();
			} else {
				logger.debug('[setup effect] totalFrames is 0, waiting for DOMLoaded');
				anim.addEventListener('DOMLoaded', doSetup);
			}
		};

		trySetup();

		return () => {
			logger.debug('[setup effect] cleanup, cancelling rAF loop');
			cancelled = true;
			cancelAnimationFrame(rafId);
		};
	}, []);

	return (
		<header>
			<div className='h-15 top-0 px-4 sm:px-6 lg:h-20 lg:px-8 bg-header-bg flex items-center justify-between w-full border-b-2 border-border'>
				<div className='flex min-w-0 items-center gap-3 lg:gap-4 xl:gap-6'>
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
						<img src={LOGO.url} alt='GLOBAL ÇÖPÇÜ' className='h-7 w-7 lg:h-9 lg:w-9' />
						{/* Logo only from lg to xl, where the nav links need the room. */}
						<span className='lg:hidden xl:inline'>GLOBAL ÇÖPÇÜ</span>
					</a>
					<nav
						className={`hidden items-center gap-1 ${isOpen ? '' : 'lg:flex'}`}
					>
						{NAV_LINKS.map((link) => (
							<a
								key={link.href}
								href={link.href}
								aria-current={pathname === link.href ? 'page' : undefined}
								className={`${HEADER_LINK_TEXT} rounded-xl px-3 py-1.5 transition-colors hover:bg-button-hover-bg dark:hover:bg-button-bg ${
									pathname === link.href ? 'bg-button-bg font-medium' : 'opacity-80'
								}`}
							>
								{link.label}
							</a>
						))}
					</nav>
				</div>
				<div className='flex items-center gap-1 md:gap-2 '>
					<button onClick={handleTheme}>
						<Lottie
							src={toggleThemeAnimation}
							loop={false}
							autoplay={false}
							lottieRef={lottieThemeRef}
							className='w-full h-full'
						/>
					</button>
					<a
						className='hover:animate-hoverFloatUp flex items-center gap-1 md:gap-2 '
						href={whatsappUrl}
						data-umami-event='whatsapp-click'
						data-umami-event-location='header'
					>
						<span className={HEADER_LINK_TEXT}>
							Bizimle İletişime geçin!
						</span>
						<div className='w-7 h-7 lg:h-12 lg:w-12'>
							<WhatsappIcon className='w-full h-full  shrink-0' />
						</div>
					</a>
				</div>
			</div>
		</header>
	);
}
