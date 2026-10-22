import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSiteStatus } from '../app/hooks/api/endpoints/useSiteStatus';
import { MemoryRouter } from 'react-router-dom';
import { MaintenanceGate } from '../app/component/MaintenanceGate';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const status = {
	version: 1,
	maintenance: { enabled: false, from: null, until: null, message: null },
	notice: { enabled: false, from: null, until: null, message: null, type: 'info', pages: [], dismissible: true },
};

beforeEach(() => {
	vi.useFakeTimers();
	focusManager.setFocused(true);
	client = new QueryClient();
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	client.clear();
	focusManager.setFocused(undefined);
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

async function advance(ms: number) {
	await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

async function mount() {
	function Harness() { useSiteStatus(); return null; }
	await act(async () => {
		root.render(createElement(QueryClientProvider, { client }, createElement(Harness)));
	});
	await advance(1);
}

describe('site status polling', () => {
	it('keeps inventory mounted during an outage poll and recovers without a request loop', async () => {
		let resolvePoll: (response: Response) => void = () => {};
		const fetcher = vi.fn()
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockImplementationOnce(() => new Promise<Response>((resolve) => { resolvePoll = resolve; }))
			.mockImplementation(() => Promise.resolve(Response.json(status)));
		vi.stubGlobal('fetch', fetcher);
		let mounts = 0;
		function Inventory() {
			useSiteStatus();
			useEffect(() => { mounts++; }, []);
			return createElement('p', null, 'Inventory fallback');
		}
		await act(async () => {
			root.render(createElement(QueryClientProvider, { client },
				createElement(MemoryRouter, null,
					createElement(MaintenanceGate, { children: createElement(Inventory) }))));
		});
		await advance(10);
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(mounts).toBe(1);
		await advance(30_000);
		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(container.textContent).toBe('Inventory fallback');
		await act(async () => { resolvePoll(Response.json(status)); });
		await advance(10);
		expect(mounts).toBe(1);
		expect(fetcher).toHaveBeenCalledTimes(2);
		await advance(30_000);
		expect(fetcher).toHaveBeenCalledTimes(3);
	});

	it('backs off to 30s, 60s, then 120s and resets after recovery', async () => {
		const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
		vi.stubGlobal('fetch', fetcher);
		await mount();
		expect(fetcher).toHaveBeenCalledTimes(1);
		await advance(29_000);
		expect(fetcher).toHaveBeenCalledTimes(1);
		await advance(1_000);
		expect(fetcher).toHaveBeenCalledTimes(2);
		await advance(59_000);
		expect(fetcher).toHaveBeenCalledTimes(2);
		await advance(1_000);
		expect(fetcher).toHaveBeenCalledTimes(3);
		await advance(119_000);
		expect(fetcher).toHaveBeenCalledTimes(3);
		fetcher.mockImplementation(() => Promise.resolve(Response.json(status)));
		await advance(1_000);
		expect(fetcher).toHaveBeenCalledTimes(4);
		await advance(30_000);
		expect(fetcher).toHaveBeenCalledTimes(5);
	});

	it('does not poll in hidden tabs or bypass outage backoff on focus', async () => {
		const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
		vi.stubGlobal('fetch', fetcher);
		await mount();
		act(() => focusManager.setFocused(false));
		await advance(120_000);
		expect(fetcher).toHaveBeenCalledTimes(1);
		await act(async () => focusManager.setFocused(true));
		expect(fetcher).toHaveBeenCalledTimes(1);
		await advance(30_000);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
});
