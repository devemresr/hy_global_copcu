import type { FallbackProps } from 'react-error-boundary';

export function RootFallback({ error }: FallbackProps) {
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
