import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { useLocation } from 'react-router-dom';

function Fallback({ error, resetErrorBoundary }: FallbackProps) {
	const message = error instanceof Error ? error.message : String(error);

	return (
		<div className='flex flex-col items-center justify-center gap-4 p-10 text-center'>
			<h2 className='text-lg font-semibold text-text'>Something went wrong</h2>
			<p className='text-sm text-muted-foreground text-text'>{message}</p>
			<button
				onClick={resetErrorBoundary}
				className='rounded bg-primary px-4 py-2 text-sm text-text'
			>
				Try again
			</button>
		</div>
	);
}

export function RouteErrorBoundary({
	children,
}: {
	children: React.ReactNode;
}) {
	const location = useLocation();
	return (
		<ErrorBoundary
			FallbackComponent={Fallback}
			resetKeys={[location.pathname]} // auto-reset when route changes
		>
			{children}
		</ErrorBoundary>
	);
}
