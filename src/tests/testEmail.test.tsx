import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { TestEmailSection } from '../app/component/admin/TestEmailSection';
import { jsonResponse } from './helpers';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root, client: QueryClient, container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	client?.clear();
	container?.remove();
	vi.unstubAllGlobals();
});
function mount() {
	client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	container = document.createElement('div');
	document.body.append(container);
	root = createRoot(container);
	act(() =>
		root.render(
			<QueryClientProvider client={client}>
				<TestEmailSection />
			</QueryClientProvider>,
		),
	);
}
function type(value: string) {
	act(() => {
		const input = container.querySelector('input')!;
		Object.getOwnPropertyDescriptor(
			HTMLInputElement.prototype,
			'value',
		)!.set!.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}
async function submit() {
	await act(async () => {
		container
			.querySelector('form')!
			.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
		await new Promise((resolve) => setTimeout(resolve, 20));
	});
}
it('validates the recipient before sending and shows the accepted address', async () => {
	const fetchMock = vi.fn(async () => jsonResponse(200, { success: true }));
	vi.stubGlobal('fetch', fetchMock);
	mount();
	type('invalid');
	await submit();
	expect(fetchMock).not.toHaveBeenCalled();
	expect(container.querySelector('[role=alert]')?.textContent).toContain(
		'Geçerli bir e-posta',
	);
	type(' Recipient@Example.test ');
	await submit();
	expect(fetchMock).toHaveBeenCalledOnce();
	const [url, options] = fetchMock.mock.calls[0] as unknown as [
		string,
		RequestInit,
	];
	expect(new URL(url).pathname).toBe('/admins/test-email');
	expect(JSON.parse(options.body as string)).toEqual({
		to: 'recipient@example.test',
	});
	expect(container.querySelector('[role=status]')?.textContent).toContain(
		'recipient@example.test',
	);
});
it('shows the API error without claiming delivery succeeded', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () =>
			jsonResponse(502, { message: 'Test e-postası gönderilemedi.' }),
		),
	);
	mount();
	type('recipient@example.test');
	await submit();
	expect(container.querySelector('[role=alert]')?.textContent).toContain(
		'Test e-postası gönderilemedi',
	);
	expect(container.querySelector('[role=status]')).toBeNull();
	expect(
		container.querySelector('button[type=submit]')?.hasAttribute('disabled'),
	).toBe(false);
});
