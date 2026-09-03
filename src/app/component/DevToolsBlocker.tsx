import { useEffect, type ReactNode } from 'react';

declare global {
	interface Window {
		__REACT_DEVTOOLS_GLOBAL_HOOK__?: Record<string, any>;
	}
}

export function isFunction(obj: unknown): obj is (...args: any[]) => any {
	return typeof obj === 'function';
}

export function isObject(obj: unknown): obj is object {
	const type = typeof obj;
	return type === 'function' || (type === 'object' && !!obj);
}

export function hasWindowObject(): boolean {
	return typeof window !== 'undefined' && !!window.document;
}

export function disableReactDevTools(): void {
	if (hasWindowObject()) {
		if (!isObject(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
			return;
		}

		for (const prop in window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
			if (prop === 'renderers') {
				window.__REACT_DEVTOOLS_GLOBAL_HOOK__[prop] = new Map();
				continue;
			}
			window.__REACT_DEVTOOLS_GLOBAL_HOOK__[prop] = isFunction(
				window.__REACT_DEVTOOLS_GLOBAL_HOOK__[prop],
			)
				? Function.prototype
				: null;
		}
	}
}

export default function DevToolsBlocker({
	children,
}: {
	children: ReactNode | undefined;
}) {
	useEffect(() => {
		// if (import.meta.env.PROD) {
		disableReactDevTools();
		// }
	}, []);
	useEffect(() => {
		// Block common DevTools shortcuts
		const handleKeyDown = (e: KeyboardEvent) => {
			const key = e.key.toUpperCase();

			// F12
			if (e.key === 'F12') {
				e.preventDefault();
				return;
			}

			// Ctrl+Shift+I / Cmd+Option+I (Inspect)
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'I') {
				e.preventDefault();
				return;
			}

			// Ctrl+Shift+J / Cmd+Option+J (Console)
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'J') {
				e.preventDefault();
				return;
			}

			// Ctrl+Shift+C / Cmd+Option+C (Inspect element picker)
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === 'C') {
				e.preventDefault();
				return;
			}

			// Ctrl+U / Cmd+U (View source)
			if ((e.ctrlKey || e.metaKey) && key === 'U') {
				e.preventDefault();
				return;
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, []);

	useEffect(() => {
		const handleContextMenu = (e: MouseEvent) => {
			e.preventDefault();
		};

		document.addEventListener('contextmenu', handleContextMenu);

		return () => {
			document.removeEventListener('contextmenu', handleContextMenu);
		};
	}, []);

	return children;
}
