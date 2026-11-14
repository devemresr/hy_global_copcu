import { openBayiMenu } from './bayiMenu.helpers';
import { afterEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BalancePage from '../app/Balance';
import AnalysisPage from '../app/Analysis';
import { jsonResponse } from './helpers';

vi.mock('sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
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
let root: Root, client: QueryClient, container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	client?.clear();
	container?.remove();
	vi.unstubAllGlobals();
});
it('records a non-stock expense using a custom subtype and links to analysis', async () => {
	const categories = [
		{ _id: 'system:other', group: 'other', name: 'Diğer' },
		{ _id: 'system:investment', group: 'investment', name: 'Yatırım' },
		{ _id: 'system:purchase', group: 'purchase', name: 'Ürün alımı' },
		{ _id: 'system:sale', group: 'sale', name: 'Ürün satışı' },
	];
	const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
		const { pathname } = new URL(url);
		if (pathname.startsWith('/finance/categories/')) {
			const input = JSON.parse(init.body as string);
			const category = categories.find(
				(row) => row._id === decodeURIComponent(pathname.split('/').at(-1)!),
			)!;
			Object.assign(category, { name: input.name });
			return jsonResponse(200, { category });
		}
		if (pathname === '/finance/categories') {
			const input = JSON.parse(init.body as string);
			const category = {
				_id: input.requestId,
				group: input.group,
				name: input.name,
			};
			categories.push(category);
			return jsonResponse(201, { category });
		}
		if (pathname === '/finance/entries')
			return jsonResponse(201, { entry: {} });
		if (pathname !== '/finance')
			throw new Error(`Unexpected request: ${pathname}`);
		return jsonResponse(200, {
			categories,
			entries: [],
			count: 0,
			totalPages: 1,
			balance: 1000,
			expenses: 0,
			income: 1000,
			net: 1000,
			openingBalance: 0,
			closingBalance: 1000,
		});
	});
	vi.stubGlobal('fetch', fetchMock);
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () =>
		root.render(
			<QueryClientProvider client={client}>
				<MemoryRouter>
					<BalancePage />
				</MemoryRouter>
			</QueryClientProvider>,
		),
	);
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 30));
	});
	const type = (node: HTMLInputElement, value: string) =>
		act(() => {
			Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				'value',
			)!.set!.call(node, value);
			node.dispatchEvent(new Event('input', { bubbles: true }));
		});
	expect(container.querySelector('#order-filter-bayi')).toBeNull();
	expect(container.textContent).toContain('Genel bakiye');
	const manualOptions = container.querySelector<HTMLSelectElement>(
		'[aria-label="Bakiye kayıt türü"]',
	)!;
	expect([...manualOptions.options].map((row) => row.textContent)).toEqual([
		'Gider · Diğer',
		'Gelir · Yatırım',
		'+ Tür ekle',
	]);
	expect(container.textContent).not.toContain('Diğer için yeni alt tür');
	act(() => {
		manualOptions.value = '__add_category__';
		manualOptions.dispatchEvent(new Event('change', { bubbles: true }));
	});
	const categoryForm = document.querySelector('dialog form')!;
	type(categoryForm.querySelector('input')!, 'Nakliye');
	await act(async () =>
		categoryForm.dispatchEvent(
			new Event('submit', { bubbles: true, cancelable: true }),
		),
	);
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 30));
	});
	const forms = container.querySelectorAll('form');
	type(container.querySelector<HTMLInputElement>('#finance-amount')!, '125.50');
	await act(async () =>
		forms[0].dispatchEvent(
			new Event('submit', { bubbles: true, cancelable: true }),
		),
	);
	const call = fetchMock.mock.calls.find(
		([url]) => new URL(url).pathname === '/finance/entries',
	)!;
	const input = JSON.parse(call[1]!.body as string);
	expect(input.amount).toBe(125.5);
	expect(
		categories.find((category) => category._id === input.categoryId)?.name,
	).toBe('Nakliye');
	expect(
		fetchMock.mock.calls.every(([url]) =>
			new URL(url).pathname.startsWith('/finance'),
		),
	).toBe(true);
	act(() =>
		container
			.querySelector<HTMLButtonElement>('[aria-label="Seçili türü düzenle"]')!
			.click(),
	);
	const editor = document.querySelector('dialog form')!;
	expect(editor.querySelector<HTMLInputElement>('input')!.value).toBe(
		'Nakliye',
	);
	type(editor.querySelector('input')!, 'Taşıma');
	await act(async () =>
		editor.dispatchEvent(
			new Event('submit', { bubbles: true, cancelable: true }),
		),
	);
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 30));
	});
	expect(
		[...manualOptions.options].filter(
			(option) => option.textContent === 'Gider · Taşıma',
		),
	).toHaveLength(1);
	expect(
		fetchMock.mock.calls.some(
			([url, init]) =>
				new URL(url).pathname.startsWith('/finance/categories/') &&
				init?.method === 'PUT',
		),
	).toBe(true);
});

