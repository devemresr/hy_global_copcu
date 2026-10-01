/**
 * Shows the admin-configured page notice as a persistent sonner toast.
 *
 * Design choices:
 * - toast.custom with our own close button instead of sonner's built-in
 *   one: sonner fires onDismiss for programmatic toast.dismiss() too, so it
 *   can't tell "visitor closed it" (remember it) from "route changed or the
 *   schedule ended" (just hide it). Sonner's swipe/close is disabled.
 * - Each show gets a fresh toast id. Re-creating an id sonner has just
 *   dismissed (StrictMode's double effect does this) inherits its pending
 *   deletion and vanishes.
 * - A visitor's dismissal is kept in sessionStorage keyed by the notice's
 *   content, so it stays closed for the visit but an edited notice shows again.
 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Info, TriangleAlert, X } from 'lucide-react';
import {
	isScheduleActive,
	type NoticeDto,
} from '../hooks/api/endpoints/useSiteStatus';

const DISMISSED_STORAGE_KEY = 'siteNoticeDismissed';
let toastSeq = 0;

function readDismissed(): string | null {
	try {
		return sessionStorage.getItem(DISMISSED_STORAGE_KEY);
	} catch {
		return null;
	}
}

function writeDismissed(key: string) {
	try {
		sessionStorage.setItem(DISMISSED_STORAGE_KEY, key);
	} catch {
		// Storage blocked - it stays closed until the next reload.
	}
}

export function SiteNotice({
	notice,
	pathname,
	now,
}: {
	notice: NoticeDto;
	pathname: string;
	now: number;
}) {
	const contentKey = JSON.stringify([notice.message, notice.type, notice.from, notice.until]);
	const [dismissedKey, setDismissedKey] = useState(readDismissed);
	const toastIdRef = useRef<string | null>(null);

	const onPage = notice.pages.length === 0 || notice.pages.includes(pathname);
	const show =
		isScheduleActive(notice, now) &&
		onPage &&
		!!notice.message &&
		!(notice.dismissible && dismissedKey === contentKey);

	useEffect(() => {
		if (!show || !notice.message) {
			if (toastIdRef.current) toast.dismiss(toastIdRef.current);
			toastIdRef.current = null;
			return;
		}

		const id = toastIdRef.current ?? `site-notice-${++toastSeq}`;
		toastIdRef.current = id;
		const message = notice.message;
		const onClose = notice.dismissible
			? () => {
					writeDismissed(contentKey);
					setDismissedKey(contentKey);
				}
			: null;
		// Same id updates the visible toast in place when the notice is edited.
		toast.custom(
			() => <NoticeToast type={notice.type} message={message} onClose={onClose} />,
			{ id, duration: Infinity, dismissible: false },
		);
	}, [show, notice.message, notice.type, notice.dismissible, contentKey]);

	useEffect(
		() => () => {
			if (toastIdRef.current) toast.dismiss(toastIdRef.current);
			toastIdRef.current = null;
		},
		[],
	);

	return null;
}

function NoticeToast({
	type,
	message,
	onClose,
}: {
	type: NoticeDto['type'];
	message: string;
	onClose: (() => void) | null;
}) {
	const Icon = type === 'warning' ? TriangleAlert : Info;
	return (
		<div
			role='status'
			className='flex w-[356px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-xl border border-border bg-modal-bg p-4 font-sans text-sm text-text shadow-lg'
		>
			<Icon
				className={
					type === 'warning'
						? 'mt-0.5 h-4 w-4 shrink-0 text-amber-500'
						: 'mt-0.5 h-4 w-4 shrink-0 text-blue-500'
				}
				aria-hidden
			/>
			<p className='flex-1 whitespace-pre-line'>{message}</p>
			{onClose && (
				<button
					type='button'
					onClick={onClose}
					aria-label='Kapat'
					className='-m-1 rounded p-1 hover:bg-button-hover-bg'
				>
					<X className='h-4 w-4' />
				</button>
			)}
		</div>
	);
}
