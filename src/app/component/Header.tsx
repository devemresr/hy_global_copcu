import { Lottie } from 'lottie-react';
import toggleSidebarAnimation from '../assets/icons/icons8-menu.json';
import toggleThemeAnimation from '../assets/icons/DarkLightInteractiveToggle.json';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { LottieHandle } from 'lottie-react';
import type { sideBarDisplayMode } from './Sidebar';
import logger from '../util/logger';
import { whatsappUrl } from '../url.constant';
import WhatsappIcon from '../assets/icons/icons8-whatsapp.svg?react';
import '../App.css';
interface HeaderProps {
	isOpen: boolean;
	onToggle: () => void;
	mode: sideBarDisplayMode;
}

import { replaceColor } from 'lottie-colorify';
import { useTheme } from './Layout';
const TARGET_DURATION_THEME_ANIMATION = 0.9;
const FRAME_RATE = 60;

export function Header({ isOpen, onToggle, mode }: HeaderProps) {
	const { theme, setTheme } = useTheme();

	const themedSidebarAnimation = useMemo(() => {
		return theme === 'dark'
			? toggleSidebarAnimation
			: replaceColor([255, 255, 255], '#000000', toggleSidebarAnimation);
	}, [theme]);

	const lottieThemeRef = useRef<LottieHandle>(null);
	const lottieSideBarRef = useRef<LottieHandle>(null);
	const isAnimatingRef = useRef(false);
	const onCompleteRef = useRef<(() => void) | null>(null);

	const handleSideBar = () => {
		if (mode === 'push') {
			const anim = lottieSideBarRef.current?.animationItem;
			if (anim) {
				const nativeDuration = anim.getDuration(false); // seconds
				const targetDuration = 0.9;
				anim.setSpeed(nativeDuration / targetDuration);
				anim.setDirection(isOpen ? -1 : 1);
				anim.play();
			}
		}
		onToggle();
	};

	const handleTheme = useCallback(() => {
		if (isAnimatingRef.current) return;

		const anim = lottieThemeRef.current?.animationItem;
		if (!anim) return;

		isAnimatingRef.current = true;

		const segmentLength = 90;
		anim.setSpeed(segmentLength / FRAME_RATE / TARGET_DURATION_THEME_ANIMATION);

		const onComplete = () => {
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
	}, [theme]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			const anim = lottieThemeRef.current?.animationItem;
			if (anim && onCompleteRef.current) {
				anim.removeEventListener('complete', onCompleteRef.current);
			}
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		let rafId: number;

		const trySetup = () => {
			if (cancelled) return;

			const anim = lottieThemeRef.current?.animationItem;
			logger.debug({ hasAnim: !!anim, theme }, 'trysetup'); // safe: no circular object

			if (!anim) {
				rafId = requestAnimationFrame(trySetup);
				return;
			}

			const doSetup = () => {
				anim.goToAndStop(theme === 'dark' ? 90 : 0, true);
			};

			if (anim.totalFrames > 0) {
				doSetup();
			} else {
				anim.addEventListener('DOMLoaded', doSetup);
			}
		};

		trySetup();

		return () => {
			cancelled = true;
			cancelAnimationFrame(rafId);
		};
	}, []);

	return (
		<header>
			<div className='h-15 top-0 px-3 lg:h-20 lg:px-10 md:px-5 bg-header-bg flex items-center justify-between w-full border-b-2 border-border'>
				<button
					onClick={handleSideBar}
					className='sm:w-7 sm:h-7 h-5 w-5 lg:h-10 lg:w-10 '
					aria-label='Toggle menu'
				>
					<Lottie
						src={themedSidebarAnimation}
						loop={false}
						autoplay={false}
						lottieRef={lottieSideBarRef}
						className={`w-full h-full bg-header-bg ${
							isOpen ? 'rotate-0' : 'rotate-180'
						}`}
					/>
				</button>
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
					>
						<span className='whitespace-nowrap  text-text lg:text-xl'>
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
