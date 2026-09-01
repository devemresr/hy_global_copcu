import {
	useState,
	useLayoutEffect,
	type Dispatch,
	type SetStateAction,
} from 'react';
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

	return <div className='p-2 text-xs text-text'>Failed to load. {message}</div>;
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

type ThemeContextType = {
	theme: Theme;
	setTheme: Dispatch<SetStateAction<Theme>>;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(
	undefined,
);

export const useTheme = () => {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error('useTheme must be used inside ThemeContext.Provider');
	}

	return context;
};

export function Layout({ children }: { children: React.ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);
	const { width } = useWindowSize();
	const mode = width >= PUSH_BREAKPOINT ? 'push' : 'overlay';
	const [theme, setTheme] = useState<Theme>(getInitialTheme);
	useLayoutEffect(() => {
		document.documentElement.classList.toggle('dark', theme === 'dark');
		localStorage.setItem('theme', theme);
	}, [theme]);

	return (
		<div className='flex min-h-screen'>
			<ThemeContext.Provider value={{ theme, setTheme }}>
				<Sidebar isOpen={isOpen} mode={mode} onClose={() => setIsOpen(false)} />

				<div className='flex flex-col flex-1'>
					<ErrorBoundary FallbackComponent={SmallFallback}>
						<Header
							isOpen={isOpen}
							onToggle={() => setIsOpen((o) => !o)}
							mode={mode}
						/>
					</ErrorBoundary>
					<main className='flex-1'>
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
