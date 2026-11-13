import { chooseBayiOption, openBayiMenu } from './bayiMenu.helpers';
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
function addBayi() {
	openBayiMenu('Bayi seçin');
	act(() =>
		[...document.querySelectorAll<HTMLButtonElement>('[role=menuitem]')]
			.find((option) => option.textContent === 'Bayi ekle')!
			.click(),
	);
}
describe('bayi picker', () => {
	it('retains trimming but rejects invalid long phone numbers before requesting a save', async () => {
		const fetchMock = mockFetch({
			[BAYI_ROUTES.LIST]: () => jsonResponse(200, { bayiler: [] }),
		});
		await mount();
		addBayi();
		const phone = document.querySelector<HTMLInputElement>('input[type=tel]')!;
		act(() => {
			change(
				document.querySelector<HTMLInputElement>(
					'input[autocomplete=organization]',
				)!,
				'Test bayi',
			);
			change(phone, '12345678901234567890');
		});
		expect(phone.value).toHaveLength(17);
		await act(async () =>
			document
				.querySelector('dialog form')!
				.dispatchEvent(
					new Event('submit', { bubbles: true, cancelable: true }),
				),
		);
		expect(document.querySelector('[role=alert]')?.textContent).toContain(
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
		openBayiMenu('Bayi seçin');
		expect(
			[...document.querySelectorAll('[role=menuitemradio]')].map(
				(option) => option.textContent,
			),
		).toEqual(['Adana', 'Bolu', 'Çankaya', 'Zonguldak']);
		expect(
			[...document.querySelectorAll('[role=menuitem]')].at(-1)!.textContent,
		).toBe('Bayi ekle');
		expect(
			[...document.querySelectorAll('[role=menuitemradio]')].some(
				(option) => option.textContent === 'Tüm bayiler',
			),
		).toBe(false);
		expect(
			document.querySelectorAll('button[title="Bayiyi düzenle"]'),
		).toHaveLength(4);
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
		const trigger = openBayiMenu('Bayi seçin');
		expect(document.querySelector('[role=menuitemradio]')!.textContent).toBe(
			existing.name,
		);
		expect(document.querySelector('[role=menu]')!.textContent).not.toContain(
			existing.phone,
		);
		addBayi();
		const name = document.querySelector<HTMLInputElement>(
			'dialog input[autocomplete=organization]',
		)!;
		const phone = document.querySelector<HTMLInputElement>(
			'dialog input[type=tel]',
		)!;
		act(() => change(name, 'Yeni bayi'));
		await act(async () =>
			document
				.querySelector('dialog form')!
				.dispatchEvent(
					new Event('submit', { bubbles: true, cancelable: true }),
				),
		);
		expect(document.querySelector('[role=alert]')?.textContent).toContain(
			'Telefon',
		);
		expect(
			fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST'),
		).toHaveLength(0);
		act(() => change(phone, '0555 abc123-45 67'));
		expect(phone.value).toBe('05551234567');
		await act(async () =>
			document
				.querySelector('dialog form')!
				.dispatchEvent(
					new Event('submit', { bubbles: true, cancelable: true }),
				),
		);
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 25));
		});
		expect(document.querySelector('dialog')).toBeNull();
		expect(trigger.textContent).toBe(existing.name);
		expect(container.textContent).not.toContain(`Telefon: ${existing.phone}`);
		expect(document.querySelector('[role=status]')?.textContent).toContain(
			'Bu telefon Örnek Bayi',
		);
		expect(document.querySelector('[role=status]')?.textContent).toContain(
			'Seçilen bayi: Örnek Bayi',
		);
	});
});

it('edits an unselected bayi from its pencil without replacing the selected bayi', async () => {
	const second = {
		...existing,
		_id: '000000000000000000000022',
		name: 'İkinci bayi',
		phone: '+905551234568',
	};
	const fetchMock = mockFetch({
		[BAYI_ROUTES.LIST]: () =>
			jsonResponse(200, { bayiler: [existing, second] }),
		[BAYI_ROUTES.UPDATE(second._id)]: (init) => {
			Object.assign(second, JSON.parse(init.body as string));
			return jsonResponse(200, { bayi: second });
		},
	});
	await mount();
	chooseBayiOption('Bayi seçin', existing.name);
	const trigger = openBayiMenu('Bayi seçin');
	act(() =>
		document
			.querySelector<HTMLButtonElement>(
				'[aria-label="İkinci bayi bayisini düzenle"]',
			)!
			.click(),
	);
	expect(document.querySelector('dialog')!.textContent).toContain(
		'Bayiyi düzenle',
	);
	act(() =>
		change(
			document.querySelector<HTMLInputElement>(
				'dialog input[autocomplete=organization]',
			)!,
			'Yeni isim',
		),
	);
	await act(async () =>
		document
			.querySelector('dialog form')!
			.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
	);
	expect(
		fetchMock.mock.calls.some(
			([url, init]) =>
				new URL(url).pathname === BAYI_ROUTES.UPDATE(second._id) &&
				init?.method === 'PATCH',
		),
	).toBe(true);
	expect(trigger.textContent).toBe(existing.name);
	openBayiMenu('Bayi seçin');
	expect(
		[...document.querySelectorAll('[role=menuitemradio]')].some(
			(option) => option.textContent === 'Yeni isim',
		),
	).toBe(true);
	expect(document.querySelector('[role=menu]')!.textContent).not.toContain(
		'Başka bayiden sat',
	);
});
