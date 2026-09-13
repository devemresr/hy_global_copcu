import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { SAMPLE_PHOTOS } from './assets/photos/photos';
import { pageContent } from './constants/explanationContent.constant';
import { Skeleton } from './component/Skelaton';

export function Explanation({ photos = SAMPLE_PHOTOS }) {
	const [index, setIndex] = useState(0);
	const [loadedThumbs, setLoadedThumbs] = useState<Set<string>>(new Set());
	const [loaded, setLoaded] = useState(false);
	const photoCount = photos.length;
	const current = photos[index];

	const goTo = useCallback(
		async (next: number) => {
			const resultIndex = ((next % photoCount) + photoCount) % photoCount;
			if (index === resultIndex) return;
			setLoaded(false);
			setIndex(resultIndex);
		},
		[photoCount, index],
	);

	const prev = useCallback(() => goTo(index - 1), [goTo, index]);
	const next = useCallback(() => goTo(index + 1), [goTo, index]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'ArrowLeft') prev();
			if (e.key === 'ArrowRight') next();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [prev, next]);

	const markThumbLoaded = async (url: string) => {
		setLoadedThumbs((prev) => {
			if (prev.has(url)) return prev;
			const next = new Set(prev);
			next.add(url);
			return next;
		});
	};

	const { hero, infoSection, steps, whyImportant, closing } = pageContent;

	return (
		<div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 '>
			{/* text content */}
			<div className='px-4 pb-6'>
				<section>
					<h1 className='text-xl md:text-2xl font-bold text-heading-text'>
						{hero.heading}
					</h1>
					<p className='text-base text-text leading-relaxed mt-4'>
						{hero.body}
					</p>
				</section>

				<section>
					<h2 className='text-xl md:text-2xl font-semibold  mt-8 text-heading-text'>
						{infoSection.heading}
					</h2>
					<p className='text-base text-text mt-2'>{infoSection.body}</p>

					{/* stage */}
					<div className='w-full max-h-120 md:max-h-[80vh] flex items-center justify-center relative overflow-hidden my-4'>
						{!loaded && <Skeleton className='absolute inset-0 rounded-sm ' />}
						<img
							key={current.url}
							src={current.url}
							alt={current.label}
							onLoad={() => setLoaded(true)}
							className={`max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
						/>

						{photoCount > 1 && (
							<>
								<button
									onClick={prev}
									aria-label='Previous photo'
									className='absolute left-0 top-0 bottom-0 w-16 flex items-center justify-start pl-2 text-neutral-300 hover:text-amber-500 focus-visible:text-amber-500 focus-visible:outline-2 focus-visible:outline-amber-500 transition-colors bg-linear-to-r from-black/40 to-transparent'
								>
									<ChevronLeft size={28} strokeWidth={1.5} />
								</button>
								<button
									onClick={next}
									aria-label='Next photo'
									className='absolute right-0 top-0 bottom-0 w-16 flex items-center justify-end pr-2 text-neutral-300 hover:text-amber-500 focus-visible:text-amber-500 focus-visible:outline-2 focus-visible:outline-amber-500 transition-colors bg-linear-to-l from-black/40 to-transparent'
								>
									<ChevronRight size={28} strokeWidth={1.5} />
								</button>
							</>
						)}

						<a
							href={current.url}
							target='_blank'
							rel='noreferrer'
							aria-label='Open full size'
							className='absolute top-3 right-3 p-1.5 rounded-sm bg-black/50 text-neutral-300 hover:text-amber-500 transition-colors'
						>
							<ZoomIn size={16} strokeWidth={1.5} />
						</a>

						<div className='absolute bottom-3 right-3 px-2 py-0.5 rounded-sm bg-black/60 font-mono text-xs text-neutral-400'>
							{index + 1} / {photoCount}
						</div>
					</div>

					{/* caption */}
					<div className='px-4 py-3 border-t border-neutral-800'>
						<div className='font-mono text-sm text-text tracking-wide'>
							{current.label}
						</div>
					</div>

					{/* filmstrip */}
					{photoCount > 1 && (
						// <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 min-w-0'>
						<div className='overflow-x-auto min-w-0 flex gap-1'>
							{photos.map((p, i: number) => (
								<button
									key={p.url}
									onClick={() => goTo(i)}
									aria-label={`View ${p.label}`}
									aria-current={i === index}
									className={`shrink-0 w-8 h-8 md:w-14 md:h-14 rounded-sm overflow-hidden border relative transition-colors ${
										i === index
											? 'border-amber-500'
											: 'border-neutral-800 hover:border-neutral-600'
									}`}
								>
									{!loadedThumbs.has(p.url) && (
										<Skeleton className='absolute inset-0' />
									)}
									<img
										src={p.url}
										alt={p.label}
										onLoad={() => markThumbLoaded(p.url)}
										className={`max-w-full max-h-full min-w-0 min-h-0 w-full h-full object-cover transition-opacity duration-150 ${
											loadedThumbs.has(p.url) ? 'opacity-100' : 'opacity-0'
										}`}
									/>
								</button>
							))}
						</div>
					)}

					<div className='bg-amber-50 border-l-4 border-amber-400 p-4 rounded mt-4'>
						<span className='font-semibold text-amber-800'>
							{infoSection.note.label}:{' '}
						</span>
						<span className='text-amber-700'>{infoSection.note.text}</span>
					</div>
				</section>

				<section>
					<h2 className='text-2xl font-semibold mt-8 text-heading-text'>
						{steps.heading}
					</h2>
					<ol className='space-y-3 mt-4'>
						{steps.items.map((item, i) => (
							<li key={i} className='flex items-start gap-3'>
								<span className='flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-semibold shrink-0'>
									{i + 1}
								</span>
								<div>
									<p className='font-medium text-heading-text'>{item.title}</p>
									<p className='text-text text-sm'>{item.text}</p>
								</div>
							</li>
						))}
					</ol>
				</section>

				<section>
					<h2 className='text-2xl font-semibold text-heading-text mt-8'>
						{whyImportant.heading}
					</h2>
					<p className='text-base text-text mt-2'>{whyImportant.body}</p>
				</section>

				<p className='text-base text-text italic mt-6'>{closing.body}</p>
			</div>
		</div>
	);
}