it('adds an investor from the income dropdown and submits its identifier with the investment', async () => {
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
	const investors: { _id: string; name: string }[] = [];
	const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
		const { pathname } = new URL(url);
		if (pathname === '/finance/investors') {
			if (init.method === 'POST') {
				const input = JSON.parse(init.body as string);
				const investor = { _id: input.requestId, name: input.name };
				investors.push(investor);
				return jsonResponse(201, { investor, existing: false });
			}
			return jsonResponse(200, { investors });
		}
		if (pathname === '/finance/entries')
			return jsonResponse(201, { entry: {} });
		return jsonResponse(200, {
			categories: [
				{
					_id: 'system:investment',
					group: 'investment',
					name: 'Sermaye girişi',
				},
			],
			entries: [],
			count: 0,
			totalPages: 1,
			balance: 0,
			income: 0,
			expenses: 0,
			net: 0,
			openingBalance: 0,
			closingBalance: 0,
		});
	});
	vi.stubGlobal('fetch', fetchMock);
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () =>
		root.render(
			<QueryClientProvider client={client}>
				<MemoryRouter>
					<BalancePage />
				</MemoryRouter>
			</QueryClientProvider>,
		),
	);
	const settle = () =>
		act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 30));
		});
	await settle();
	act(() => {
		const select = container.querySelector<HTMLSelectElement>(
			'[aria-label="Bakiye kayıt türü"]',
		)!;
		select.value = 'system:investment';
		select.dispatchEvent(new Event('change', { bubbles: true }));
	});
	await settle();
	const select = openBayiMenu('Yatırımcı seçin');
	act(() =>
		[...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
			.find((button) => button.textContent?.trim() === 'Yatırımcı ekle')!
			.click(),
	);
	const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
	expect(dialog.closest('fieldset')).toBeNull();
	expect(document.body.style.overflow).toBe('hidden');
	const type = (node: HTMLInputElement, value: string) =>
		act(() => {
			Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				'value',
			)!.set!.call(node, value);
			node.dispatchEvent(new Event('input', { bubbles: true }));
		});
	type(dialog.querySelector('input')!, 'İnci Yılmaz');
	type(dialog.querySelector('input[type=tel]')!, '05551234567');
	await act(async () =>
		dialog
			.querySelector('form')!
			.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
	);
	await settle();
	expect(document.querySelector('dialog')).toBeNull();
	expect(select.textContent).toContain(investors[0].name);
	expect(document.body.style.overflow).not.toBe('hidden');
	type(container.querySelector('#finance-amount')!, '500');
	await act(async () =>
		container
			.querySelector('form')!
			.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
	);
	const call = fetchMock.mock.calls.find(
		([url]) => new URL(url).pathname === '/finance/entries',
	)!;
	expect(JSON.parse(call[1]!.body as string)).toMatchObject({
		categoryId: 'system:investment',
		investorId: investors[0]._id,
		amount: 500,
	});
});

it('shows full-day net totals across pages and running balances in both layouts, hiding them when income is filtered', async () => {
	const fetchMock = vi.fn(async (url: string) => {
		const incomeOnly = new URL(url).searchParams.get('direction') === 'income';
		return jsonResponse(200, {
			categories: [],
			count: 3,
			totalPages: 2,
			balance: 120,
			income: 50,
			expenses: 30,
			net: 20,
			openingBalance: 100,
			closingBalance: 120,
			showRunningBalance: !incomeOnly,
			daily: [
				{
					date: '2026-11-02',
					count: 3,
					income: 50,
					expenses: incomeOnly ? 0 : 30,
					net: incomeOnly ? 50 : 20,
				},
			],
			entries: [
				{
					id: 'movement',
					group: incomeOnly ? 'sale' : 'other',
					subtype: 'Test movement',
					source: 'manual',
					amount: incomeOnly ? 50 : 10,
					date: '2026-11-02',
					description: '',
					editable: false,
					direction: incomeOnly ? 'income' : 'expense',
					...(!incomeOnly ? { balanceBefore: 130, balanceAfter: 120 } : {}),
				},
			],
		});
	});
	vi.stubGlobal('fetch', fetchMock);
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () =>
		root.render(
			<QueryClientProvider client={client}>
				<MemoryRouter initialEntries={['?preset=balance']}>
					<AnalysisPage />
				</MemoryRouter>
			</QueryClientProvider>,
		),
	);
	const settle = () =>
		act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 30));
		});
	await settle();
	expect(container.textContent).toContain('3 hareket · Günün toplamı');
	expect(container.textContent).toContain('Günün net hareketi:');
	expect(container.textContent).toContain('İşlem öncesi');
	expect(container.textContent).toContain('130,00');
	const grouping = [
		...container.querySelectorAll<HTMLInputElement>('input[type=checkbox]'),
	].find((input) =>
		input.parentElement?.textContent?.includes('Günlere göre grupla'),
	)!;
	act(() => grouping.click());
	expect(container.textContent).not.toContain('Günün net hareketi:');
	expect(container.textContent).toContain('İşlem sonrası');
	act(() => grouping.click());
	const direction = container.querySelector<HTMLSelectElement>(
		'[aria-label="Bakiye ana tür filtresi"]',
	)!;
	act(() => {
		direction.value = 'income';
		direction.dispatchEvent(new Event('change', { bubbles: true }));
	});
	await settle();
	expect(container.textContent).toContain('Filtrelenen gün toplamı');
	expect(container.textContent).toContain('işlem sonrası bakiye gösterilmez');
	expect(container.textContent).not.toContain('İşlem öncesi');
	expect(container.textContent).not.toContain('Bakiye:');
	const daily = [...container.querySelectorAll('summary')].find((row) =>
		row.textContent?.includes('Günün net hareketi:'),
	)!;
	expect(daily.textContent).toContain('Gelir');
	expect(daily.textContent).not.toContain('Gider');
	act(() => {
		direction.value = 'expense';
		direction.dispatchEvent(new Event('change', { bubbles: true }));
	});
	await settle();
	const expenseDay = [...container.querySelectorAll('summary')].find((row) =>
		row.textContent?.includes('Günün net hareketi:'),
	)!;
	expect(expenseDay.textContent).toContain('Gider');
	expect(expenseDay.textContent).not.toContain('Gelir');
	expect(
		[
			...container.querySelectorAll<HTMLOptionElement>(
				'[aria-label="1. koşul ürünü"] option',
			),
		].map((option) => option.value),
	).toEqual(['bayi', 'operation']);
});
