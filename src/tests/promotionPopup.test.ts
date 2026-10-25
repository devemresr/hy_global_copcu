import { act, createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { PromotionPopup } from '../app/component/PromotionPopup';
import { PAGE_PATHS } from '../app/constants/pagePaths.constant';
import { DEFAULT_PROMOTION } from '../app/constants/promotion.constant';

vi.mock('../app/assets/icons/icons8-whatsapp.svg?react', () => ({ default: () => null }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('shows once under StrictMode, supports Escape, and remembers subsequent visits', () => {
	// jsdom does not implement the browser's native dialog methods.
	Object.defineProperties(HTMLDialogElement.prototype, {
		showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } },
		close: { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } },
	});
	const container = document.createElement('div');
	document.body.appendChild(container);
	let root = createRoot(container);
	let props = { preview: false, promotion: { ...DEFAULT_PROMOTION } };
	const render = () => act(() => root.render(createElement(StrictMode, null,
		createElement(MemoryRouter, null, createElement(PromotionPopup, props)))));
	const remount = () => {
		act(() => root.unmount());
		root = createRoot(container);
		render();
	};

	try {
		localStorage.setItem('hy-global-promotion-seen', 'true');
		render();
		expect(container.querySelector('dialog')).toBeNull();

		localStorage.removeItem('hy-global-promotion-seen');
		remount();
		const dialog = container.querySelector('dialog')!;
		expect(dialog.hasAttribute('open')).toBe(true);
		expect(dialog.querySelector('img')?.getAttribute('src')).toContain('pricing.jpeg');
		expect(dialog.querySelector(`a[href="${PAGE_PATHS.PRICING}"]`)).not.toBeNull();
		expect(dialog.querySelector('a[href^="https://wa.me/"]')).not.toBeNull();
		expect(localStorage.getItem('hy-global-promotion-seen')).toBe('true');
		expect(document.body.style.overflow).toBe('hidden');

		act(() => dialog.dispatchEvent(new Event('cancel', { cancelable: true })));
		expect(container.querySelector('dialog')).toBeNull();
		expect(document.body.style.overflow).toBe('');
		remount();
		expect(container.querySelector('dialog')).toBeNull();

		localStorage.removeItem('hy-global-promotion-seen');
		props = { preview: true, promotion: { ...DEFAULT_PROMOTION, brandLabel: 'Yeni marka', title: 'Özel kampanya' } };
		remount();
		expect(container.querySelector('dialog[open]')).not.toBeNull();
		expect(container.querySelector('h2')?.textContent).toBe('Özel kampanya');
		expect(container.querySelector('dialog span')?.textContent).toBe('Yeni marka');
		expect(localStorage.getItem('hy-global-promotion-seen')).toBeNull();
		remount();
		expect(container.querySelector('dialog[open]')).not.toBeNull();

		props = { preview: false, promotion: { ...DEFAULT_PROMOTION, showEveryVisit: true } };
		remount();
		expect(container.querySelector('dialog[open]')).not.toBeNull();
		act(() => container.querySelector('button')!.click());
		expect(container.querySelector('dialog')).toBeNull();
		remount();
		expect(container.querySelector('dialog[open]')).not.toBeNull();
	} finally {
		act(() => root.unmount());
		container.remove();
		localStorage.clear();
	}
});
