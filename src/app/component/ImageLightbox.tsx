import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { usePinchZoom } from '../hooks/usePinchZoom';
import { useModalHotkeys } from '../hooks/useModalHotkeys';

type Props = {
	src: string;
	alt: string;
	onClose: () => void;
	onPrev?: () => void;
	onNext?: () => void;
};

const noop = () => {};

// Fullscreen viewer with pinch / double-tap / wheel zoom. The parent should
// key it by `src` so zoom resets when the photo changes.
export function ImageLightbox({ src, alt, onClose, onPrev, onNext }: Props) {
	const { containerRef, transform, isZoomed, handlers } =
		usePinchZoom<HTMLDivElement>();

	useModalHotkeys(noop, onClose, { enterEnabled: false, escapeEnabled: true });

	useEffect(() => {
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prevOverflow;
		};
	}, []);

	return (
		<div
			role='dialog'
			aria-modal='true'
			aria-label={alt}
			className='fixed inset-0 z-50 bg-black/95 flex items-center justify-center'
		>
			<div
				ref={containerRef}
				{...handlers}
				onContextMenu={(e) => e.preventDefault()}
				className={`w-full h-full flex items-center justify-center overflow-hidden touch-none select-none ${isZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
			>
				<img
					src={src}
					alt={alt}
					draggable={false}
					style={{
						transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
					}}
					className='max-w-full max-h-full object-contain pointer-events-none [-webkit-touch-callout:none]'
				/>
			</div>

			<button
				onClick={onClose}
				aria-label='Close'
				className='absolute top-3 right-3 p-2 rounded-sm bg-black/60 text-neutral-300 hover:text-amber-500 transition-colors'
			>
				<X size={22} strokeWidth={1.5} />
			</button>

			{!isZoomed && onPrev && (
				<button
					onClick={onPrev}
					aria-label='Previous photo'
					className='absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-sm bg-black/60 text-neutral-300 hover:text-amber-500 transition-colors'
				>
					<ChevronLeft size={28} strokeWidth={1.5} />
				</button>
			)}
			{!isZoomed && onNext && (
				<button
					onClick={onNext}
					aria-label='Next photo'
					className='absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-sm bg-black/60 text-neutral-300 hover:text-amber-500 transition-colors'
				>
					<ChevronRight size={28} strokeWidth={1.5} />
				</button>
			)}

			{!isZoomed && (
				<div className='absolute bottom-4 left-1/2 -translate-x-1/2 w-max max-w-[90vw] text-center px-3 py-1 rounded-sm bg-black/60 font-mono text-xs text-neutral-400 pointer-events-none md:hidden'>
					Yakınlaştırmak için iki parmakla sıkıştırın veya çift dokunun
				</div>
			)}
		</div>
	);
}
