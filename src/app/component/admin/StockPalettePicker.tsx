import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { STOCK_PALETTES, useStockPalette } from '../../hooks/useStockPalette';
export function StockPalettePicker() {
	const { palette, setPalette } = useStockPalette();
	return (
		<div className='space-y-2'>
			<h3 className='text-sm font-medium'>Stok ve rapor renkleri</h3>
			<div
				className='grid gap-2 sm:grid-cols-2'
				role='group'
				aria-label='Stok renk paleti'
			>
				{STOCK_PALETTES.map((option) => (
					<button
						key={option.id}
						type='button'
						data-stock-palette={option.id}
						aria-pressed={palette === option.id}
						onClick={() => {
							if (!setPalette(option.id))
								toast.error('Renk seçimi bu tarayıcıda kaydedilemedi.');
						}}
						className={
							'min-w-0 rounded-xl border p-3 text-left transition-colors ' +
							(palette === option.id
								? 'border-text bg-button-focus-bg'
								: 'border-border bg-button-bg/40 hover:bg-button-hover-bg')
						}
					>
						<span className='flex items-center justify-between gap-2 text-sm font-medium'>
							{option.label}
							{palette === option.id && <Check size={15} aria-hidden />}
						</span>
						<span
							className='stock-palette-swatches mt-2 flex gap-1.5'
							aria-hidden
						>
							<span style={{ backgroundColor: 'var(--stock-emmc)' }} />
							<span style={{ backgroundColor: 'var(--stock-emcp)' }} />
							<span style={{ backgroundColor: 'var(--stock-iphone)' }} />
							<span style={{ backgroundColor: 'var(--stock-tablet)' }} />
						</span>
						<span className='mt-2 block text-xs text-text/65'>
							{option.description}
						</span>
					</button>
				))}
			</div>
			<p className='text-xs text-text/65'>
				Seçim anında uygulanır ve bu tarayıcıda saklanır. Açık ve koyu temada
				aynı palet kullanılır.
			</p>
		</div>
	);
}
