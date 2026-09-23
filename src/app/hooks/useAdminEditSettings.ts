import { useEffect, useState } from 'react';

const STORAGE_KEY = 'adminFieldEditSettings';

type AdminEditSettings = {
	confirmEdits: boolean;
	confirmDeletes: boolean;
	enterToConfirm: boolean;
	escapeToCancel: boolean;
};

const DEFAULT_SETTINGS: AdminEditSettings = {
	confirmEdits: true,
	confirmDeletes: true,
	enterToConfirm: true,
	escapeToCancel: true,
};

function loadSettings(): AdminEditSettings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_SETTINGS;
		const parsed = JSON.parse(raw);
		return {
			confirmEdits:
				typeof parsed.confirmEdits === 'boolean'
					? parsed.confirmEdits
					: DEFAULT_SETTINGS.confirmEdits,
			confirmDeletes:
				typeof parsed.confirmDeletes === 'boolean'
					? parsed.confirmDeletes
					: DEFAULT_SETTINGS.confirmDeletes,
			enterToConfirm:
				typeof parsed.enterToConfirm === 'boolean'
					? parsed.enterToConfirm
					: DEFAULT_SETTINGS.enterToConfirm,
			escapeToCancel:
				typeof parsed.escapeToCancel === 'boolean'
					? parsed.escapeToCancel
					: DEFAULT_SETTINGS.escapeToCancel,
		};
	} catch {
		return DEFAULT_SETTINGS;
	}
}

// Per-browser (localStorage), not per-admin-account: whether field
// edits/deletions in the inventory grid pause for a confirmation step first
// (confirmEdits/confirmDeletes), and whether the confirm/edit modals react to
// Enter/Escape (enterToConfirm/escapeToCancel - see useModalHotkeys). Kept as
// four separate toggles rather than one combined setting, since wanting one
// doesn't imply wanting the others - e.g. an admin might want confirmation
// steps but find the Enter/Escape shortcuts surprising while typing fast in
// the same modals' inputs.
export function useAdminEditSettings() {
	const [settings, setSettings] = useState<AdminEditSettings>(loadSettings);

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
		} catch {
			// private browsing, storage full, etc. - setting just won't persist
		}
	}, [settings]);

	return {
		confirmEdits: settings.confirmEdits,
		confirmDeletes: settings.confirmDeletes,
		enterToConfirm: settings.enterToConfirm,
		escapeToCancel: settings.escapeToCancel,
		setConfirmEdits: (value: boolean) =>
			setSettings((s) => ({ ...s, confirmEdits: value })),
		setConfirmDeletes: (value: boolean) =>
			setSettings((s) => ({ ...s, confirmDeletes: value })),
		setEnterToConfirm: (value: boolean) =>
			setSettings((s) => ({ ...s, enterToConfirm: value })),
		setEscapeToCancel: (value: boolean) =>
			setSettings((s) => ({ ...s, escapeToCancel: value })),
	};
}
