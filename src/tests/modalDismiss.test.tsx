import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useModalDismiss } from '../app/hooks/useModalDismiss';
import { ModalCloseButton } from '../app/component/ModalCloseButton';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.restoreAllMocks();
});
function mount(
	options: { disabled?: boolean; closeOnOutsideClick?: boolean } = {},
) {
	const close = vi.fn();
	function Dialog() {
		const dismiss = useModalDismiss(close, options);
		return (
			<dialog {...dismiss}>
				<div>Contents</div>
				<ModalCloseButton onClick={close} />
			</dialog>
		);
	}
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<Dialog />));
	const dialog = container.querySelector('dialog')!;
	vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
		left: 100,
		top: 100,
		right: 300,
		bottom: 300,
		width: 200,
		height: 200,
		x: 100,
		y: 100,
		toJSON: () => ({}),
	});
	return { dialog, close };
}
function event(dialog: HTMLDialogElement, type: string, x: number, y: number) {
	act(() =>
		dialog.dispatchEvent(
			new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }),
		),
	);
}
describe('modal dismissal', () => {
	it('closes on a true outside click, while clicks on padding stay inside', () => {
		const { dialog, close } = mount();
		event(dialog, 'pointerdown', 120, 120);
		event(dialog, 'click', 120, 120);
		expect(close).not.toHaveBeenCalled();
		event(dialog, 'pointerdown', 50, 50);
		event(dialog, 'click', 50, 50);
		expect(close).toHaveBeenCalledTimes(1);
	});
	it('does not close when a pointer starts inside and is released outside', () => {
		const { dialog, close } = mount();
		event(dialog, 'pointerdown', 120, 120);
		event(dialog, 'click', 50, 50);
		expect(close).not.toHaveBeenCalled();
	});
	it.each([{ disabled: true }, { closeOnOutsideClick: false }])(
		'supports dismissal options %j',
		(options) => {
			const { dialog, close } = mount(options);
			event(dialog, 'pointerdown', 50, 50);
			event(dialog, 'click', 50, 50);
			expect(close).not.toHaveBeenCalled();
		},
	);
	it('uses an accessible icon close button with no visible close text', () => {
		const { dialog, close } = mount();
		const button = dialog.querySelector<HTMLButtonElement>(
			'button[aria-label="Kapat"]',
		)!;
		expect(button.textContent).toBe('');
		act(() => button.click());
		expect(close).toHaveBeenCalledTimes(1);
	});
});
