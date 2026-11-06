import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StockManagementSection } from '../app/component/admin/StockManagementPanel';
import { BAYI_ROUTES, STOCK_ROUTES } from '../app/constants/routes.constant';
import { PAGE_PATHS } from '../app/constants/pagePaths.constant';
import { fakeJwt, jsonResponse, mockFetch } from './helpers';
import { orderDraftKey } from '../app/helpers/orderDraft.helper';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
	toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
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
let client: QueryClient;
afterEach(() => {
	localStorage.clear();
	act(() => root?.unmount());
	client?.clear();
	container?.remove();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});
const data = {
	positions: [
		{
			key: 'EMMC:64:piece',
			type: 'EMMC',
			memoryGb: 64,
			quantityUnit: 'piece',
			quantity: 40,
			averagePurchaseCost: 337.5,
			averageSellingPrice: 400,
			listPurchasePrices: [
				{ currency: 'TRY', unitPrice: 300, hasExceptions: false },
			],
		},
	],
	availableLots: [
		{
			lotId: '000000000000000000000001:0',
			bayiName: 'Store A',
			type: 'EMMC',
			memoryGb: 64,
			quantityUnit: 'piece',
			quantity: 40,
			remaining: 40,
			unitPrice: 337.5,
			createdAt: '2026-11-05T12:00:00Z',
		},
	],
	lots: [],
	lotCount: 0,
	totalPages: 1,
	page: 1,
	operations: [],
	profits: [
		{
			type: 'EMMC',
			memoryGb: 64,
			quantityUnit: 'piece',
			quantity: 40,
			revenue: 16000,
			costOfGoods: 13500,
			averagePurchaseCost: 337.5,
			averageSellingPrice: 400,
			profit: 2500,
			margin: 15.625,
		},
	],
	profitsByMemory: [
		{
			type: null,
			memoryGb: 64,
			quantityUnit: 'piece',
			quantity: 40,
			revenue: 16000,
			costOfGoods: 13500,
			averagePurchaseCost: 337.5,
			averageSellingPrice: 400,
			profit: 2500,
			margin: 15.625,
		},
	],
	movements: [],
	movementCount: 0,
	movementPages: 1,
	reportTotals: { purchaseCost: 13500, revenue: 16000, profit: 2500 },
};
async function mount() {
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	await act(async () =>
		root!.render(
			<QueryClientProvider client={client}>
				<MemoryRouter>
					<StockManagementSection />
				</MemoryRouter>
			</QueryClientProvider>,
		),
	);
}
async function openPanel() {
	await act(async () => {
		const details = container.querySelector('details')!;
		details.open = true;
		details.dispatchEvent(new Event('toggle'));
	});
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 30));
	});
}
function input(element: HTMLInputElement, value: string) {
	Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		'value',
	)!.set!.call(element, value);
	element.dispatchEvent(new Event('input', { bubbles: true }));
}
describe('stock panel', () => {
	it('reopens timestamped sale drafts and clears saved data on reset or a successful sale', async () => {
		localStorage.setItem('accessToken', fakeJwt(900000));
		mockFetch({
			[STOCK_ROUTES.LIST]: () => jsonResponse(200, data),
			[STOCK_ROUTES.SALES]: () => jsonResponse(201, { operation: {} }),
		});
		await mount();
		await openPanel();
		act(() =>
			[...container.querySelectorAll('button')]
				.find((button) => button.textContent === 'Satış')!
				.click(),
		);
		act(() =>
			[...container.querySelectorAll('[aria-label="Satış türü"] button')]
				.find((button) => button.textContent === 'Kısmi satış')!
				.dispatchEvent(new MouseEvent('click', { bubbles: true })),
		);
		act(() =>
			input(
				container.querySelector<HTMLInputElement>(
					'[aria-label="1. satış miktarı"]',
				)!,
				'5',
			),
		);
		act(() =>
			input(
				container.querySelector<HTMLInputElement>(
					'[aria-label="1. satış birim fiyatı"]',
				)!,
				'200',
			),
		);
		const key = orderDraftKey('sale')!,
			saved = JSON.parse(localStorage.getItem(key)!);
		expect(saved.data.rows[0].quantity).toBe(5);
		act(() => root!.unmount());
		root = undefined;
		client.clear();
		container.remove();
		await mount();
		await openPanel();
		expect(
			container.querySelector<HTMLInputElement>(
				'[aria-label="1. satış miktarı"]',
			)!.value,
		).toBe('5');
		expect(
			container.querySelector<HTMLInputElement>(
				'[aria-label="1. satış geliri"]',
			)!.value,
		).toBe('1000');
		expect(toast.info).toHaveBeenCalledWith(
			'Kaydedilmemiş satış taslağı yüklendi',
			{
				description: new Date(saved.savedAt).toLocaleString('tr-TR', {
					timeZone: 'Europe/Istanbul',
				}),
			},
		);
		act(() =>
			[...container.querySelectorAll('dialog button')]
				.find((button) => button.textContent === 'Satırları sıfırla')!
				.dispatchEvent(new MouseEvent('click', { bubbles: true })),
		);
		expect(localStorage.getItem(key)).toBeNull();
		act(() =>
			input(
				container.querySelector<HTMLInputElement>(
					'[aria-label="1. satış geliri"]',
				)!,
				'16000',
			),
		);
		await act(async () =>
			container
				.querySelector('dialog form')!
				.dispatchEvent(
					new Event('submit', { bubbles: true, cancelable: true }),
				),
		);
		expect(localStorage.getItem(key)).toBeNull();
	});
	it('links sale unit and total prices in both directions and uses the latest entered price', async () => {
		const fetchMock = mockFetch({
			[STOCK_ROUTES.LIST]: () => jsonResponse(200, data),
			[STOCK_ROUTES.SALES]: () => jsonResponse(201, { operation: {} }),
		});
		await mount();
		await openPanel();
		act(() =>
			[...container.querySelectorAll('button')]
				.find((button) => button.textContent === 'Satış')!
				.click(),
		);
		const form = container.querySelector('dialog form')!;
		const unit = form.querySelector<HTMLInputElement>(
			'[aria-label="1. satış birim fiyatı"]',
		)!;
		const total = form.querySelector<HTMLInputElement>(
			'[aria-label="1. satış geliri"]',
		)!;
		act(() => input(unit, '400'));
		expect(total.value).toBe('16000');
		act(() => input(total, '12000'));
		expect(unit.value).toBe('300');
		await act(async () =>
			form.dispatchEvent(
				new Event('submit', { bubbles: true, cancelable: true }),
			),
		);
		const call = fetchMock.mock.calls.find(
			([url]) => new URL(url).pathname === STOCK_ROUTES.SALES,
		)!;
		expect(JSON.parse(call[1]!.body as string).lines[0].revenue).toBe(12000);
	});
	it('shows each report preset and clears dealer filters before requesting restocks or profit', async () => {
		const purchase = {
			id: 'purchase:0',
			kind: 'purchase',
			createdAt: '2026-11-05T12:00:00Z',
			bayiName: 'Store A',
			type: 'EMMC',
			memoryGb: 64,
			quantityUnit: 'piece',
			quantity: 40,
			purchaseCost: 13500,
			revenue: null,
			profit: null,
			orderId: 'purchase',
		};
		const restock = {
			...purchase,
			id: 'restock:0',
			kind: 'complete',
			bayiName: null,
			orderId: null,
			revenue: 16000,
			profit: 2500,
		};
		const fetchMock = vi.fn(async (url: string) => {
			const { pathname, searchParams } = new URL(url);
			if (pathname === BAYI_ROUTES.LIST)
				return jsonResponse(200, {
					bayiler: [{ _id: 'bayi-a', name: 'Store A', phone: '+905551234567' }],
				});
			if (pathname !== STOCK_ROUTES.LIST)
				throw new Error(`Unexpected request: ${pathname}`);
			if (
				[...searchParams.values()].some(
					(value) => value === 'undefined' || value === 'null',
				)
			)
				return jsonResponse(400, { message: 'Unset filters must be omitted' });
			const kind = searchParams.get('movementType') ?? 'all';
			const movements =
				kind === 'purchase'
					? [purchase]
					: kind === 'restock'
						? [restock]
						: [purchase, restock];
			return jsonResponse(200, {
				...data,
				movements,
				movementCount: movements.length,
			});
		});
		vi.stubGlobal('fetch', fetchMock);
		await mount();
		await openPanel();
		const report = container.querySelector(
			'[aria-label="Stok hareketleri ve kârlılık"]',
		)!;
		const preset = (label: string) =>
			[
				...report.querySelectorAll<HTMLButtonElement>(
					'[aria-label="Stok raporu hazır filtreleri"] button',
				),
			].find((button) => button.textContent === label)!;
		async function choose(label: string) {
			await act(async () => preset(label).click());
			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 30));
			});
		}
		await choose('Bayi bazlı stok girişleri');
		expect(report.textContent).toContain(
			'eMMC – 64 GB · Alış / stok girişi · Store A',
		);
		act(() => {
			const select =
				report.querySelector<HTMLSelectElement>('#order-filter-bayi')!;
			select.value = 'Store A';
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		await act(async () =>
			report
				.querySelector('form')!
				.dispatchEvent(
					new Event('submit', { bubbles: true, cancelable: true }),
				),
		);
		await choose('Satışlar');
		expect(report.textContent).toContain(
			'eMMC – 64 GB · Stok sifirlayan satış',
		);
		expect(
			report.querySelector<HTMLSelectElement>('#order-filter-bayi')!.value,
		).toBe('');
		await choose('Gerçekleşen kâr');
		expect(
			report.querySelector('[aria-label="Kâr gruplaması"]'),
		).not.toBeNull();
		expect(report.textContent).toContain('2.500,00');
		expect(report.textContent).not.toContain(
			'Bu filtrelerle kayıtlı satış yok.',
		);
		// Applying other filters must not restore the cleared dealer draft.
		await act(async () =>
			report
				.querySelector('form')!
				.dispatchEvent(
					new Event('submit', { bubbles: true, cancelable: true }),
				),
		);
		expect(preset('Gerçekleşen kâr').getAttribute('aria-pressed')).toBe('true');
		await choose('Tüm hareketler');
		expect(report.textContent).toContain(
			'eMMC – 64 GB · Alış / stok girişi · Store A',
		);
		expect(report.textContent).toContain(
			'eMMC – 64 GB · Stok sifirlayan satış',
		);
		for (const [url] of fetchMock.mock.calls) {
			const params = new URL(url).searchParams;
			expect([...params.values()]).not.toContain('undefined');
			expect([...params.values()]).not.toContain('null');
		}
	});
	it('collapses product fields without losing entered values', async () => {
		mockFetch({ [STOCK_ROUTES.LIST]: () => jsonResponse(200, data) });
		await mount();
		await openPanel();
		act(() =>
			[...container.querySelectorAll('button')]
				.find((button) => button.textContent === 'Satış')!
				.click(),
		);
		const revenue = container.querySelector<HTMLInputElement>(
			'[aria-label="1. satış geliri"]',
		)!;
		act(() => input(revenue, '16000'));
		const toggle = container.querySelector<HTMLButtonElement>(
			'button[aria-controls="restock-row-0"]',
		)!;
		expect(
			container.querySelectorAll('button[aria-controls="restock-row-0"]'),
		).toHaveLength(1);
		const remove = container.querySelector<HTMLButtonElement>(
			'button[aria-label="1. satış ürününü sil"]',
		)!;
		expect(
			container.querySelectorAll('button[aria-label="1. satış ürününü sil"]'),
		).toHaveLength(1);
		expect(remove.querySelector('svg')).not.toBeNull();
		expect(remove.textContent).toBe('');
		act(() => toggle.click());
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		expect(container.querySelector<HTMLElement>('#restock-row-0')!.hidden).toBe(
			true,
		);
		act(() => toggle.click());
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		expect(revenue.value).toBe('16000');
	});
	it('filters by product type and sorts by numeric size, quantity and total cost', async () => {
		const positions = [
			{
				key: 'EMCP:8:piece',
				type: 'EMCP',
				memoryGb: 8,
				quantityUnit: 'piece',
				quantity: 10,
				averagePurchaseCost: 50,
				sellingPrice: 70,
			},
			{
				key: 'EMMC:128:piece',
				type: 'EMMC',
				memoryGb: 128,
				quantityUnit: 'piece',
				quantity: 1,
				averagePurchaseCost: 100,
				sellingPrice: 130,
			},
			{
				key: 'EMMC:8:piece',
				type: 'EMMC',
				memoryGb: 8,
				quantityUnit: 'piece',
				quantity: 2,
				averagePurchaseCost: 20,
				sellingPrice: 30,
			},
		];
		mockFetch({
			[STOCK_ROUTES.LIST]: () => jsonResponse(200, { ...data, positions }),
		});
		await mount();
		await openPanel();
		const stock = container.querySelector('[aria-label="Mevcut stok"]')!;
		const headings = () =>
			[...stock.querySelectorAll('details > summary h4')].map(
				(heading) => heading.textContent,
			);
		expect(headings()).toEqual(['eMMC – 8 GB', 'eMMC – 128 GB', 'eMCP – 8 GB']);
		const sort = stock.querySelector<HTMLSelectElement>(
			'[aria-label="Stok sıralaması"]',
		)!;
		act(() => {
			sort.value = 'cost-desc';
			sort.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(headings()).toEqual(['eMCP – 8 GB', 'eMMC – 128 GB', 'eMMC – 8 GB']);
		act(() =>
			[...stock.querySelectorAll('button')]
				.find((button) => button.textContent === 'eMMC')!
				.click(),
		);
		expect(headings()).toEqual(['eMMC – 128 GB', 'eMMC – 8 GB']);
		expect(
			stock.querySelector('[aria-label="Ürün türü stok toplamları"]')
				?.textContent,
		).toContain('3 adet · Toplam maliyet:');
		act(() => {
			sort.value = 'quantity-desc';
			sort.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(headings()).toEqual(['eMMC – 8 GB', 'eMMC – 128 GB']);
	});
	it.each(['complete', 'partial'])(
		'submits multiple products together for a %s restock without choosing orders',
		async (mode) => {
			const positions = [
				...data.positions,
				{
					key: 'EMCP:8:piece',
					type: 'EMCP',
					memoryGb: 8,
					quantityUnit: 'piece',
					quantity: 10,
					averagePurchaseCost: 50,
					sellingPrice: 70,
				},
			];
			const fetchMock = mockFetch({
				[STOCK_ROUTES.LIST]: () => jsonResponse(200, { ...data, positions }),
				[STOCK_ROUTES.SALES]: () => jsonResponse(201, { operation: {} }),
			});
			await mount();
			await openPanel();
			act(() =>
				[...container.querySelectorAll('button')]
					.find((button) => button.textContent === 'Satış')!
					.click(),
			);
			const form = container.querySelector('dialog form')!;
			act(() =>
				[...form.querySelectorAll('[aria-label="Satış türü"] button')]
					.find(
						(button) =>
							button.textContent ===
							(mode === 'complete' ? 'Tüm stok satışı' : 'Kısmi satış'),
					)!
					.dispatchEvent(new MouseEvent('click', { bubbles: true })),
			);
			expect(form.querySelector('[aria-label="Satış türü"] select')).toBeNull();
			expect(
				form.querySelectorAll('[aria-label="Satış türü"] [aria-pressed=true]'),
			).toHaveLength(1);
			act(() =>
				[...form.querySelectorAll('button')]
					.find((button) => button.textContent === '+ Ürün ekle')!
					.click(),
			);
			act(() => {
				input(
					form.querySelector<HTMLInputElement>(
						'[aria-label="1. satış geliri"]',
					)!,
					'16000',
				);
				input(
					form.querySelector<HTMLInputElement>(
						'[aria-label="2. satış geliri"]',
					)!,
					'700',
				);
				if (mode === 'partial') {
					input(
						form.querySelector<HTMLInputElement>(
							'[aria-label="1. satış miktarı"]',
						)!,
						'5',
					);
					input(
						form.querySelector<HTMLInputElement>(
							'[aria-label="2. satış miktarı"]',
						)!,
						'2',
					);
				}
			});
			expect(form.textContent).not.toContain('Hangi stok girişlerinden');
			await act(async () =>
				form.dispatchEvent(
					new Event('submit', { bubbles: true, cancelable: true }),
				),
			);
			const calls = fetchMock.mock.calls.filter(
				([url]) => new URL(url).pathname === STOCK_ROUTES.SALES,
			);
			expect(calls).toHaveLength(1);
			const payload = JSON.parse(calls[0][1]!.body as string);
			expect(payload.mode).toBe(mode);
			expect(payload.lines).toEqual([
				{
					type: 'EMCP',
					memoryGb: 8,
					quantityUnit: 'piece',
					quantity: mode === 'complete' ? 10 : 5,
					revenue: 16000,
				},
				{
					type: 'EMMC',
					memoryGb: 64,
					quantityUnit: 'piece',
					quantity: mode === 'complete' ? 40 : 2,
					revenue: 700,
				},
			]);
		},
	);
	it('loads when opened and reuses the purchase route for adding stock', async () => {
		const fetchMock = mockFetch({
			[STOCK_ROUTES.LIST]: () => jsonResponse(200, data),
		});
		await mount();
		expect(fetchMock).not.toHaveBeenCalled();
		await openPanel();
		expect(container.querySelector('a')?.getAttribute('href')).toBe(
			PAGE_PATHS.ORDERS,
		);
		expect(
			container.querySelector('[aria-label="Stok hareketleri ve kârlılık"]')
				?.textContent,
		).toContain('2.500,00');
		expect(
			container.querySelector('[aria-label="Mevcut stok"]')?.textContent,
		).toContain('40 adet');
	});
	it('records the full current stock and sales revenue without requiring supplier sales data', async () => {
		const fetchMock = mockFetch({
			[STOCK_ROUTES.LIST]: () => jsonResponse(200, data),
			[STOCK_ROUTES.SALES]: () => jsonResponse(201, { operation: {} }),
		});
		await mount();
		await openPanel();
		act(() =>
			[...container.querySelectorAll('button')]
				.find((button) => button.textContent === 'Satış')!
				.click(),
		);
		const form = container.querySelector('dialog form')!;
		expect(form.textContent).toContain('40 adet stoktan düşülür');
		act(() =>
			input(
				form.querySelector<HTMLInputElement>('[aria-label="1. satış geliri"]')!,
				'16000',
			),
		);
		await act(async () =>
			form.dispatchEvent(
				new Event('submit', { bubbles: true, cancelable: true }),
			),
		);
		const call = fetchMock.mock.calls.find(
			([url]) => new URL(url).pathname === STOCK_ROUTES.SALES,
		)!;
		expect(JSON.parse(call[1]!.body as string)).toMatchObject({
			mode: 'complete',
			lines: [
				{
					type: 'EMMC',
					memoryGb: 64,
					quantityUnit: 'piece',
					quantity: 40,
					revenue: 16000,
				},
			],
		});
		expect(toast.success).toHaveBeenCalledWith('Satış işlemi kaydedildi');
	});
	it('uses shared report filters and displays catalog and actual prices without a selling-price editor', async () => {
		const fetchMock = mockFetch({
			[BAYI_ROUTES.LIST]: () =>
				jsonResponse(200, {
					bayiler: [{ _id: 'bayi-a', name: 'Store A', phone: '+905551234567' }],
				}),
			[STOCK_ROUTES.LIST]: () => jsonResponse(200, data),
		});
		await mount();
		await openPanel();
		act(() => {
			const select =
				container.querySelector<HTMLSelectElement>('#order-filter-bayi')!;
			select.value = 'Store A';
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		await act(async () =>
			container
				.querySelector('#order-filter-bayi')!
				.closest('form')!
				.dispatchEvent(
					new Event('submit', { bubbles: true, cancelable: true }),
				),
		);
		expect(
			fetchMock.mock.calls.some(
				([url]) => new URL(url).searchParams.get('bayiName') === 'Store A',
			),
		).toBe(true);
		expect(container.querySelector('#stock-selling-product')).toBeNull();
		const inventory = container.querySelector('[aria-label="Mevcut stok"]')!;
		expect(inventory.textContent).toMatch(/Liste alış fiyatı: .*300,00/);
		expect(inventory.textContent).toMatch(
			/Ortalama gerçek alış fiyatı: .*337,50/,
		);
		expect(inventory.textContent).toMatch(
			/Ortalama gerçek satış fiyatı: .*400,00/,
		);
	});
	it('switches unified report presets and groups profit by size across memory types', async () => {
		const fetchMock = mockFetch({
			[STOCK_ROUTES.LIST]: () => jsonResponse(200, data),
		});
		await mount();
		await openPanel();
		await act(async () =>
			[
				...container.querySelectorAll(
					'[aria-label="Stok raporu hazır filtreleri"] button',
				),
			]
				.find((button) => button.textContent === 'Gerçekleşen kâr')!
				.dispatchEvent(new MouseEvent('click', { bubbles: true })),
		);
		expect(
			fetchMock.mock.calls.some(
				([url]) => new URL(url).searchParams.get('movementType') === 'restock',
			),
		).toBe(true);
		expect(
			container.querySelector('[aria-label="Stok hareketleri ve kârlılık"]')
				?.textContent,
		).toContain('eMMC – 64 GB');
		act(() => {
			const select = container.querySelector<HTMLSelectElement>(
				'[aria-label="Kâr gruplaması"]',
			)!;
			select.value = 'memory';
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(container.textContent).toContain('64 GB · Tüm bellek tipleri');
	});
});
