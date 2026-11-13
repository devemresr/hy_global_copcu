import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { TradeRows, type TradeRow } from '../app/component/admin/TradeRows';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
});

it.each(['purchase', 'sale'] as const)(
	'shares %s field headers until the adjacent row uses different controls or units',
	(kind) => {
		const base: TradeRow = {
			id: 0,
			type: 'EMMC',
			memoryGb: 8,
			requiresMemorySize: true,
			quantityUnit: 'piece',
			quantity: 1,
			unitPriceOverride: 10,
			totalPriceOverride: null,
		};
		const lines: TradeRow[] = [
			base,
			{ ...base, id: 1, type: 'EMCP' },
			{
				...base,
				id: 2,
				type: 'IPHONE',
				memoryGb: null,
				requiresMemorySize: false,
				quantityUnit: 'kg',
			},
			{
				...base,
				id: 3,
				type: 'TABLET',
				memoryGb: null,
				requiresMemorySize: false,
				quantityUnit: 'kg',
			},
			{
				...base,
				id: 4,
				type: 'TABLET',
				memoryGb: null,
				requiresMemorySize: false,
			},
		];
		container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		const render = () =>
			act(() =>
				root.render(
					<TradeRows
						kind={kind}
						lines={lines}
						disabled={false}
						productInput={(row) => (
							<select id={'type-' + row.id} aria-label={row.id + ' product'}>
								<option>{row.type}</option>
							</select>
						)}
						onUpdate={vi.fn()}
						onRemove={vi.fn()}
						onAdd={vi.fn()}
						canAdd
						totals={lines.map(() => 10)}
						effectivePrice={() => 10}
					/>,
				),
			);
		render();
		const hiddenLabels = () =>
			lines.map((row) =>
				container
					.querySelector(`label[for="type-${row.id}"]`)!
					.classList.contains('sr-only'),
			);
		expect(hiddenLabels()).toEqual([false, true, false, true, false]);
		expect(
			container.querySelectorAll('input[aria-label$="satır miktar"]'),
		).toHaveLength(5);
		lines[1] = { ...lines[2], id: 1 };
		render();
		expect(hiddenLabels()).toEqual([false, false, true, true, false]);
	},
);
