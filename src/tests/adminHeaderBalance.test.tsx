import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { AdminHeaderBalance } from '../app/component/admin/AdminHeaderBalance';

const finance = vi.hoisted(() => ({
	useFinance: vi.fn(() => ({ data: { balance: 1250 }, isError: false })),
}));
vi.mock('../app/hooks/api/endpoints/useFinance', () => finance);
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root, container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	localStorage.removeItem('admin.header.balance.hidden.v1');
	vi.clearAllMocks();
});
function mount() {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() => root.render(<AdminHeaderBalance />));
}
it('shows the unfiltered balance and stores the hide preference', () => {
	mount();
	expect(finance.useFinance).toHaveBeenLastCalledWith({}, 1, 1, true);
	expect(container.textContent).toContain('1.250,00');
	act(() =>
		container
			.querySelector<HTMLButtonElement>('[aria-label="Bakiyeyi gizle"]')!
			.click(),
	);
	expect(container.textContent).not.toContain('1.250,00');
	expect(localStorage.getItem('admin.header.balance.hidden.v1')).toBe('true');
	expect(finance.useFinance).toHaveBeenLastCalledWith({}, 1, 1, false);
});
it('restores a hidden balance and saves the show preference', () => {
	localStorage.setItem('admin.header.balance.hidden.v1', 'true');
	mount();
	expect(container.textContent).not.toContain('1.250,00');
	act(() =>
		container
			.querySelector<HTMLButtonElement>('[aria-label="Bakiyeyi göster"]')!
			.click(),
	);
	expect(container.textContent).toContain('1.250,00');
	expect(localStorage.getItem('admin.header.balance.hidden.v1')).toBe('false');
});
