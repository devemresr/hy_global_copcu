import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type SetStateAction,
} from 'react';
import type { z } from 'zod';
import { toast } from 'sonner';
import { readOrderDraft } from '../helpers/orderDraft.helper';

export function useOrderDraft<T>(
	key: string | null,
	schema: z.ZodType<T, z.ZodTypeDef, unknown>,
	initial: () => T,
	label: string,
	enabled = true,
) {
	const load = () => {
		const stored = readOrderDraft(key, schema);
		return {
			key,
			value: stored?.data ?? initial(),
			restoredAt: stored?.savedAt ?? null,
			revision: 0,
		};
	};
	const [draft, setDraft] = useState(load);
	if (draft.key !== key) setDraft(load());
	const notified = useRef<string | null>(null);
	useEffect(() => {
		if (
			!enabled ||
			draft.key !== key ||
			!draft.restoredAt ||
			notified.current === `${key}:${draft.restoredAt}`
		)
			return;
		notified.current = `${key}:${draft.restoredAt}`;
		toast.info(`Kaydedilmemiş ${label} taslağı yüklendi`, {
			description: new Date(draft.restoredAt).toLocaleString('tr-TR', {
				timeZone: 'Europe/Istanbul',
			}),
		});
	}, [key, enabled, draft.key, draft.restoredAt, label]);
	useLayoutEffect(() => {
		if (!enabled || !key || draft.key !== key || draft.revision === 0) return;
		try {
			localStorage.setItem(
				key,
				JSON.stringify({
					version: 1,
					savedAt: new Date().toISOString(),
					data: draft.value,
				}),
			);
		} catch {
			/* Keep the editable form usable when browser storage is unavailable. */
		}
	}, [key, enabled, draft]);
	function setValue(action: SetStateAction<T>) {
		setDraft((current) => ({
			...current,
			value:
				typeof action === 'function'
					? (action as (value: T) => T)(current.value)
					: action,
			revision: current.revision + 1,
		}));
	}
	function clear(value = initial()) {
		if (key) {
			try {
				localStorage.removeItem(key);
			} catch {
				/* Storage can be blocked. */
			}
		}
		setDraft({ key, value, restoredAt: null, revision: 0 });
	}
	return { value: draft.value, restoredAt: draft.restoredAt, setValue, clear };
}
