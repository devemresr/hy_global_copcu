import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MaintenanceGate } from '../app/component/MaintenanceGate';
import { SITE_STATUS_QUERY_KEY, useSiteStatus } from '../app/hooks/api/endpoints/useSiteStatus';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let container: HTMLDivElement;
let client: QueryClient;

afterEach(() => {
	if (root) act(() => root!.unmount());
	root = undefined;
	container?.remove();
	client?.clear();
	onlineManager.setOnline(true);
	vi.unstubAllGlobals();
});

async function mount(children: ReactNode = createElement('p', null, 'Inventory fallback')) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => {
		root!.render(createElement(QueryClientProvider, { client },
			createElement(MemoryRouter, null,
				createElement(MaintenanceGate, { children }))));
	});
}

describe('maintenance gate during an API outage', () => {
	it('does not restart failed checks when a child subscribes to status', async () => {
		client = new QueryClient();
		let calls = 0;
		const fetcher = vi.fn(() => {
			// Cap the reproducer so a regression cannot flood requests forever.
			if (++calls > 5) return new Promise<Response>(() => {});
			return Promise.reject(new TypeError('Failed to fetch'));
		});
		vi.stubGlobal('fetch', fetcher);
		function Inventory() { useSiteStatus(); return createElement('p', null, 'Inventory fallback'); }
		await mount(createElement(Inventory));
		await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)); });
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(container.textContent).toContain('Inventory fallback');
	});

	it('renders a loading message while the initial check is in flight', async () => {
		client = new QueryClient();
		vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
		await mount();
		expect(container.querySelector('[role="status"]')?.textContent).toBe('Sayfa yükleniyor...');
		expect(container.textContent).not.toContain('Inventory fallback');
	});

	it.each([
		['connection refused', () => Promise.reject(new TypeError('Failed to fetch'))],
		['HTTP 404', () => Promise.resolve(new Response(null, { status: 404 }))],
	])('allows fallback content after %s without immediate retries', async (_label, fetcher) => {
		client = new QueryClient({ defaultOptions: { queries: { retry: 3, retryDelay: 60_000 } } });
		vi.stubGlobal('fetch', vi.fn(fetcher));
		await mount();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
		});
		expect(client.getQueryState(SITE_STATUS_QUERY_KEY)?.status).toBe('error');
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(container.textContent).toContain('Inventory fallback');
	});

	it('allows fallback content when the browser starts offline', async () => {
		onlineManager.setOnline(false);
		client = new QueryClient();
		const fetcher = vi.fn();
		vi.stubGlobal('fetch', fetcher);
		await mount();
		expect(fetcher).not.toHaveBeenCalled();
		expect(container.textContent).toContain('Inventory fallback');
	});

	it('still blocks public content during confirmed maintenance', async () => {
		client = new QueryClient();
		vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
		client.setQueryData(SITE_STATUS_QUERY_KEY, {
			version: 0,
			maintenance: { enabled: true, from: null, until: null, message: 'Planned maintenance' },
			notice: { enabled: false, from: null, until: null, message: null, type: 'info', pages: [], dismissible: true },
		});
		await mount();
		expect(container.textContent).toContain('Planned maintenance');
		expect(container.textContent).not.toContain('Inventory fallback');
	});
});
