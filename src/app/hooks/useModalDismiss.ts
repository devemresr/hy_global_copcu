import {
	useRef,
	type MouseEvent,
	type PointerEvent,
	type SyntheticEvent,
} from 'react';
import { useBodyScrollLock } from './useBodyScrollLock';

type Options = {
	open?: boolean;
	closeOnOutsideClick?: boolean;
	escapeEnabled?: boolean;
	disabled?: boolean;
};
// Native dialog backdrops target the dialog itself, as does its inner padding.
// Check coordinates so only a true backdrop click dismisses a native dialog.
export function useModalDismiss(
	onClose: () => void,
	{
		open = true,
		closeOnOutsideClick = true,
		escapeEnabled = true,
		disabled = false,
	}: Options = {},
) {
	useBodyScrollLock(open);
	const pointerOutside = useRef<boolean | null>(null);
	function outside(event: MouseEvent<HTMLElement> | PointerEvent<HTMLElement>) {
		if (event.target !== event.currentTarget) return false;
		if (event.currentTarget.tagName !== 'DIALOG') return true;
		const rect = event.currentTarget.getBoundingClientRect();
		return (
			event.clientX < rect.left ||
			event.clientX > rect.right ||
			event.clientY < rect.top ||
			event.clientY > rect.bottom
		);
	}
	return {
		onPointerDown: (event: PointerEvent<HTMLElement>) => {
			pointerOutside.current = outside(event);
		},
		onClick: (event: MouseEvent<HTMLElement>) => {
			const startedOutside = pointerOutside.current;
			pointerOutside.current = null;
			if (
				!disabled &&
				closeOnOutsideClick &&
				startedOutside !== false &&
				outside(event)
			)
				onClose();
		},
		onCancel: (event: SyntheticEvent<HTMLElement>) => {
			event.preventDefault();
			if (!disabled && escapeEnabled) onClose();
		},
	};
}
