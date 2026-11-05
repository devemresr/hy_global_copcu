import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { InventoryBrowser } from '../app/component/InventoryBrowser';

const focus = vi.hoisted(() => vi.fn());
vi.mock('../app/component/FuseSearchBox', async () => {
	const { forwardRef, useImperativeHandle, useRef } = await import('react');
	return {
		FuseSearchBox: forwardRef(function Search(_props, ref) {
			const input = useRef<HTMLInputElement>(null);
			useImperativeHandle(ref, () => ({
				focus: (options?: FocusOptions) => {
					focus(options);
					input.current?.focus(options);
				},
			}));
			return <input aria-label='Model ara' ref={input} />;
		}),
	};
});
vi.mock('../app/component/InventoryDataGrid', () => ({
	InventoryDataGrid: () => null,
}));
vi.mock('../app/component/paymentCalculator/ColumnFilterPanel', () => ({
	ColumnFilterPanel: () => null,
}));
vi.mock('../app/assets/icons/icons8-cancel.svg?react', () => ({
	default: () => null,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.clearAllMocks();
});
describe('inventory search autofocus', () => {
	it.each([undefined, false])(
		'respects autoFocusSearch=%s when inventory data arrives',
		(autoFocusSearch) => {
			container = document.createElement('div');
			document.body.append(container);
			root = createRoot(container);
			const render = (loaded: boolean) =>
				act(() =>
					root.render(
						<>
							<button id='admin-control'>Admin action</button>
							<InventoryBrowser
								rows={loaded ? [{ model: 'ABC123' }] : []}
								colDef={[]}
								autoFocusSearch={autoFocusSearch}
							/>
						</>,
					),
				);
			render(false);
			const control =
				container.querySelector<HTMLButtonElement>('#admin-control')!;
			control.focus();
			render(true);
			if (autoFocusSearch === false) {
				expect(focus).not.toHaveBeenCalled();
				expect(document.activeElement).toBe(control);
			} else {
				expect(focus).toHaveBeenCalledTimes(1);
				expect(document.activeElement).toBe(container.querySelector('input'));
			}
		},
	);
});
