import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LogEventsSection } from '../app/component/admin/LogEventsSection';

const query = vi.hoisted(() =>
	vi.fn(() => ({
		data: { events: [], total: 0, totalPages: 1 },
		status: 'success',
		isPlaceholderData: false,
	})),
);
vi.mock('../app/hooks/api/endpoints/useLogEvents', () => ({
	useGetLogEvents: query,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.clearAllMocks();
});
describe('log model search', () => {
	it('appears only for product logs and never leaves a hidden model filter on other event types', () => {
		container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		act(() => root.render(<LogEventsSection />));
		const click = (name: string) =>
			act(() =>
				[...container.querySelectorAll('button')]
					.find((button) => button.textContent === name)!
					.click(),
			);
		expect(container.querySelector('input[type=search]')).toBeNull();
		click('Ürünler');
		const input =
			container.querySelector<HTMLInputElement>('input[type=search]')!;
		expect(container.textContent).toContain('Yalnızca ürün kayıtları');
		act(() => {
			Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				'value',
			)!.set!.call(input, 'ABC123');
			input.dispatchEvent(new Event('input', { bubbles: true }));
		});
		act(() =>
			input
				.closest('form')!
				.dispatchEvent(
					new Event('submit', { bubbles: true, cancelable: true }),
				),
		);
		expect((query.mock.calls.at(-1) as unknown[])[3]).toBe('ABC123');
		click('Stok işlemleri');
		expect(container.querySelector('input[type=search]')).toBeNull();
		expect((query.mock.calls.at(-1) as unknown[])[3]).toBe('');
		click('Stok işlemleri');
		expect(
			container.querySelector<HTMLInputElement>('input[type=search]')?.value,
		).toBe('');
	});
});
