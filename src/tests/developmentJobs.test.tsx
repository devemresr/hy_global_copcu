import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ReportSchedulesSection } from '../app/component/admin/ReportSchedulesSection';
import { InventorySnapshotSection } from '../app/component/admin/InventorySnapshotSection';
const mocks = vi.hoisted(() => ({ api: vi.fn(), mode: 'development' }));
vi.mock('../app/hooks/api/core/api-client', () => ({ apiFetch: mocks.api }));
vi.mock('../app/config/env', () => ({
	default: {
		get VITE_ENV() {
			return mocks.mode;
		},
	},
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperties(HTMLDialogElement.prototype, {
	showModal: {
		configurable: true,
		value: function (this: HTMLDialogElement) {
			this.open = true;
		},
	},
	close: {
		configurable: true,
		value: function (this: HTMLDialogElement) {
			this.open = false;
		},
	},
});
const task = {
	_id: 'task-1',
	name: 'Umami haftalık',
	source: 'umami',
	analysisUrl: '',
	includeData: true,
	enabled: false,
	includePdf: true,
	frequency: 'weekly',
	time: '09:00',
	weekday: 1,
	monthDay: 1,
	relativePeriod: 'lastWeek',
	recipients: [],
	nextRunAt: '2026-11-16T06:00:00.000Z',
};
const schedule = {
	intervalMinutes: 60,
	nextRunAt: '2026-11-15T09:00:00.000Z',
	lastExportedAt: null,
	lastItemCount: null,
	lastError: null,
};
let root: Root, client: QueryClient, container: HTMLDivElement;
beforeEach(() => {
	mocks.mode = 'development';
	mocks.api.mockReset().mockImplementation(async (path: string) => {
		if (path === '/admins/report-schedules')
			return { schedules: [task], umamiConfigured: true };
		if (path.endsWith('/preview'))
			return {
				subject: 'Umami haftalık',
				html: '<table><tr><td>Ziyaretçi: 42</td></tr></table>',
				attachments: ['report.pdf', 'umami.json'],
			};
		if (path.endsWith('/send-now'))
			return { success: true, pdfAttached: true, dataAttached: true };
		if (path.endsWith('/refresh-now'))
			return {
				schedule: {
					...schedule,
					lastItemCount: 7,
					lastExportedAt: '2026-11-15T08:00:00.000Z',
				},
			};
		return { schedule };
	});
});
afterEach(() => {
	act(() => root?.unmount());
	client?.clear();
	container?.remove();
	vi.restoreAllMocks();
});
async function mount(kind: 'reports' | 'snapshot' | 'both') {
	client = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	await act(async () => {
		root.render(
			<QueryClientProvider client={client}>
				<MemoryRouter>
					{kind !== 'snapshot' && <ReportSchedulesSection />}
					{kind !== 'reports' && <InventorySnapshotSection />}
				</MemoryRouter>
			</QueryClientProvider>,
		);
		await new Promise((resolve) => setTimeout(resolve, 30));
	});
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 30));
	});
}
function button(label: string) {
	return [...container.querySelectorAll<HTMLButtonElement>('button')].find(
		(button) => button.textContent === label,
	)!;
}
async function click(label: string) {
	await act(async () => {
		button(label).click();
		await new Promise((resolve) => setTimeout(resolve, 30));
	});
}
it('previews an Umami email in a sandbox before explicitly sending it', async () => {
	await mount('reports');
	await click('Raporu önizle');
	expect(mocks.api).toHaveBeenCalledWith(
		'/admins/report-schedules/task-1/preview',
		{ method: 'POST' },
	);
	const frame = container.querySelector('iframe')!;
	expect(frame.getAttribute('srcdoc')).toContain('Ziyaretçi: 42');
	expect(frame.getAttribute('sandbox')).toBe('');
	expect(
		mocks.api.mock.calls.some(([path]) => path.endsWith('/send-now')),
	).toBe(false);
	await click('E-posta gönder');
	expect(mocks.api).toHaveBeenCalledWith(
		'/admins/report-schedules/task-1/send-now',
		{ method: 'POST' },
	);
});
it('refreshes a snapshot separately from saving its interval and links to the public copy', async () => {
	await mount('snapshot');
	await click('Şimdi yenile');
	expect(mocks.api).toHaveBeenCalledWith(
		'/admins/inventory-snapshot/refresh-now',
		{ method: 'POST' },
	);
	expect(container.textContent).toContain('7 ürün');
	expect(
		mocks.api.mock.calls.some(([, options]) => options?.method === 'PUT'),
	).toBe(false);
	const link = [...container.querySelectorAll<HTMLAnchorElement>('a')].find(
		(link) => link.textContent?.includes('Yedek listeyi görüntüle'),
	)!;
	expect(link.getAttribute('href')).toBe('/items-snapshot.json');
	expect(link.target).toBe('_blank');
});
it('hides manual preview, send, snapshot refresh and snapshot-view controls in production', async () => {
	mocks.mode = 'production';
	await mount('both');
	expect(button('Raporu önizle')).toBeUndefined();
	expect(button('Şimdi gönder')).toBeUndefined();
	expect(button('Şimdi yenile')).toBeUndefined();
	expect(container.textContent).not.toContain('Yedek listeyi görüntüle');
});
