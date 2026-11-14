import { Link } from 'react-router';
import { PAGE_PATHS } from '../../constants/pagePaths.constant';
import { InfoTooltip } from '../InfoTooltip';
export function StockSellingPriceInfo() {
	return (
		<InfoTooltip
			label='Ortalama gerçek satış fiyatı hakkında'
			popupLabel='Satış ortalaması bilgisi'
		>
			{' '}
			<p>
				Aynı ürün türü, bellek boyutu ve birim için seçili rapor filtrelerine
				uyan satışların toplam tutarı, toplam satış miktarına bölünür. Satış
				yoksa fiyat gösterilmez.
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
				}}
			>
				Rapor filtrelerine git
			</Link>
		</InfoTooltip>
	);
}
