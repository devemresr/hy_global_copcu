import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark';
const DEFAULT_THEME = { theme: 'dark' };

export const ThemeContext = createContext<{ theme: Theme } | undefined>(
	undefined,
);

export const useTheme = () => {
	const context = useContext(ThemeContext);

	if (!context) {
		if (process.env.NODE_ENV !== 'production') {
			throw new Error('useTheme must be used inside ThemeContext.Provider');
		}
		return DEFAULT_THEME;
	}

	return context;
};
