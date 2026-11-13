import { useId, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import type { PurchaseDraft } from '../../helpers/purchaseDraft.helper';
import {
	PURCHASE_QUANTITY_UNIT_LABELS,
	type PurchaseQuantityUnit,
} from '../../constants/purchaseProducts.constant';
import {
	STOCK_BUTTON,
	STOCK_CONTROL,
	STOCK_NUMBER_CONTROL,
	STOCK_STEPPER,
} from '../../constants/stockStyles.constant';
import { PurchaseUnitPriceInput } from './PurchaseUnitPriceInput';
import { NumberInputWithSteppers } from '../NumberInputWithSteppers';

export type TradeRow = PurchaseDraft['lines'][number];
export function TradeRows({
	lines,
	disabled,
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
	rowFields,
	rowActions,
}: {
	lines: TradeRow[];
	disabled: boolean;
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
	unitOptions?: (row: TradeRow) => PurchaseQuantityUnit[];
	rowNote?: (row: TradeRow) => ReactNode;
	rowFields?: (row: TradeRow, index: number, showHeaders: boolean) => ReactNode;
	rowActions?: (row: TradeRow, index: number) => ReactNode;
}) {
	const uniqueId = useId();
	const id = kind === 'purchase' ? 'order-row' : uniqueId;
	const fields = (line: TradeRow) =>
		JSON.stringify([
			line.requiresMemorySize,
			line.quantityUnit,
			unitOptions(line),
		]);
	return (
		<div className='relative w-full min-w-0 max-w-full'>
			<div
				id={uniqueId + '-rows'}
				className='mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border'
			>
				{lines.map((line, index) => {
					const showHeaders =
						index === 0 || fields(lines[index - 1]) !== fields(line);
					return (
						<div key={line.id} className='min-w-0'>
							<div
								id={id + '-' + line.id}
								className={
									'grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-2 px-2 py-2 md:flex md:flex-wrap ' +
									(index % 2 === 0
										? 'bg-button-bg/30 '
										: 'bg-button-hover-bg/10 ')
								}
							>
								<div className='col-span-2 min-w-0 md:col-span-1 md:w-64'>
									<label
										htmlFor={'type-' + line.id}
										className={
											showHeaders
												? 'mb-1 block text-[11px] font-medium'
												: 'sr-only'
										}
									>
										Ürün
									</label>
									{productInput(line, index)}
								</div>
								{rowFields?.(line, index, showHeaders)}
								<label className='block min-w-0 text-[11px] font-medium'>
									<span className={showHeaders ? '' : 'sr-only'}>Miktar</span>
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
										className={
											(showHeaders ? 'mt-1 ' : '') + STOCK_NUMBER_CONTROL
										}
										stepperClassName={STOCK_STEPPER}
									/>
								</label>
								{unitOptions(line).length > 1 && (
									<label
										className='block min-w-0 text-[11px] font-medium'
										htmlFor={'unit-' + line.id}
									>
										<span className={showHeaders ? '' : 'sr-only'}>Birim</span>
										<select
											id={'unit-' + line.id}
											aria-label={index + 1 + '. satır miktar birimi'}
											className={
												(showHeaders ? 'mt-1 ' : '') +
												'block ' +
												STOCK_CONTROL +
												' w-16 pe-5!'
											}
											disabled={disabled}
											value={line.quantityUnit}
											onChange={(e) =>
												onUpdate(line.id, {
													quantityUnit: e.target.value as PurchaseQuantityUnit,
												})
											}
										>
											{unitOptions(line).map((unit) => (
												<option key={unit} value={unit}>
													{PURCHASE_QUANTITY_UNIT_LABELS[unit]}
												</option>
											))}
										</select>
									</label>
								)}
								<div className='col-span-2 min-w-0 md:col-span-1'>
									<span
										className={
											showHeaders
												? 'mb-1 block text-[11px] font-medium'
												: 'sr-only'
										}
									>
										Birim fiyat (TL/
										{PURCHASE_QUANTITY_UNIT_LABELS[line.quantityUnit]})
									</span>
									<PurchaseUnitPriceInput
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
									<span className={showHeaders ? '' : 'sr-only'}>
										Satır tutarı (TL)
									</span>
									<NumberInputWithSteppers
										id={'total-price-' + line.id}
										ariaLabel={index + 1 + '. satır toplam fiyatı'}
										value={
											line.totalPriceOverride === ''
												? ''
												: (totals[index] ?? '')
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
								<div
									className={
										'col-span-2 flex flex-wrap items-center justify-end gap-1 md:col-span-1 lg:ml-6 ' +
										(showHeaders ? 'md:pt-5' : '')
									}
								>
									<button
										type='button'
										className={STOCK_BUTTON}
										aria-label={index + 1 + '. satırı sil'}
										disabled={disabled || lines.length === 1}
										onClick={() => onRemove(line.id)}
									>
										<Trash2 size={16} aria-hidden />
									</button>
									{rowActions?.(line, index)}
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
					);
				})}
			</div>
		</div>
	);
}
