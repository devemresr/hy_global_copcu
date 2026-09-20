import { useState, useLayoutEffect, useMemo, useRef } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useWindowSize } from '../hooks/useWindowSize';
import Footer from './Footer';
import toggleSidebarAnimation from '../assets/icons/icons8-menu.json';
import { replaceColor } from 'lottie-colorify';
import type { LottieHandle } from 'lottie-react';
import logger from '../util/logger';

const PUSH_BREAKPOINT = 1024;
const SIDEBAR_ANIMATION_TARGET_DURATION = 0.9;

import { createContext, useContext } from 'react';
import { RouteErrorBoundary } from './RouteErrorBoundary';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

function SmallFallback({ error }: FallbackProps) {
	const message = error instanceof Error ? error.message : String(error);

	return (
		<div className='p-2 text-xs text-text'>Bir hata oluştu. {message}</div>
	);
}

function getInitialTheme(): Theme {
	const saved = localStorage.getItem('theme');
	return saved === 'light' || saved === 'dark' ? saved : 'dark';
}
export type Theme = 'light' | 'dark';
const DEFAULT_THEME = { theme: 'dark' };

export const ThemeContext = createContext<{ theme: Theme } | undefined>(
	undefined,
);

export const useTheme = () => {
	const context = useContext(ThemeContext);

	if (!context) {
		if (process.env.NODE_ENV !== 'production') {
			throw new Error('useTheme must be used inside ThemeContext.Provider');
		}
		return DEFAULT_THEME;
	}

	return context;
};

export function Layout({ children }: { children: React.ReactNode }) {
	const [isOpenSidebar, setSidebar] = useState(false);
	const { width } = useWindowSize();
	const sidebarMode = width >= PUSH_BREAKPOINT ? 'push' : 'overlay';
	const [theme, setTheme] = useState<Theme>(getInitialTheme);
	useLayoutEffect(() => {
		document.documentElement.classList.toggle('dark', theme === 'dark');
		localStorage.setItem('theme', theme);
	}, [theme]);

	// Owned here (not in Header) so both the header's toggle button and the
	// sidebar's own cancel button can drive the same hamburger<->X animation.
	const sidebarAnimationRef = useRef<LottieHandle>(null);
	const themedSidebarAnimation = useMemo(() => {
		return theme === 'dark'
			? toggleSidebarAnimation
			: replaceColor([255, 255, 255], '#000000', toggleSidebarAnimation);
	}, [theme]);

	function playSidebarAnimation(closing: boolean) {
		if (sidebarMode !== 'push') return; // overlay mode has no icon animation
		const anim = sidebarAnimationRef.current?.animationItem;
		if (!anim) {
			logger.debug('[playSidebarAnimation] no animationItem found');
			return;
		}
		const nativeDuration = anim.getDuration(false); // seconds
		anim.setSpeed(nativeDuration / SIDEBAR_ANIMATION_TARGET_DURATION);
		anim.setDirection(closing ? -1 : 1);
		anim.play();
	}

	function handleToggleSidebar() {
		playSidebarAnimation(isOpenSidebar); // currently open => this toggle is closing it
		setSidebar((o) => !o);
	}

	function handleCloseSidebar() {
		if (isOpenSidebar) playSidebarAnimation(true);
		setSidebar(false);
	}

	return (
		<div className='flex min-h-screen'>
			<ThemeContext.Provider value={{ theme }}>
				<Sidebar
					isOpen={isOpenSidebar}
					mode={sidebarMode}
					onClose={handleCloseSidebar}
				/>

				<div className='flex flex-col flex-1 min-w-0'>
					<ErrorBoundary FallbackComponent={SmallFallback}>
						<Header
							isOpen={isOpenSidebar}
							onToggle={handleToggleSidebar}
							setTheme={setTheme}
							sidebarAnimationRef={sidebarAnimationRef}
							sidebarAnimationSrc={themedSidebarAnimation}
						/>
					</ErrorBoundary>

					<main className='flex-1 min-w-0'>
						<RouteErrorBoundary>{children}</RouteErrorBoundary>
					</main>
					<ErrorBoundary FallbackComponent={SmallFallback}>
						<Footer />
					</ErrorBoundary>
				</div>
			</ThemeContext.Provider>
		</div>
	);
}
