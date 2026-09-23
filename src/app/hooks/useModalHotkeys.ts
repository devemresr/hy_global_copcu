import { useEffect } from 'react';

type Options = {
	enterEnabled: boolean;
	escapeEnabled: boolean;
};

// Lets a modal respond to Enter (confirm) and Escape (cancel) as soon as it
// mounts, regardless of what had focus beforehand - a document-level
// listener sidesteps needing to move focus into the modal just to make the
// keys work. Skips Enter while the focused element is a <select> (already
// using Enter to pick an option) or a <button> (already fires a click on
// Enter natively - handling it again here would double-fire Kaydet, or fire
// it when Vazgeç was what's actually focused).
export function useModalHotkeys(
	onConfirm: () => void,
	onCancel: () => void,
	{ enterEnabled, escapeEnabled }: Options,
) {
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape' && escapeEnabled) {
				e.stopPropagation();
				onCancel();
				return;
			}
			const tag = (e.target as HTMLElement | null)?.tagName;
			if (
				e.key === 'Enter' &&
				enterEnabled &&
				tag !== 'SELECT' &&
				tag !== 'BUTTON'
			) {
				e.preventDefault();
				onConfirm();
			}
		}
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onConfirm, onCancel, enterEnabled, escapeEnabled]);
}
