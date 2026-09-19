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
import { whatsappUrl } from '../url.constant';
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
const TARGET_DURATION_THEME_ANIMATION = 0.9;
const FRAME_RATE = 60;

export function Header({
	isOpen,
	onToggle,
	setTheme,
	sidebarAnimationRef,
	sidebarAnimationSrc,
}: HeaderProps) {
	const { theme } = useTheme();

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
			<div className='h-15 top-0 px-3 lg:h-20 lg:px-10 md:px-5 bg-header-bg flex items-center justify-between w-full border-b-2 border-border'>
				<button
					onClick={onToggle}
					className='sm:w-7 sm:h-7 h-5 w-5 lg:h-10 lg:w-10 '
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
