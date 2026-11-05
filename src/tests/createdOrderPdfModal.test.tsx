import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CreatedOrderPdfModal } from '../app/component/admin/CreatedOrderPdfModal';
import type { Order } from '../app/hooks/api/endpoints/useOrders';

const { prepare, download, share } = vi.hoisted(() => ({
	prepare: vi.fn(),
	download: vi.fn(),
	share: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../app/helpers/pdf.helper', () => ({
	createPdfFile: prepare,
	downloadPdfFile: download,
}));
vi.mock('sonner', () => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperties(HTMLDialogElement.prototype, {
	showModal: {
		configurable: true,
		value: function (this: HTMLDialogElement) {
			this.setAttribute('open', '');
		},
	},
	close: {
		configurable: true,
		value: function (this: HTMLDialogElement) {
			this.removeAttribute('open');
		},
	},
});
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});
const order: Order = {
	_id: 'saved',
	name: 'Saved order',
	createdAt: '2026-11-04T12:00:00Z',
	quantity: 2,
	total: 500,
	lines: [
		{
			type: 'EMMC',
			memoryGb: 64,
			quantity: 2,
			unitPrice: 250,
			originalUnitPrice: 300,
			priceAdjustment: -50,
			total: 500,
		},
	],
};
describe('single-order PDF modal', () => {
	it('prepares the invoice on opening and shares the same file with one click', async () => {
		const file = new File(['pdf'], 'invoice.pdf', { type: 'application/pdf' });
		prepare.mockResolvedValue(file);
		vi.stubGlobal('navigator', { share, canShare: () => true });
		container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		await act(async () =>
			root!.render(<CreatedOrderPdfModal order={order} onClose={() => {}} />),
		);
		expect(prepare).toHaveBeenCalledOnce();
		expect(container.querySelectorAll('[role=switch], canvas')).toHaveLength(0);
		expect(container.textContent).not.toContain('Grafik');
		await act(async () =>
			container
				.querySelector<HTMLButtonElement>('[data-action=share-order]')!
				.click(),
		);
		expect(share).toHaveBeenCalledWith({ files: [file], title: 'Saved order' });
		expect(prepare).toHaveBeenCalledOnce();
		act(() =>
			container
				.querySelector<HTMLButtonElement>('[data-action=download-order]')!
				.click(),
		);
		expect(download).toHaveBeenCalledWith(file);
	});
});
