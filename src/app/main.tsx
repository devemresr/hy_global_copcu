import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import DevToolsBlocker from './component/DevToolsBlocker.tsx';
import { Layout } from './component/Layout.tsx';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

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
