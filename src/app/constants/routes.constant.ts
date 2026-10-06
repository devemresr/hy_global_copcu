export const API_BASE_PATHS = {
	AUTH: '/auth',
	ITEMS: '/items',
	LOG_EVENTS: '/log-events',
	SITE: '/site',
} as const;

export const SITE_ROUTES = {
	STATUS: `${API_BASE_PATHS.SITE}/status`,
	MAINTENANCE: `${API_BASE_PATHS.SITE}/maintenance`,
	NOTICE: `${API_BASE_PATHS.SITE}/notice`,
} as const;

// Must match the server - the refresh cookie is only sent under this path.
const AUTH_SESSION_PATH = `${API_BASE_PATHS.AUTH}/session`;

export const AUTH_ROUTES = {
	LOGIN: `${API_BASE_PATHS.AUTH}/login`,
	REFRESH: `${AUTH_SESSION_PATH}/refresh`,
	LOGOUT: `${AUTH_SESSION_PATH}/logout`,
} as const;

export const ITEM_ROUTES = {
	LIST: `${API_BASE_PATHS.ITEMS}`,
	UPDATE: (id: string) => `${API_BASE_PATHS.ITEMS}/${id}`,
	BULK_UPDATE: `${API_BASE_PATHS.ITEMS}/bulk`,
	CHANGES: `${API_BASE_PATHS.ITEMS}/changes`,
} as const;

export const LOG_EVENT_ROUTES = {
	LIST: `${API_BASE_PATHS.LOG_EVENTS}`,
} as const;
