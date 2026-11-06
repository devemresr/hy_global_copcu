import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OrdersPage from '../app/Orders';
import {
	AUTH_ROUTES,
	ORDER_ROUTES,
	BAYI_ROUTES,
	STOCK_ROUTES,
} from '../app/constants/routes.constant';
import { fakeJwt, jsonResponse, mockFetch as baseMockFetch } from './helpers';
import { orderDraftKey } from '../app/helpers/orderDraft.helper';
import { ThemeContext } from '../app/hooks/useTheme';
import { toast } from 'sonner';
import {
	orderMonthRange,
	orderPresetRange,
} from '../app/helpers/orderPeriod.helper';

vi.mock('../app/component/InventoryDataGrid', () => ({
	InventoryDataGrid: () =>
		createElement('div', { 'data-testid': 'order-grid' }),
}));
vi.mock('../app/component/admin/CreatedOrderPdfModal', () => ({
	CreatedOrderPdfModal: ({
		order,
		onClose,
	}: {
		order: { name?: string; _id: string };
		onClose: () => void;
	}) =>
		createElement(
			'div',
			{ role: 'dialog' },
			createElement(
				'p',
				{},
				`${order.name || order._id}: PDF indirmek ister misiniz?`,
			),
			createElement('button', { onClick: onClose }, 'Daha sonra'),
		),
}));
vi.mock('sonner', () => ({
	toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
const TEST_BAYI = {
	_id: '000000000000000000000021',
	name: 'Örnek Bayi',
	phone: '+905551234567',
};
function mockFetch(routes: Parameters<typeof baseMockFetch>[0]) {
	return baseMockFetch({
		[STOCK_ROUTES.WARNINGS]: () => jsonResponse(200, { warnings: [] }),
		[BAYI_ROUTES.LIST]: () => jsonResponse(200, { bayiler: [TEST_BAYI] }),
		...routes,
	});
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let container: HTMLDivElement;
let client: QueryClient;
afterEach(() => {
	localStorage.clear();
	if (root) act(() => root?.unmount());
	root = undefined;
	client?.clear();
	container?.remove();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});
async function mount(openHistory = true) {
	container = document.createElement('div');
	document.body.append(container);
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	root = createRoot(container);
	await act(async () => {
		root!.render(
			createElement(
				QueryClientProvider,
				{ client },
				createElement(
					ThemeContext.Provider,
					{ value: { theme: 'dark' } },
					createElement(MemoryRouter, {}, createElement(OrdersPage)),
				),
			),
		);
	});
	await act(async () => {
		await new Promise((r) => setTimeout(r, 25));
	});
	const details = container.querySelector<HTMLDetailsElement>(
		'details[aria-labelledby="order-history"]',
	);
	if (openHistory && details) {
		await act(async () => {
			details.open = true;
			details.dispatchEvent(new Event('toggle'));
		});
		await act(async () => {
			await new Promise((r) => setTimeout(r, 25));
		});
	}
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 25));
	});
	const bayi = container.querySelector<HTMLSelectElement>(
		'select[aria-label="Bayi seçin"]',
	);
	if (bayi)
		act(() => {
			bayi.value = TEST_BAYI._id;
			bayi.dispatchEvent(new Event('change', { bubbles: true }));
		});
}
function button(text: string) {
	const found = [...container.querySelectorAll('button')].find(
		(b) => b.textContent === text,
	);
	if (!found) throw new Error(`Missing button: ${text}`);
	return found;
}
const emptyHistory = {
	orders: [],
	summary: { count: 0, total: 0, quantity: 0 },
	daily: [],
	byType: [],
	byMemory: [],
	totalPages: 1,
	page: 1,
};
describe('orders page', () => {
	it('restores timestamped purchase drafts across remounts and clears them after reset or save', async () => {
		localStorage.setItem('accessToken', fakeJwt(900000));
		mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 } } }),
			[ORDER_ROUTES.LIST]: () =>
				jsonResponse(201, { order: { _id: 'saved', name: 'Bayi' } }),
		});
		await mount(false);
		act(() => {
			const node = container.querySelector<HTMLInputElement>('#count-0')!;
			Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				'value',
			)!.set!.call(node, '7');
			node.dispatchEvent(new Event('input', { bubbles: true }));
		});
		const key = orderDraftKey('purchase')!,
			saved = JSON.parse(localStorage.getItem(key)!);
		expect(saved.data.lines[0].quantity).toBe(7);
		act(() => root!.unmount());
		root = undefined;
		client.clear();
		container.remove();
		await mount(false);
		expect(container.querySelector<HTMLInputElement>('#count-0')!.value).toBe(
			'7',
		);
		expect(toast.info).toHaveBeenCalledWith(
			'Kaydedilmemiş alış taslağı yüklendi',
			{
				description: new Date(saved.savedAt).toLocaleString('tr-TR', {
					timeZone: 'Europe/Istanbul',
				}),
			},
		);
		act(() => button('Satırları sıfırla').click());
		expect(localStorage.getItem(key)).toBeNull();
		act(() => button('+ Satır ekle').click());
		expect(localStorage.getItem(key)).not.toBeNull();
		act(() => button('Satırları sıfırla').click());
		const qty = container.querySelector<HTMLInputElement>(
			'input[aria-label="1. satır miktar"]',
		)!;
		act(() => {
			Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				'value',
			)!.set!.call(qty, '2');
			qty.dispatchEvent(new Event('input', { bubbles: true }));
		});
		await act(async () => button('Alışı kaydet').click());
		expect(localStorage.getItem(key)).toBeNull();
	});
	it('adds unused products and excludes other rows from each product dropdown', async () => {
		mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 }, EMMC: { 8: 40 } } }),
		});
		await mount(false);
		act(() => button('+ Satır ekle').click());
		const selects = [
			...container.querySelectorAll<HTMLSelectElement>(
				'select[aria-label$="ürün ve bellek"]',
			),
		];
		expect(selects.map((node) => node.value)).toEqual(['EMCP:8', 'EMMC:8']);
		expect(
			[...selects[0].options].some((option) => option.value === 'EMMC:8'),
		).toBe(false);
		expect(
			[...selects[1].options].some((option) => option.value === 'EMCP:8'),
		).toBe(false);
	});
	it('links unit and total prices, saves exact totals, and keeps the add button on the last row', async () => {
		const fetchMock = mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 } } }),
			[ORDER_ROUTES.LIST]: () =>
				jsonResponse(201, { order: { _id: 'saved', name: 'Bayi' } }),
		});
		await mount(false);
		const enter = (id: string, value: string) =>
			act(() => {
				const node = container.querySelector<HTMLInputElement>(id)!;
				Object.getOwnPropertyDescriptor(
					HTMLInputElement.prototype,
					'value',
				)!.set!.call(node, value);
				node.dispatchEvent(new Event('input', { bubbles: true }));
			});
		enter('#count-0', '3');
		expect(
			container.querySelector<HTMLInputElement>('#total-price-0')!.value,
		).toBe('165');
		enter('#total-price-0', '100');
		expect(
			Number(
				container
					.querySelector<HTMLInputElement>('#unit-price-1')!
					.value.replace(',', '.'),
			),
		).toBeCloseTo(100 / 3, 5);
		expect(
			container.querySelector<HTMLInputElement>('#total-price-0')!.value,
		).toBe('100');
		await act(async () => button('Alışı kaydet').click());
		const save = fetchMock.mock.calls.find(
			([url, init]) =>
				new URL(url).pathname === ORDER_ROUTES.LIST && init?.method === 'POST',
		)!;
		expect(JSON.parse(save[1]!.body as string).lines[0]).toMatchObject({
			quantity: 3,
			totalPriceOverride: 100,
		});
		act(() => button('+ Satır ekle').click());
		expect(
			[...container.querySelectorAll('button')].filter(
				(node) => node.textContent === '+ Satır ekle',
			),
		).toHaveLength(1);
	});
	it('shows a persisted price risk inline without repeating an already-triggered toast', async () => {
		mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 } } }),
			[STOCK_ROUTES.WARNINGS]: () =>
				jsonResponse(200, {
					warnings: [],
					risks: [
						{
							productKey: 'EMCP:8:piece',
							message:
								'Örnek Bayi · eMCP: alış fiyatı satış fiyatından yüksek.',
							alreadyWarned: true,
						},
					],
					missingPrices: [],
				}),
		});
		await mount(false);
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 700));
		});
		expect(container.textContent).toContain('Alış fiyatında zarar riski');
		expect(container.textContent).toContain(
			'alış fiyatı satış fiyatından yüksek',
		);
		expect(toast.warning).not.toHaveBeenCalled();
		const originalWarning = [
			...container.querySelectorAll('[role="status"]'),
		].find((node) => node.textContent?.includes('Alış fiyatında zarar riski'))!;
		act(() => button('+ Satır ekle').click());
		expect(originalWarning.isConnected).toBe(true);
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 700));
		});
		expect(originalWarning.isConnected).toBe(true);
	});
	it('shows units only for weighted products and resets weight when switching to memory chips', async () => {
		mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 } } }),
		});
		await mount(false);
		const product = container.querySelector<HTMLSelectElement>('#type-0')!;
		expect(container.querySelector('#unit-0')).toBeNull();
		act(() => {
			product.value = 'IPHONE';
			product.dispatchEvent(new Event('change', { bubbles: true }));
		});
		const unit = container.querySelector<HTMLSelectElement>('#unit-0')!;
		act(() => {
			unit.value = 'kg';
			unit.dispatchEvent(new Event('change', { bubbles: true }));
		});
		const quantity = container.querySelector<HTMLInputElement>('#count-0')!;
		act(() => {
			Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				'value',
			)!.set!.call(quantity, '1.25');
			quantity.dispatchEvent(new Event('input', { bubbles: true }));
		});
		act(() => {
			product.value = 'EMCP:8';
			product.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.querySelector('#unit-0')).toBeNull();
		expect(quantity.value).toBe('1');
		expect(
			container.querySelector('[aria-live=polite]')?.textContent,
		).toContain('55,00');
	});
	it('sends the dealer name filter to the history API', async () => {
		const fetchMock = mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 } } }),
			[ORDER_ROUTES.LIST]: () => jsonResponse(200, emptyHistory),
		});
		await mount();
		const select =
			container.querySelector<HTMLSelectElement>('#order-filter-bayi')!;
		act(() => {
			select.value = TEST_BAYI.name;
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		await act(async () => button('Filtreleri uygula').click());
		expect(
			fetchMock.mock.calls.some(
				([url]) => new URL(url).searchParams.get('bayiName') === TEST_BAYI.name,
			),
		).toBe(true);
	});
	it('allows a unit price without a list price and shows the asterisk without a reset button', async () => {
		const fetchMock = mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 }, IPHONE: {} } }),
			[ORDER_ROUTES.LIST]: (init) =>
				init.method === 'POST'
					? jsonResponse(201, { order: { _id: 'saved' } })
					: jsonResponse(200, emptyHistory),
		});
		await mount(false);
		const type = container.querySelector<HTMLSelectElement>('#type-0')!;
		act(() => {
			type.value = 'IPHONE';
			type.dispatchEvent(new Event('change', { bubbles: true }));
		});
		const price = container.querySelector<HTMLInputElement>('#unit-price-1')!;
		expect(price.disabled).toBe(false);
		expect(container.textContent).toContain(
			'* alış fiyatı bulunamadığından fark hesaplanamıyor.',
		);
		expect(container.textContent).not.toContain('Alış fiyatına dön');
		act(() => price.parentElement!.querySelectorAll('button')[1].click());
		expect(container.textContent).not.toContain('Alış fiyatına dön');
		await act(async () => button('Alışı kaydet').click());
		const post = fetchMock.mock.calls.find(
			([url, init]) =>
				new URL(url).pathname === ORDER_ROUTES.CREATE &&
				init?.method === 'POST',
		);
		expect(JSON.parse(post![1]!.body as string)).toEqual({
			bayiId: TEST_BAYI._id,
			lines: [
				{
					type: 'IPHONE',
					quantity: 1,
					memoryGb: null,
					quantityUnit: 'piece',
					unitPriceOverride: 100,
				},
			],
		});
	});
	it('numbers rows, displays their quantity, and preserves values while collapsed', async () => {
		mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 } } }),
			[ORDER_ROUTES.LIST]: () => jsonResponse(200, emptyHistory),
		});
		await mount(false);
		const toggle = container.querySelector<HTMLButtonElement>(
			'button[aria-controls="order-row-0"]',
		)!;
		expect(toggle.textContent).toContain('1. satır');
		act(() => button('+5').click());
		expect(toggle.textContent).toContain('6 adet');
		act(() => toggle.click());
		expect(
			container.querySelector('#order-row-0')!.classList.contains('hidden'),
		).toBe(true);
		act(() => toggle.click());
		expect(container.querySelector<HTMLInputElement>('#count-0')!.value).toBe(
			'6',
		);
	});
	it('adds rows without a default-type selector and sends the selected bayi', async () => {
		const fetchMock = mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 }, EMMC: { 8: 40 } } }),
			[ORDER_ROUTES.LIST]: (init) =>
				init.method === 'POST'
					? jsonResponse(201, { order: { _id: 'saved', name: 'Kasım' } })
					: jsonResponse(200, emptyHistory),
		});
		await mount();
		expect(container.querySelector('#default-order-type')).toBeNull();
		act(() => button('+ Satır ekle').click());
		const rows = container.querySelectorAll<HTMLSelectElement>(
			'select[aria-label$="ürün ve bellek"]',
		);
		act(() => {
			rows[1].value = 'EMMC:8';
			rows[1].dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(rows[0].value).toBe('EMCP:8');
		expect(rows[1].value).toBe('EMMC:8');
		await act(async () => button('Alışı kaydet').click());
		await act(async () => {
			await new Promise((r) => setTimeout(r, 25));
		});
		const post = fetchMock.mock.calls.find(
			([url, init]) =>
				new URL(url).pathname === ORDER_ROUTES.CREATE &&
				init?.method === 'POST',
		);
		expect(JSON.parse(post![1]!.body as string)).toEqual({
			bayiId: TEST_BAYI._id,
			lines: [
				{ type: 'EMCP', quantity: 1, memoryGb: 8, quantityUnit: 'piece' },
				{ type: 'EMMC', quantity: 1, memoryGb: 8, quantityUnit: 'piece' },
			],
		});
		expect(container.querySelector('#order-name')).toBeNull();
		expect(container.querySelector('[role=dialog]')?.textContent).toContain(
			'PDF indirmek ister misiniz?',
		);
		expect(
			container.querySelector<HTMLSelectElement>(
				'select[aria-label$="ürün ve bellek"]',
			)!.value,
		).toBe('EMCP:8');
	});
	it('filters by month names and report presets while retaining the applied price range', async () => {
		const fetchMock = mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 } } }),
			[ORDER_ROUTES.LIST]: () => jsonResponse(200, emptyHistory),
		});
		await mount();
		const minimum = container.querySelector<HTMLInputElement>(
			'#order-filter-minTotal',
		)!;
		const maximum = container.querySelector<HTMLInputElement>(
			'#order-filter-maxTotal',
		)!;
		act(() => minimum.parentElement!.querySelector('button')!.click());
		act(() => maximum.parentElement!.querySelectorAll('button')[1].click());
		await act(async () => button('Filtreleri uygula').click());
		const year = Number(
			container.querySelector<HTMLSelectElement>('select[id$="-year"]')!.value,
		);
		const month = container.querySelector<HTMLSelectElement>(
			'select[id$="-month"]',
		)!;
		await act(async () => {
			month.value = '10';
			month.dispatchEvent(new Event('change', { bubbles: true }));
		});
		await act(async () => {
			await new Promise((r) => setTimeout(r, 25));
		});
		let url = new URL(
			fetchMock.mock.calls
				.filter(([url]) => new URL(url).pathname === ORDER_ROUTES.LIST)
				.at(-1)![0],
		);
		expect(url.searchParams.get('from')).toBe(orderMonthRange(year, 10).from);
		expect(url.searchParams.get('until')).toBe(orderMonthRange(year, 10).until);
		expect(url.searchParams.get('minTotal')).toBe('100');
		expect(url.searchParams.get('maxTotal')).toBe('1000');
		const sharedFilters = container.querySelector(
			'form[aria-label="Alış ve PDF filtreleri"]',
		)!;
		expect(
			container.querySelectorAll('form[aria-label="Alış ve PDF filtreleri"]'),
		).toHaveLength(1);
		await act(async () =>
			[...sharedFilters.querySelectorAll('button')]
				.find((el) => el.getAttribute('aria-label') === 'Dün')!
				.click(),
		);
		await act(async () => {
			await new Promise((r) => setTimeout(r, 25));
		});
		url = new URL(
			fetchMock.mock.calls
				.filter(([url]) => new URL(url).pathname === ORDER_ROUTES.LIST)
				.at(-1)![0],
		);
		expect(url.searchParams.get('from')).toBe(
			orderPresetRange('yesterday').from,
		);
		expect(url.searchParams.get('until')).toBe(
			orderPresetRange('yesterday').until,
		);
		expect(url.searchParams.get('minTotal')).toBe('100');
	});
	it('uses compact price steppers and sends their values as history filters', async () => {
		const fetchMock = mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 } } }),
			[ORDER_ROUTES.LIST]: () => jsonResponse(200, emptyHistory),
		});
		await mount();
		const minimum = container.querySelector<HTMLInputElement>(
			'#order-filter-minTotal',
		)!;
		const maximum = container.querySelector<HTMLInputElement>(
			'#order-filter-maxTotal',
		)!;
		expect(minimum.type).toBe('text');
		expect(minimum.parentElement?.className).toContain('w-full');
		act(() => minimum.parentElement!.querySelector('button')!.click());
		act(() => maximum.parentElement!.querySelectorAll('button')[1].click());
		expect(minimum.value).toBe('100');
		expect(maximum.value).toBe('1,000');
		await act(async () => button('Filtreleri uygula').click());
		await act(async () => {
			await new Promise((r) => setTimeout(r, 25));
		});
		const url = new URL(
			fetchMock.mock.calls
				.filter(([url]) => new URL(url).pathname === ORDER_ROUTES.LIST)
				.at(-1)![0],
		);
		expect(url.searchParams.get('minTotal')).toBe('100');
		expect(url.searchParams.get('maxTotal')).toBe('1000');
		await act(async () => button('Temizle').click());
		expect(minimum.value).toBe('');
		expect(maximum.value).toBe('');
	});
	it('blocks an inverted price range with schema validation and a Sonner error', async () => {
		const fetchMock = mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 } } }),
			[ORDER_ROUTES.LIST]: () => jsonResponse(200, emptyHistory),
		});
		await mount();
		const minimum = container.querySelector<HTMLInputElement>(
			'#order-filter-minTotal',
		)!;
		const maximum = container.querySelector<HTMLInputElement>(
			'#order-filter-maxTotal',
		)!;
		act(() => minimum.parentElement!.querySelectorAll('button')[1].click());
		act(() => maximum.parentElement!.querySelector('button')!.click());
		const requestCount = fetchMock.mock.calls.length;
		await act(async () => button('Filtreleri uygula').click());
		expect(fetchMock).toHaveBeenCalledTimes(requestCount);
		expect(toast.error).toHaveBeenCalledWith(
			'Filtreler uygulanamadı',
			expect.any(Object),
		);
		expect(container.querySelector('[role=alert]')?.textContent).toContain(
			'Fiyat aralığı',
		);
	});
	it('reuses quantity/storage steppers, totals every row, and blocks placeholder prices', async () => {
		mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, {
					prices: {
						EMCP: { 8: 55, 16: 100 },
						EMMC: { 8: 40 },
						IPHONE: {},
						TABLET: {},
					},
				}),
			[ORDER_ROUTES.LIST]: () => jsonResponse(200, emptyHistory),
		});
		await mount();
		expect(
			container.querySelector('[aria-live=polite]')?.textContent,
		).toContain('55,00');
		act(() => button('+1').click());
		act(() => button('+5').click());
		expect(container.querySelector<HTMLInputElement>('#count-0')?.value).toBe(
			'7',
		);
		expect(
			container.querySelector('[aria-live=polite]')?.textContent,
		).toContain('385,00');
		act(() => {
			const product = container.querySelector<HTMLSelectElement>('#type-0')!;
			product.value = 'EMCP:16';
			product.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(
			container.querySelector('[aria-live=polite]')?.textContent,
		).toContain('700,00');
		act(() => button('+ Satır ekle').click());
		expect(
			container.querySelector('[aria-live=polite]')?.textContent,
		).toContain('740,00');
		const select = container.querySelector<HTMLSelectElement>(
			'select[aria-label$="ürün ve bellek"]',
		)!;
		act(() => {
			select.value = 'IPHONE';
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.textContent).toContain('alış fiyatı bulunamadığından');
		expect(button('Alışı kaydet').disabled).toBe(true);
		act(() =>
			container
				.querySelector<HTMLButtonElement>('button[aria-label="1. satırı sil"]')!
				.click(),
		);
		expect(
			container.querySelector('[aria-live=polite]')?.textContent,
		).toContain('40,00');
		expect(button('Alışı kaydet').disabled).toBe(false);
	});
	it('does not render the order form when session verification fails', async () => {
		mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(401, { message: 'Unauthorized' }),
			[AUTH_ROUTES.REFRESH]: () => jsonResponse(401, {}),
		});
		await mount();
		expect(container.textContent).toContain('Devam etmek için giriş yapın.');
		expect(container.querySelector('table')).toBeNull();
	});
	it('saves only the three row values and refreshes order history through React Query', async () => {
		const fetchMock = mockFetch({
			[ORDER_ROUTES.PRICING]: () =>
				jsonResponse(200, { prices: { EMCP: { 8: 55 } } }),
			[ORDER_ROUTES.LIST]: (init) =>
				init.method === 'POST'
					? jsonResponse(201, { order: { _id: 'saved' } })
					: jsonResponse(200, emptyHistory),
		});
		await mount();
		await act(async () => {
			button('Alışı kaydet').click();
		});
		await act(async () => {
			await new Promise((r) => setTimeout(r, 25));
		});
		const post = fetchMock.mock.calls.find(
			([url, init]) =>
				new URL(url).pathname === ORDER_ROUTES.CREATE &&
				init?.method === 'POST',
		);
		expect(JSON.parse(post![1]!.body as string)).toEqual({
			bayiId: TEST_BAYI._id,
			lines: [
				{ type: 'EMCP', quantity: 1, memoryGb: 8, quantityUnit: 'piece' },
			],
		});
		expect(
			fetchMock.mock.calls.filter(
				([url, init]) =>
					new URL(url).pathname === ORDER_ROUTES.LIST && init?.method === 'GET',
			).length,
		).toBeGreaterThan(1);
	});
});
