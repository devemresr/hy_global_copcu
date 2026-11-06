import { useEffect } from 'react';

let locks = 0;
let restore: (() => void) | undefined;

export function useBodyScrollLock(enabled = true) {
	useEffect(() => {
		if (!enabled) return;
		if (locks++ === 0) {
			const body = document.body;
			const root = document.documentElement;
			const previous = {
				overflow: body.style.overflow,
				position: body.style.position,
				top: body.style.top,
				width: body.style.width,
				rootOverflow: root.style.overflow,
			};
			const scrollY = window.scrollY;
			body.style.overflow = 'hidden';
			body.style.position = 'fixed';
			body.style.top = `-${scrollY}px`;
			body.style.width = '100%';
			root.style.overflow = 'hidden';
			restore = () => {
				Object.assign(body.style, {
					overflow: previous.overflow,
					position: previous.position,
					top: previous.top,
					width: previous.width,
				});
				root.style.overflow = previous.rootOverflow;
				if (window.scrollY !== scrollY)
					window.scrollTo({ top: scrollY, behavior: 'instant' });
			};
		}
		return () => {
			if (--locks === 0) {
				restore?.();
				restore = undefined;
			}
		};
	}, [enabled]);
}
