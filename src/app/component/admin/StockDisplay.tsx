import { StockSellingPriceInfo } from './StockSellingPriceInfo';
import {
	Cpu,
	MemoryStick,
	Smartphone,
	Tablet,
	Package,
	Banknote,
	ShoppingCart,
	TrendingUp,
	Tag,
	type LucideIcon,
} from 'lucide-react';
import {
	STOCK_PRODUCT_COLORS,
	STOCK_VALUE_COLORS,
} from '../../constants/stockPresentation.constant';
import { PURCHASE_PRODUCT_TYPES } from '../../constants/purchaseProducts.constant';
import { formatPurchaseProduct } from '../../helpers/purchaseProduct.helper';

const icons = {
	EMMC: Cpu,
	EMCP: MemoryStick,
	IPHONE: Smartphone,
	TABLET: Tablet,
};

export function StockProductTag({
	type,
	memoryGb,
	compact = false,
}: {
	type: keyof typeof PURCHASE_PRODUCT_TYPES;
	memoryGb?: number | null;
	compact?: boolean;
}) {
	const Icon = icons[type];
	return (
		<span
			className={
				'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold ' +
				STOCK_PRODUCT_COLORS[type]
			}
		>
			<Icon size={14} className='shrink-0' aria-hidden />
			<span>
				{compact
					? PURCHASE_PRODUCT_TYPES[type].label
					: formatPurchaseProduct({ type, memoryGb })}
			</span>
		</span>
	);
}

export function StockMetric({
	label,
	value,
	tone = 'neutral',
	icon: Icon,
}: {
	label: React.ReactNode;
	value: React.ReactNode;
	tone?: keyof typeof STOCK_VALUE_COLORS;
	icon?: LucideIcon;
}) {
	return (
		<div
			className={'min-w-0 rounded-lg border p-2.5 ' + STOCK_VALUE_COLORS[tone]}
		>
			<dt className='flex items-start gap-1.5 text-[11px] leading-4 opacity-80'>
				{Icon && <Icon size={14} className='mt-px shrink-0' aria-hidden />}
				{label}
			</dt>
			<dd className='mt-1.5 break-words text-sm font-semibold tabular-nums'>
				{value}
			</dd>
		</div>
	);
}

export function StockPriceMetrics({
	listPrice,
	purchasePrice,
	sellingPrice,
	totalCost,
}: {
	listPrice: React.ReactNode;
	purchasePrice: string;
	sellingPrice: string;
	totalCost: string;
}) {
	return (
		<dl className='grid min-w-0 grid-cols-2 gap-2'>
			<StockMetric label='Liste alış fiyatı' value={listPrice} icon={Tag} />
			<StockMetric
				label='Ortalama gerçek alış fiyatı'
				value={purchasePrice}
				tone='cost'
				icon={ShoppingCart}
			/>
			<StockMetric
				label={
					<span className='inline-flex items-center gap-1'>
						Ortalama gerçek satış fiyatı <StockSellingPriceInfo />
					</span>
				}
				value={sellingPrice}
				tone='income'
				icon={TrendingUp}
			/>
			<StockMetric
				label='Toplam stok maliyeti'
				value={totalCost}
				tone='cost'
				icon={Banknote}
			/>
		</dl>
	);
}

export function StockQuantity({
	value,
	unit,
}: {
	value: string;
	unit: string;
}) {
	return (
		<span className='inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums'>
			<Package size={15} className='shrink-0 stock-text-quantity' aria-hidden />
			{value} {unit}
		</span>
	);
}
