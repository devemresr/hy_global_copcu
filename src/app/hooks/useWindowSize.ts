import { useState, useEffect, useCallback, useRef } from 'react';

interface WindowSize {
	width: number;
	height: number;
}

export function useWindowSize(debounceMs = 100): WindowSize {
	const [size, setSize] = useState<WindowSize>(() => ({
		// guard for SSR
		width: typeof window !== 'undefined' ? window.innerWidth : 0,
		height: typeof window !== 'undefined' ? window.innerHeight : 0,
	}));

	const frame = useRef<number | null>(null);
	const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleResize = useCallback(() => {
		if (timeout.current) clearTimeout(timeout.current);
		timeout.current = setTimeout(() => {
			// rAF ensures we read layout after the browser has settled it
			frame.current = requestAnimationFrame(() => {
				setSize({ width: window.innerWidth, height: window.innerHeight });
			});
		}, debounceMs);
	}, [debounceMs]);

	useEffect(() => {
		// set correct value on mount (in case SSR value was 0 or stale)
		setSize({ width: window.innerWidth, height: window.innerHeight });

		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
			if (timeout.current) clearTimeout(timeout.current);
			if (frame.current) cancelAnimationFrame(frame.current);
		};
	}, [handleResize]);

	return size;
}
