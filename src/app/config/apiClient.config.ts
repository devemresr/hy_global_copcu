import { configureApiClient } from '../hooks/api/core/api-client';
import { PAGE_PATHS } from '../constants/pagePaths.constant';
import logger from '../util/logger';

// Only admin pages need a session; public pages (e.g. the inventory list)
// share these endpoints and must never be bounced to the login page.
function redirectToLoginFromAdmin() {
	if (typeof window === 'undefined') return;
	if (!window.location.pathname.startsWith(PAGE_PATHS.ADMIN)) return;
	logger.debug('session expired on an admin page, redirecting to login');
	// replace, so Back doesn't land on the admin page and bounce again.
	window.location.replace(PAGE_PATHS.LOGIN);
}

export function setupApiClient() {
	configureApiClient({ onSessionExpired: redirectToLoginFromAdmin });
}
