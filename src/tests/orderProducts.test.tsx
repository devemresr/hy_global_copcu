import { afterEach, describe, expect, it } from 'vitest';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
	OrderProductSelect,
	type OrderProductChoice,
} from '../app/component/admin/OrderProductSelect';
import { NumberInputWithSteppers } from '../app/component/NumberInputWithSteppers';
import { orderLineSchema } from '../app/schemas/order.schema';
import {
	formatOrderProduct,
	formatOrderUnitTotals,
	sumOrderUnits,
} from '../app/helpers/orderProduct.helper';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
});
describe('order products and units', () => {
	it('orders memory products by numeric size with eMMC first at each size', () => {
		container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		act(() =>
			root!.render(
				<OrderProductSelect
					value={{ type: 'EMCP', memoryGb: 8, requiresMemorySize: true }}
					onChange={() => {}}
					disabled={false}
					rowNumber={1}
					memorySizes={[128, 8, 32]}
				/>,
			),
		);
		expect(
			[...container.querySelector('select')!.options].map(
				(option) => option.value,
			),
		).toEqual([
			'EMMC:8',
			'EMCP:8',
			'EMMC:32',
			'EMCP:32',
			'EMMC:128',
			'EMCP:128',
			'IPHONE',
			'TABLET',
		]);
	});
	it.each([false, true])(
		'respects disableWheel=%s while retaining stepper controls',
		(disableWheel) => {
			function Controlled() {
				const [value, setValue] = useState<number | ''>(10);
				return (
					<NumberInputWithSteppers
						value={value}
						onChange={setValue}
						disableWheel={disableWheel}
						steppers={[
							{ amount: 1, label: '+1' },
							{ amount: 5, label: '+5' },
						]}
					/>
				);
			}
			container = document.createElement('div');
			document.body.append(container);
			root = createRoot(container);
			act(() => root!.render(<Controlled />));
			const input = container.querySelector('input')!;
			const wheel = new WheelEvent('wheel', {
				deltaY: -100,
				bubbles: true,
				cancelable: true,
			});
			act(() => input.dispatchEvent(wheel));
			expect(input.value).toBe(disableWheel ? '10' : '20');
			expect(wheel.defaultPrevented).toBe(!disableWheel);
			act(() => container.querySelector('button')!.click());
			expect(input.value).toBe(disableWheel ? '11' : '21');
		},
	);
	it('combines capacity and type, and offers iPhone and tablet without capacity', () => {
		function Controlled() {
			const [value, setValue] = useState<OrderProductChoice>({
				type: 'EMCP',
				memoryGb: 8,
				requiresMemorySize: true,
			});
			return (
				<OrderProductSelect
					rowNumber={1}
					value={value}
					onChange={setValue}
					disabled={false}
				/>
			);
		}
		container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		act(() => root!.render(<Controlled />));
		const select = container.querySelector('select')!;
		expect([...select.options].map((option) => option.textContent)).toContain(
			'eMCP – 8 GB',
		);
		expect([...select.options].map((option) => option.textContent)).toContain(
			'eMMC – 1 TB',
		);
		expect(
			[...select.options].filter((option) => option.value.startsWith('IPHONE')),
		).toHaveLength(1);
		expect(
			[...select.options].find((option) => option.value === 'IPHONE')
				?.textContent,
		).toBe('iPhone');
		act(() => {
			select.value = 'IPHONE';
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(select.value).toBe('IPHONE');
	});
	it('requires memory only for memory products, and permits fractions only for weight', () => {
		const base = {
			type: 'IPHONE',
			quantity: 1.25,
			memoryGb: null,
			unitPriceOverride: 20,
		};
		expect(
			orderLineSchema.safeParse({ ...base, quantityUnit: 'kg' }).success,
		).toBe(true);
		expect(
			orderLineSchema.safeParse({ ...base, quantityUnit: 'piece' }).success,
		).toBe(false);
		expect(
			orderLineSchema.safeParse({ ...base, type: 'EMMC', quantityUnit: 'kg' })
				.success,
		).toBe(false);
		expect(
			orderLineSchema.safeParse({ ...base, memoryGb: 64, quantityUnit: 'kg' })
				.success,
		).toBe(false);
		expect(
			orderLineSchema.safeParse({
				...base,
				quantity: 0.0001,
				quantityUnit: 'g',
			}).success,
		).toBe(false);
	});
	it('accepts comma decimals and preserves a decimal separator while typing', () => {
		function Controlled() {
			const [value, setValue] = useState<number | ''>(1);
			return (
				<NumberInputWithSteppers
					value={value}
					onChange={setValue}
					decimalPlaces={3}
					steppers={[
						{ amount: 0.1, label: '+0,1' },
						{ amount: 1, label: '+1' },
					]}
				/>
			);
		}
		container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		act(() => root!.render(<Controlled />));
		const input = container.querySelector('input')!;
		for (const value of ['1,', '1,2', '1,25'])
			act(() => {
				Object.getOwnPropertyDescriptor(
					HTMLInputElement.prototype,
					'value',
				)!.set!.call(input, value);
				input.dispatchEvent(new Event('input', { bubbles: true }));
			});
		expect(input.value).toBe('1,25');
		act(() => container.querySelector('button')!.click());
		expect(input.value).toBe('1,35');
	});
	it('keeps piece, kg, and gram totals separate and hides legacy phone memory', () => {
		const unitTotals = sumOrderUnits([
			{ quantity: 2 },
			{ quantity: 1.25, quantityUnit: 'kg' },
			{ quantity: 250.5, quantityUnit: 'g' },
		]);
		expect(unitTotals).toEqual({ piece: 2, kg: 1.25, g: 250.5 });
		expect(formatOrderUnitTotals({ quantity: 2, unitTotals })).toBe(
			'2 adet · 1,25 kg · 250,5 g',
		);
		expect(formatOrderProduct({ type: 'IPHONE', memoryGb: 64 })).toBe('iPhone');
	});
});
