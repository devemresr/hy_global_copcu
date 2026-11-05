import {
	STOCK_NUMBER_CONTROL,
	STOCK_STEPPER,
} from '../../constants/stockStyles.constant';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';
import { formatOrderMoney } from '../../constants/orderReports.constant';
import {
	ORDER_QUANTITY_UNIT_LABELS,
	type OrderQuantityUnit,
} from '../../constants/orderProducts.constant';

export function OrderUnitPriceInput({
	originalPrice,
	value,
	onChange,
	disabled,
	rowNumber,
	quantityUnit = 'piece',
}: {
	originalPrice: number | undefined;
	value: number | '' | null;
	onChange: (value: number | '' | null) => void;
	disabled: boolean;
	rowNumber: number;
	quantityUnit?: OrderQuantityUnit;
}) {
	const listPrice = originalPrice;
	const current = value === null ? (originalPrice ?? '') : value;
	return (
		<div className='w-fit min-w-0 space-y-1 text-left'>
			<NumberInputWithSteppers
				id={`unit-price-${rowNumber}`}
				ariaLabel={`${rowNumber}. satır birim fiyat (TL/${ORDER_QUANTITY_UNIT_LABELS[quantityUnit]})`}
				describedBy={
					listPrice === undefined ? `unit-price-note-${rowNumber}` : undefined
				}
				value={current}
				decimalPlaces={2}
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
			{listPrice === undefined && (
				<p
					id={`unit-price-note-${rowNumber}`}
					className='text-[11px] text-text/70'
				>
					* alış fiyatı bulunamadığından fark hesaplanamıyor.
				</p>
			)}
			{listPrice !== undefined && (
				<p className='text-[11px] text-text/70'>
					Alış fiyatı: {formatOrderMoney(listPrice)}
				</p>
			)}
			{listPrice !== undefined && value !== null && (
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
