import { Skeleton } from './Skelaton';

export function GridSkeleton({ rows, cols }: { rows: number; cols: number }) {
	return (
		<div className='w-full h-full flex flex-col gap-2 p-2'>
			{/* header row */}
			<div className='flex gap-2'>
				{Array.from({ length: cols }).map((_, i) => (
					<Skeleton key={`h-${i}`} className='h-6 flex-1' />
				))}
			</div>
			{/* body rows */}
			{Array.from({ length: rows }).map((_, r) => (
				<div key={`r-${r}`} className='flex gap-2'>
					{Array.from({ length: cols }).map((_, c) => (
						<Skeleton key={`r-${r}-c-${c}`} className='h-5 flex-1' />
					))}
				</div>
			))}
		</div>
	);
}
