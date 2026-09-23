export const API_BASE_PATHS = {
	AUTH: '/auth',
	ITEMS: '/items',
	LOG_EVENTS: '/log-events',
} as const;

export const AUTH_ROUTES = {
	LOGIN: `${API_BASE_PATHS.AUTH}/login`,
	REFRESH: `${API_BASE_PATHS.AUTH}/refresh`,
	LOGOUT: `${API_BASE_PATHS.AUTH}/logout`,
} as const;

export const ITEM_ROUTES = {
	LIST: `${API_BASE_PATHS.ITEMS}`,
	UPDATE: (id: string) => `${API_BASE_PATHS.ITEMS}/${id}`,
} as const;

export const LOG_EVENT_ROUTES = {
	LIST: `${API_BASE_PATHS.LOG_EVENTS}`,
} as const;
