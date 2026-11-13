import {
	STOCK_NUMBER_CONTROL,
	STOCK_STEPPER,
} from '../../constants/stockStyles.constant';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';
import { formatPurchaseMoney } from '../../constants/purchaseReports.constant';
import {
	PURCHASE_QUANTITY_UNIT_LABELS,
	type PurchaseQuantityUnit,
} from '../../constants/purchaseProducts.constant';

export function PurchaseUnitPriceInput({
	originalPrice,
	value,
	onChange,
	disabled,
	rowNumber,
	quantityUnit = 'piece',
	kind = 'purchase',
}: {
	kind?: 'purchase' | 'sale';
	originalPrice: number | undefined;
	value: number | '' | null;
	onChange: (value: number | '' | null) => void;
	disabled: boolean;
	rowNumber: number;
	quantityUnit?: PurchaseQuantityUnit;
}) {
	const listPrice = originalPrice;
	const current = value === null ? (originalPrice ?? '') : value;
	return (
		<div className='w-fit min-w-0 space-y-1 text-left'>
			<NumberInputWithSteppers
				id={`unit-price-${rowNumber}`}
				ariaLabel={`${rowNumber}. satır birim fiyat (TL/${PURCHASE_QUANTITY_UNIT_LABELS[quantityUnit]})`}
				describedBy={
					kind === 'purchase' && listPrice === undefined
						? `unit-price-note-${rowNumber}`
						: undefined
				}
				value={current}
				decimalPlaces={6}
				disableWheel
				disabled={disabled}
				onChange={(change) =>
					onChange(typeof change === 'function' ? change(current) : change)
				}
				steppers={[
					{ amount: 10, label: '+10' },
					{ amount: 100, label: '+100' },
				]}
				className={STOCK_NUMBER_CONTROL}
				stepperClassName={STOCK_STEPPER}
			/>
			{kind === 'purchase' && listPrice === undefined && (
				<p
					id={`unit-price-note-${rowNumber}`}
					className='text-[11px] text-text/70'
				>
					* alış fiyatı bulunamadığından fark hesaplanamıyor.
				</p>
			)}
			{kind === 'purchase' && listPrice !== undefined && (
				<p className='text-[11px] text-text/70'>
					Alış fiyatı: {formatPurchaseMoney(listPrice)}
				</p>
			)}
			{kind === 'purchase' && listPrice !== undefined && value !== null && (
				<button
					type='button'
					disabled={disabled}
					onClick={() => onChange(null)}
					className='text-[11px] text-text/70 underline'
				>
					Alış fiyatına dön
				</button>
			)}
		</div>
	);
}
