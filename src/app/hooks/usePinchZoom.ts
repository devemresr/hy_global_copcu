import { useCallback, useEffect, useRef, useState } from 'react';

// Pinch / drag / double-tap / wheel zoom for a single element, built on
// pointer events so mouse and touch share one code path. Translation is kept
// relative to the container's center and clamped so the zoomed image can't be
// dragged off-screen. The container needs `touch-action: none`, otherwise the
// browser applies its own page pinch-zoom on top of this one.

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 10;
const WHEEL_STEP = 0.0015;

type Transform = { scale: number; x: number; y: number };
type Point = { x: number; y: number };

const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

export function usePinchZoom<T extends HTMLElement>() {
	const containerRef = useRef<T>(null);
	const [transform, setTransform] = useState<Transform>(IDENTITY);
	const transformRef = useRef(transform);
	const pointers = useRef(new Map<number, Point>());
	const gestureStart = useRef<{
		t: Transform;
		mid: Point;
		dist: number;
	} | null>(null);
	const tapStart = useRef<Point | null>(null);
	const lastTapAt = useRef(0);

	// Converts client coords to coords relative to the container's center.
	const toLocal = useCallback((p: Point): Point => {
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) return p;
		return {
			x: p.x - (rect.left + rect.width / 2),
			y: p.y - (rect.top + rect.height / 2),
		};
	}, []);

	const apply = useCallback((next: Transform) => {
		const rect = containerRef.current?.getBoundingClientRect();
		const scale = clampScale(next.scale);
		const maxX = rect ? ((scale - 1) * rect.width) / 2 : 0;
		const maxY = rect ? ((scale - 1) * rect.height) / 2 : 0;
		const clamped = {
			scale,
			x: Math.min(maxX, Math.max(-maxX, next.x)),
			y: Math.min(maxY, Math.max(-maxY, next.y)),
		};
		transformRef.current = clamped;
		setTransform(clamped);
	}, []);

	// Scales to `scale` while keeping the local point `focal` fixed on screen.
	const zoomAt = useCallback(
		(from: Transform, scale: number, focal: Point, anchor: Point = focal) => {
			const s = clampScale(scale);
			const imgX = (anchor.x - from.x) / from.scale;
			const imgY = (anchor.y - from.y) / from.scale;
			apply({ scale: s, x: focal.x - s * imgX, y: focal.y - s * imgY });
		},
		[apply],
	);

	const reset = useCallback(() => apply(IDENTITY), [apply]);

	const beginGesture = () => {
		const pts = [...pointers.current.values()].map(toLocal);
		if (pts.length === 0) {
			gestureStart.current = null;
			return;
		}
		const [a, b = a] = pts;
		gestureStart.current = {
			t: transformRef.current,
			mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
			dist: Math.hypot(a.x - b.x, a.y - b.y),
		};
	};

	const onPointerDown = (e: React.PointerEvent<T>) => {
		e.currentTarget.setPointerCapture(e.pointerId);
		pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
		tapStart.current =
			pointers.current.size === 1 ? { x: e.clientX, y: e.clientY } : null;
		beginGesture();
	};

	const onPointerMove = (e: React.PointerEvent<T>) => {
		if (!pointers.current.has(e.pointerId)) return;
		pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
		const start = gestureStart.current;
		if (!start) return;

		const pts = [...pointers.current.values()].map(toLocal);
		if (pts.length >= 2) {
			const [a, b] = pts;
			const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
			const dist = Math.hypot(a.x - b.x, a.y - b.y);
			zoomAt(start.t, (start.t.scale * dist) / (start.dist || 1), mid, start.mid);
		} else if (start.t.scale > 1) {
			apply({
				scale: start.t.scale,
				x: start.t.x + pts[0].x - start.mid.x,
				y: start.t.y + pts[0].y - start.mid.y,
			});
		}
	};

	const onPointerUp = (e: React.PointerEvent<T>) => {
		if (!pointers.current.delete(e.pointerId)) return;
		// Re-baseline so lifting one finger of a pinch doesn't jump the pan.
		beginGesture();

		const start = tapStart.current;
		tapStart.current = null;
		if (!start || pointers.current.size > 0) return;
		const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
		if (moved > TAP_SLOP_PX) return;

		const now = e.timeStamp;
		if (now - lastTapAt.current < DOUBLE_TAP_MS) {
			lastTapAt.current = 0;
			const t = transformRef.current;
			if (t.scale > 1) reset();
			else zoomAt(t, DOUBLE_TAP_SCALE, toLocal({ x: e.clientX, y: e.clientY }));
		} else {
			lastTapAt.current = now;
		}
	};

	// React's onWheel is passive, so preventDefault needs a native listener.
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const t = transformRef.current;
			const focal = toLocal({ x: e.clientX, y: e.clientY });
			zoomAt(t, t.scale * Math.exp(-e.deltaY * WHEEL_STEP), focal);
		};
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	}, [toLocal, zoomAt]);

	return {
		containerRef,
		transform,
		isZoomed: transform.scale > 1,
		reset,
		handlers: {
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerCancel: onPointerUp,
		},
	};
}
