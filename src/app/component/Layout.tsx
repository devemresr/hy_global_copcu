import { useState, useLayoutEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useWindowSize } from '../hooks/useWindowSize';
import Footer from './Footer';

const PUSH_BREAKPOINT = 1024;

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
	return saved === 'light' || saved === 'dark'
		? saved
		: window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light';
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

	return (
		<div className='flex min-h-screen'>
			<ThemeContext.Provider value={{ theme }}>
				<Sidebar
					isOpen={isOpenSidebar}
					mode={sidebarMode}
					onClose={() => setSidebar(false)}
				/>

				<div className='flex flex-col flex-1 min-w-0'>
					<ErrorBoundary FallbackComponent={SmallFallback}>
						<Header
							isOpen={isOpenSidebar}
							onToggle={() => setSidebar((o) => !o)}
							mode={sidebarMode}
							setTheme={setTheme}
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
