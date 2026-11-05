import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OrderChartTable } from '../app/component/admin/OrderChartTable';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
});
function mount(count: number) {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() =>
		root!.render(
			<OrderChartTable
				title='Values'
				headers={['Order', 'Total']}
				rows={Array.from({ length: count }, (_, index) => [
					`Order ${index + 1}`,
					index + 1,
				])}
			/>,
		),
	);
}

describe('chart data pagination', () => {
	it('shows every record across pages and changes the page size', () => {
		mount(25);
		expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
		act(() =>
			[...container.querySelectorAll('button')]
				.find((button) => button.textContent === 'Sonraki')!
				.click(),
		);
		expect(container.querySelector('tbody td')?.textContent).toBe('Order 11');
		act(() => {
			const select = container.querySelector('select')!;
			select.value = '50';
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.querySelectorAll('tbody tr')).toHaveLength(25);
		expect(container.querySelectorAll('button')).toHaveLength(0);
	});
	it('omits navigation buttons for one page', () => {
		mount(10);
		expect(container.querySelectorAll('button')).toHaveLength(0);
		expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
	});
});
