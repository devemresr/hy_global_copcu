import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BayiPicker } from '../app/component/admin/BayiPicker';
import { BAYI_ROUTES } from '../app/constants/routes.constant';
import { jsonResponse, mockFetch } from './helpers';

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
let client: QueryClient;
let container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	client?.clear();
	container?.remove();
	vi.unstubAllGlobals();
});
const existing = {
	_id: '000000000000000000000021',
	name: 'Örnek Bayi',
	phone: '+905551234567',
};
function Controlled() {
	const [value, onChange] = useState('');
	return <BayiPicker value={value} onChange={onChange} disabled={false} />;
}
async function mount() {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () =>
		root!.render(
			<QueryClientProvider client={client}>
				<Controlled />
			</QueryClientProvider>,
		),
	);
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 25));
	});
}
function change(input: HTMLInputElement, value: string) {
	Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		'value',
	)!.set!.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
}
describe('bayi picker', () => {
	it('retains trimming but rejects invalid long phone numbers before requesting a save', async () => {
		const fetchMock = mockFetch({
			[BAYI_ROUTES.LIST]: () => jsonResponse(200, { bayiler: [] }),
		});
		await mount();
		const select = container.querySelector('select')!;
		act(() => {
			select.value = '__add_bayi__';
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		const phone = container.querySelector<HTMLInputElement>('input[type=tel]')!;
		act(() => {
			change(
				container.querySelector<HTMLInputElement>(
					'input[autocomplete=organization]',
				)!,
				'Test bayi',
			);
			change(phone, '12345678901234567890');
		});
		expect(phone.value).toHaveLength(17);
		await act(async () =>
			container
				.querySelector('dialog form')!
				.dispatchEvent(
					new Event('submit', { bubbles: true, cancelable: true }),
				),
		);
		expect(container.querySelector('[role=alert]')?.textContent).toContain(
			'Geçerli bir telefon',
		);
		expect(
			fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
		).toBe(false);
	});
	it('sorts database names alphabetically in Turkish and keeps the add option last', async () => {
		const bayiler = ['Zonguldak', 'Çankaya', 'Adana', 'Bolu'].map(
			(name, index) => ({
				...existing,
				_id: String(index + 1).padStart(24, '0'),
				name,
			}),
		);
		mockFetch({ [BAYI_ROUTES.LIST]: () => jsonResponse(200, { bayiler }) });
		await mount();
		const select = container.querySelector<HTMLSelectElement>(
			'select[aria-label="Bayi seçin"]',
		)!;
		expect(
			[...select.options]
				.filter((option) => /^[a-f\d]{24}$/i.test(option.value))
				.map((option) => option.textContent),
		).toEqual(['Adana', 'Bolu', 'Çankaya', 'Zonguldak']);
		expect(select.options[select.options.length - 1].textContent).toBe(
			'+ Bayi ekle',
		);
		expect(select.options[0].hidden).toBe(true);
	});
	it('shows only names in options, requires a phone, and auto-selects a matching existing entry', async () => {
		const fetchMock = mockFetch({
			[BAYI_ROUTES.LIST]: (init) =>
				init.method === 'POST'
					? jsonResponse(409, {
							message: 'Bu telefon Örnek Bayi bayisinde kayıtlı.',
							details: {
								selectedBayiId: existing._id,
								matches: [{ bayi: existing, fields: ['phone'] }],
							},
						})
					: jsonResponse(200, { bayiler: [existing] }),
		});
		await mount();
		const select = container.querySelector<HTMLSelectElement>(
			'select[aria-label="Bayi seçin"]',
		)!;
		expect(
			[...select.options].find((option) => option.value === existing._id)
				?.textContent,
		).toBe('Örnek Bayi');
		act(() => {
			select.value = '__add_bayi__';
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		const name = container.querySelector<HTMLInputElement>(
			'dialog input[autocomplete=organization]',
		)!;
		const phone = container.querySelector<HTMLInputElement>(
			'dialog input[type=tel]',
		)!;
		act(() => change(name, 'Yeni bayi'));
		await act(async () =>
			container
				.querySelector('dialog form')!
				.dispatchEvent(
					new Event('submit', { bubbles: true, cancelable: true }),
				),
		);
		expect(container.querySelector('[role=alert]')?.textContent).toContain(
			'Telefon',
		);
		expect(
			fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST'),
		).toHaveLength(0);
		act(() => change(phone, '0555 abc123-45 67'));
		expect(phone.value).toBe('05551234567');
		await act(async () =>
			container
				.querySelector('dialog form')!
				.dispatchEvent(
					new Event('submit', { bubbles: true, cancelable: true }),
				),
		);
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 25));
		});
		expect(container.querySelector('dialog')).toBeNull();
		expect(select.value).toBe(existing._id);
		expect(container.textContent).not.toContain(`Telefon: ${existing.phone}`);
		expect(container.querySelector('[role=status]')?.textContent).toContain(
			'Bu telefon Örnek Bayi',
		);
		expect(container.querySelector('[role=status]')?.textContent).toContain(
			'Seçilen bayi: Örnek Bayi',
		);
	});
});
