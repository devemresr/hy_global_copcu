import { act, createElement, StrictMode, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '../app/component/Header';
import { ThemeContext, type Theme } from '../app/hooks/useTheme';

const animation = vi.hoisted(() => ({
	ready: true, totalFrames: 180,
	listeners: new Map<string, Set<() => void>>(),
	goToAndStop: vi.fn(), playSegments: vi.fn(), setSpeed: vi.fn(),
	addEventListener: vi.fn(), removeEventListener: vi.fn(),
}));
vi.mock('lottie-react', async () => {
	const { useImperativeHandle } = await import('react');
	return { Lottie: function Lottie({ src, lottieRef }: { src: { testTheme?: boolean }; lottieRef: import('react').Ref<unknown> }) {
		// Like lottie-react, publish a new handle as the animation becomes ready.
		useImperativeHandle(lottieRef, () => ({ animationItem: src.testTheme && animation.ready ? animation : null }));
		return null;
	} };
});
vi.mock('../app/assets/icons/DarkLightInteractiveToggle.json', () => ({ default: { testTheme: true } }));
vi.mock('../app/assets/icons/icons8-whatsapp.svg?react', () => ({ default: () => null }));
vi.mock('../app/assets/photos/photos', () => ({ LOGO: { url: 'logo.svg' } }));
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: '/' }) }));

let root: Root;
let container: HTMLDivElement;
let frames: Map<number, FrameRequestCallback>;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function Harness({ initialTheme = 'dark' }: { initialTheme?: Theme }) {
	const [theme, setTheme] = useState<Theme>(initialTheme);
	return createElement(ThemeContext.Provider, { value: { theme } }, createElement(Header, {
		isOpen: false, onToggle: () => {}, setTheme, sidebarAnimationRef: { current: null }, sidebarAnimationSrc: {},
	}));
}
function render(theme: Theme = 'dark') { act(() => root.render(createElement(StrictMode, null, createElement(Harness, { initialTheme: theme })))); }
function toggle() { act(() => container.querySelectorAll('button')[1].click()); }
function emit(event: string) { act(() => { for (const callback of [...animation.listeners.get(event) ?? []]) callback(); }); }
beforeEach(() => {
	animation.ready = true; animation.totalFrames = 180; animation.listeners.clear();
	animation.addEventListener.mockImplementation((event: string, callback: () => void) => {
		if (!animation.listeners.has(event)) animation.listeners.set(event, new Set());
		animation.listeners.get(event)!.add(callback);
	});
	animation.removeEventListener.mockImplementation((event: string, callback: () => void) => animation.listeners.get(event)?.delete(callback));
	frames = new Map(); let nextFrame = 0;
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
	vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
	container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe('header animation lifecycle', () => {
	it.each(['light', 'dark'] as const)('initializes %s once per mount and plays both toggle directions without resetting the animation', (theme) => {
		render(theme);
		expect(animation.goToAndStop).toHaveBeenLastCalledWith(theme === 'dark' ? 90 : 0, true);
		const initializations = animation.goToAndStop.mock.calls.length;
		toggle(); toggle();
		expect(animation.playSegments).toHaveBeenCalledTimes(1);
		expect(animation.playSegments).toHaveBeenLastCalledWith(theme === 'dark' ? [91, 180] : [0, 90], true);
		expect(animation.goToAndStop).toHaveBeenCalledTimes(initializations);
		emit('complete'); toggle();
		expect(animation.playSegments).toHaveBeenCalledTimes(2);
		expect(animation.playSegments).toHaveBeenLastCalledWith(theme === 'dark' ? [0, 90] : [91, 180], true);
		expect(animation.goToAndStop).toHaveBeenCalledTimes(initializations);
	});
	it('initializes after delayed readiness and removes the active completion listener on unmount', () => {
		animation.ready = false; render();
		expect(animation.goToAndStop).not.toHaveBeenCalled();
		animation.ready = true; render();
		act(() => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach((callback) => callback(16)); });
		expect(animation.goToAndStop).toHaveBeenCalledExactlyOnceWith(90, true);
		toggle(); expect(animation.listeners.get('complete')?.size).toBe(1);
		act(() => root.unmount()); root = createRoot(container);
		expect(animation.listeners.get('complete')?.size ?? 0).toBe(0);
	});
	it('removes pending DOMLoaded listeners on unmount, including Strict Mode setup replay', () => {
		animation.totalFrames = 0; render();
		expect(animation.listeners.get('DOMLoaded')?.size).toBe(1);
		act(() => root.unmount()); root = createRoot(container);
		expect(animation.listeners.get('DOMLoaded')?.size ?? 0).toBe(0);
		emit('DOMLoaded'); expect(animation.goToAndStop).not.toHaveBeenCalled();
	});
	it('cancels readiness polling on unmount', () => {
		animation.ready = false; render(); expect(frames.size).toBe(1);
		act(() => root.unmount()); root = createRoot(container);
		expect(frames.size).toBe(0);
	});
});
