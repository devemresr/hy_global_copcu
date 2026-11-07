import { useId, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import type { PurchaseDraft } from '../../helpers/orderDraft.helper';
import {
	ORDER_QUANTITY_UNIT_LABELS,
	type OrderQuantityUnit,
} from '../../constants/orderProducts.constant';
import {
	STOCK_BUTTON,
	STOCK_CONTROL,
	STOCK_NUMBER_CONTROL,
	STOCK_STEPPER,
} from '../../constants/stockStyles.constant';
import {
	formatOrderProduct,
	formatOrderQuantity,
} from '../../helpers/orderProduct.helper';
import { AdminCollapseButton } from './AdminCollapseHeading';
import { OrderUnitPriceInput } from './OrderUnitPriceInput';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';

export type TradeRow = PurchaseDraft['lines'][number];
export function TradeRows({
	lines,
	disabled,
	collapsedRows,
	onToggle,
	productInput,
	onUpdate,
	onRemove,
	onAdd,
	canAdd,
	totals,
	effectivePrice,
	listPrice = () => undefined,
	kind = 'purchase',
	quantityLocked = false,
	unitOptions = () => ['piece', 'kg', 'g'],
	rowNote,
}: {
	lines: TradeRow[];
	disabled: boolean;
	collapsedRows: Set<number>;
	onToggle: (id: number) => void;
	productInput: (line: TradeRow, index: number) => ReactNode;
	onUpdate: (id: number, patch: Partial<TradeRow>) => void;
	onRemove: (id: number) => void;
	onAdd: () => void;
	canAdd: boolean;
	totals: (number | null)[];
	effectivePrice: (row: TradeRow) => number | '' | undefined;
	listPrice?: (row: TradeRow) => number | undefined;
	kind?: 'purchase' | 'sale';
	quantityLocked?: boolean;
	unitOptions?: (row: TradeRow) => OrderQuantityUnit[];
	rowNote?: (row: TradeRow) => ReactNode;
}) {
	const uniqueId = useId();
	const id = kind === 'purchase' ? 'order-row' : uniqueId;
	return (
		<div className='relative w-full min-w-0 max-w-full'>
			<div className='divide-y divide-border overflow-hidden rounded-xl border border-border'>
				{lines.map((line, index) => (
					<div key={line.id} className='min-w-0'>
						<div className='px-2 pt-2 md:hidden'>
							<AdminCollapseButton
								expanded={!collapsedRows.has(line.id)}
								index={index}
								aria-controls={id + '-' + line.id}
								onClick={() => onToggle(line.id)}
							>
								<span>
									{index + 1}. satır · {formatOrderProduct(line)} ·{' '}
									{formatOrderQuantity(
										Number(line.quantity) || 0,
										line.quantityUnit,
									)}
								</span>
							</AdminCollapseButton>
						</div>
						<div
							id={id + '-' + line.id}
							className={
								'grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-2 px-2 py-2 md:flex md:flex-wrap ' +
								(index % 2 === 0
									? 'bg-button-bg/30 '
									: 'bg-button-hover-bg/10 ') +
								(collapsedRows.has(line.id) ? 'hidden md:flex' : '')
							}
						>
							<div className='col-span-2 min-w-0 md:col-span-1 md:w-36'>
								<label
									htmlFor={'type-' + line.id}
									className='mb-1 block text-[11px] font-medium'
								>
									Ürün
								</label>
								{productInput(line, index)}
							</div>
							<label className='block min-w-0 text-[11px] font-medium'>
								Miktar
								<NumberInputWithSteppers
									id={'count-' + line.id}
									ariaLabel={index + 1 + '. satır miktar'}
									value={line.quantity}
									disableWheel
									decimalPlaces={line.quantityUnit === 'piece' ? 0 : 3}
									onChange={(change) =>
										onUpdate(line.id, {
											quantity:
												typeof change === 'function'
													? change(line.quantity)
													: change,
										})
									}
									disabled={disabled || quantityLocked}
									steppers={
										line.quantityUnit === 'kg'
											? [
													{ amount: 0.1, label: '+0,1' },
													{ amount: 1, label: '+1' },
												]
											: [
													{ amount: 1, label: '+1' },
													{ amount: 5, label: '+5' },
												]
									}
									className={'mt-1 ' + STOCK_NUMBER_CONTROL}
									stepperClassName={STOCK_STEPPER}
								/>
							</label>
							{!line.requiresMemorySize && (
								<label
									className='block min-w-0 text-[11px] font-medium'
									htmlFor={'unit-' + line.id}
								>
									Birim
									<select
										id={'unit-' + line.id}
										aria-label={index + 1 + '. satır miktar birimi'}
										className={'mt-1 block ' + STOCK_CONTROL + ' w-16 pe-5!'}
										disabled={disabled}
										value={line.quantityUnit}
										onChange={(e) =>
											onUpdate(line.id, {
												quantityUnit: e.target.value as OrderQuantityUnit,
											})
										}
									>
										{unitOptions(line).map((unit) => (
											<option key={unit} value={unit}>
												{ORDER_QUANTITY_UNIT_LABELS[unit]}
											</option>
										))}
									</select>
								</label>
							)}
							<div className='col-span-2 min-w-0 md:col-span-1'>
								<span className='mb-1 block text-[11px] font-medium'>
									Birim fiyat (TL/
									{ORDER_QUANTITY_UNIT_LABELS[line.quantityUnit]})
								</span>
								<OrderUnitPriceInput
									kind={kind}
									rowNumber={index + 1}
									originalPrice={listPrice(line)}
									quantityUnit={line.quantityUnit}
									value={
										line.totalPriceOverride === null
											? line.unitPriceOverride
											: (effectivePrice(line) ?? '')
									}
									disabled={disabled}
									onChange={(value) =>
										onUpdate(line.id, {
											unitPriceOverride: value,
											totalPriceOverride: null,
										})
									}
								/>
							</div>
							<label className='flex min-w-0 flex-col gap-1 text-[11px]'>
								Satır tutarı (TL)
								<NumberInputWithSteppers
									id={'total-price-' + line.id}
									ariaLabel={index + 1 + '. satır toplam fiyatı'}
									value={
										line.totalPriceOverride === '' ? '' : (totals[index] ?? '')
									}
									disableWheel
									decimalPlaces={2}
									disabled={disabled}
									onChange={(change) =>
										onUpdate(line.id, {
											totalPriceOverride:
												typeof change === 'function'
													? change(totals[index] ?? '')
													: change,
										})
									}
									className={STOCK_NUMBER_CONTROL}
									stepperClassName={STOCK_STEPPER}
								/>
							</label>
							<div className='col-span-2 flex flex-wrap items-center justify-end gap-1 md:col-span-1 md:pt-5 lg:ml-6'>
								<button
									type='button'
									className={STOCK_BUTTON}
									aria-label={index + 1 + '. satırı sil'}
									disabled={disabled || lines.length === 1}
									onClick={() => onRemove(line.id)}
								>
									<Trash2 size={16} aria-hidden />
								</button>
								{index === lines.length - 1 && (
									<button
										type='button'
										className={STOCK_BUTTON}
										disabled={disabled || !canAdd || lines.length >= 200}
										onClick={onAdd}
									>
										+ Satır ekle
									</button>
								)}
							</div>
							{rowNote && (
								<div className='col-span-2 w-full text-xs text-text/70'>
									{rowNote(line)}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
