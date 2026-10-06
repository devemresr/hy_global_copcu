import { useEffect } from 'react';
import env from '../config/env';
import { STAFF_PATH_PREFIXES } from '../constants/pagePaths.constant';

/**
 * Injects Umami's tracking script directly, pointed at whatever instance
 * VITE_UMAMI_SCRIPT_URL resolves to (the Docker-hosted one on the VPS).
 *
 * Page views on client-side route changes need no router hook here - the
 * Umami script already patches history.pushState. Click events are declared
 * in markup with data-umami-event attributes rather than umami.track() calls,
 * so components don't need to know whether the script loaded.
 */

// Staff pages would otherwise dominate the stats of a small public site.
const EXCLUDED_PATH_PREFIXES = STAFF_PATH_PREFIXES;
const BEFORE_SEND_HOOK = '__umamiBeforeSend';

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type UmamiPayload = { url?: string };

declare global {
	interface Window {
		[BEFORE_SEND_HOOK]?: (type: string, payload: UmamiPayload) => UmamiPayload | null;
	}
}

// Rejects the `placeHolder` values checked into the env files.
function isConfigured(scriptUrl: string, websiteId: string) {
	if (!UUID_PATTERN.test(websiteId)) return false;
	try {
		return ['http:', 'https:'].includes(new URL(scriptUrl).protocol);
	} catch {
		return false;
	}
}

export function UmamiAnalytics() {
	useEffect(() => {
		if (!import.meta.env.PROD) return;

		const scriptUrl = env.VITE_UMAMI_SCRIPT_URL;
		const websiteId = env.VITE_UMAMI_WEBSITE_ID;
		if (!isConfigured(scriptUrl, websiteId)) return;

		window[BEFORE_SEND_HOOK] = (_type, payload) => {
			const path = payload.url ?? window.location.pathname;
			return EXCLUDED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))
				? null
				: payload;
		};

		const script = document.createElement('script');
		script.defer = true;
		script.src = scriptUrl;
		script.dataset.websiteId = websiteId;
		script.dataset.beforeSend = BEFORE_SEND_HOOK;
		document.head.appendChild(script);

		return () => {
			document.head.removeChild(script);
			delete window[BEFORE_SEND_HOOK];
		};
	}, []);

	return null;
}
