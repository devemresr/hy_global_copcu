import { useEffect } from 'react';
import env from '../config/env';

/**
 * Injects Umami's tracking script directly, pointed at whatever instance
 * VITE_UMAMI_SCRIPT_URL resolves to (the Docker-hosted one on the VPS).
 */
export function UmamiAnalytics() {
	useEffect(() => {
		if (!import.meta.env.PROD) return;

		const scriptUrl = env.VITE_UMAMI_SCRIPT_URL;
		const websiteId = env.VITE_UMAMI_WEBSITE_ID;
		if (!scriptUrl || !websiteId) return;

		const script = document.createElement('script');
		script.defer = true;
		script.src = scriptUrl;
		script.dataset.websiteId = websiteId;
		document.head.appendChild(script);

		return () => {
			document.head.removeChild(script);
		};
	}, []);

	return null;
}
