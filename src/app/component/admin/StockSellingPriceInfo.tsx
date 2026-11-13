import { Link } from 'react-router';
import { PAGE_PATHS } from '../../constants/pagePaths.constant';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export function StockSellingPriceInfo() {
	const id = useId();
	const trigger = useRef<HTMLButtonElement>(null);
	const popup = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);
	useEffect(() => {
		if (!position) return;
		function closeOutside(event: PointerEvent) {
			if (
				!popup.current?.contains(event.target as Node) &&
				!trigger.current?.contains(event.target as Node)
			)
				setPosition(null);
		}
		function closeOnEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setPosition(null);
				trigger.current?.focus();
			}
		}
		function closeOnScroll(event: Event) {
			if (!popup.current?.contains(event.target as Node)) setPosition(null);
		}
		document.addEventListener('pointerdown', closeOutside);
		document.addEventListener('keydown', closeOnEscape);
		window.addEventListener('scroll', closeOnScroll, true);
		window.addEventListener('resize', closeOnScroll);
		return () => {
			document.removeEventListener('pointerdown', closeOutside);
			document.removeEventListener('keydown', closeOnEscape);
			window.removeEventListener('scroll', closeOnScroll, true);
			window.removeEventListener('resize', closeOnScroll);
		};
	}, [position]);
	return (
		<>
			<button
				ref={trigger}
				type='button'
				aria-label='Ortalama gerçek satış fiyatı hakkında'
				aria-expanded={!!position}
				aria-controls={position ? id : undefined}
				className='inline-flex shrink-0 rounded p-0.5 text-current hover:bg-text/10 focus-visible:outline-2'
				onClick={() => {
					if (position) {
						setPosition(null);
						return;
					}
					const rect = trigger.current!.getBoundingClientRect();
					setPosition({
						top: Math.min(rect.bottom + 8, window.innerHeight - 220),
						left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)),
					});
				}}
			>
				<Info size={15} aria-hidden />
			</button>
			{position &&
				createPortal(
					<div
						ref={popup}
						id={id}
						role='dialog'
						aria-label='Satış ortalaması bilgisi'
						style={{ top: Math.max(8, position.top), left: position.left }}
						className='fixed z-[9999] w-72 max-w-[calc(100vw_-_1rem)] rounded-lg border border-border bg-modal-bg p-3 text-xs font-normal leading-relaxed text-text shadow-lg'
					>
						<p>
							Aynı ürün türü, bellek boyutu ve birim için seçili rapor
							filtrelerine uyan satışların toplam tutarı, toplam satış miktarına
							bölünür. Satış yoksa fiyat gösterilmez.
						</p>
						<Link
							to={
								document.getElementById('stock-report-filters')
									? '#stock-report-filters'
									: PAGE_PATHS.ANALYSIS + '?preset=stock#stock-report-filters'
							}
							className='mt-2 inline-block font-medium underline'
							onClick={(event) => {
								const panel = document.getElementById('stock-report-filters');
								if (!panel) return;
								event.preventDefault();
								for (
									let parent: HTMLElement | null = panel;
									parent;
									parent = parent.parentElement
								) {
									if (parent instanceof HTMLDetailsElement) parent.open = true;
								}
								panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
								panel
									.querySelector<HTMLElement>('summary')
									?.focus({ preventScroll: true });
								setPosition(null);
							}}
						>
							Rapor filtrelerine git
						</Link>
					</div>,
					document.body,
				)}
		</>
	);
}
