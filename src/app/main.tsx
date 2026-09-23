import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import DevToolsBlocker from './component/DevToolsBlocker.tsx';
import { Layout } from './component/Layout.tsx';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Toaster } from 'sonner';
import type { CSSProperties } from 'react';

function RootFallback({ error }: FallbackProps) {
	const message = error instanceof Error ? error.message : String(error);

	return (
		<div className='flex h-screen items-center justify-center'>
			<div className='text-center'>
				<h1 className='text-xl font-bold text-text'>App crashed</h1>
				<p className='text-sm text-muted-foreground text-text'>{message}</p>
			</div>
		</div>
	);
}

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000, // 1 minute
		},
	},
});

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<DevToolsBlocker>
			<QueryClientProvider client={queryClient}>
				{/*
				 * Sonner's own light/dark palette is skipped in favor of the app's
				 * existing --color-* custom properties (App.css) via sonner's
				 * documented CSS-variable theming hook - so a toast reads as "this
				 * app's modal" rather than "a toast library's default", and
				 * light/dark already resolves for free since those variables
				 * already flip on the .dark class Layout.tsx toggles. richColors
				 * was tried too and dropped: it replaces the whole toast background
				 * with sonner's own baked-in red/amber palette rather than
				 * respecting these overrides. error/warning below tint just the
				 * text instead, matching how the app already flags state elsewhere
				 * (text-red-500 for errors, text-amber-* for a warning callout) on
				 * the same neutral surface every other toast and modal already uses.
				 */}
				<Toaster
					position='bottom-right'
					style={
						{
							'--normal-bg': 'var(--color-modal-bg)',
							'--normal-text': 'var(--color-text)',
							'--normal-border': 'var(--color-border)',
						} as CSSProperties
					}
					toastOptions={{
						classNames: {
							toast: 'rounded-xl! border! font-sans!',
							title: 'text-sm!',
							error: 'text-red-500!',
							warning: 'text-amber-500!',
							actionButton:
								'rounded-xl! bg-button-focus-bg! text-text! hover:bg-button-hover-bg!',
							closeButton:
								'rounded-xl! bg-button-bg! text-text! border-border!',
						},
					}}
				/>
				<ErrorBoundary FallbackComponent={RootFallback}>
					<BrowserRouter>
						<Layout>
							<App></App>
						</Layout>
					</BrowserRouter>
				</ErrorBoundary>
			</QueryClientProvider>
		</DevToolsBlocker>
	</StrictMode>,
);
