import { act } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { Header } from '../app/component/Header';
import { ThemeContext } from '../app/hooks/useTheme';
import { PAGE_PATHS } from '../app/constants/pagePaths.constant';

const logout = vi.hoisted(() => vi.fn());
vi.mock('../app/hooks/api/endpoints/useAuth', () => ({
	useLogout: () => ({ mutate: logout, isPending: false }),
}));
vi.mock('lottie-react', () => ({ Lottie: () => null }));
vi.mock('../app/assets/icons/icons8-whatsapp.svg?react', () => ({
	default: () => null,
}));
vi.stubGlobal(
	'requestAnimationFrame',
	vi.fn(() => 1),
);
vi.stubGlobal('cancelAnimationFrame', vi.fn());
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let container: HTMLDivElement;
afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	logout.mockClear();
});

it.each([
	PAGE_PATHS.ADMIN,
	PAGE_PATHS.PURCHASES,
	PAGE_PATHS.SALES,
	PAGE_PATHS.STOCK,
	PAGE_PATHS.BALANCE,
	PAGE_PATHS.ANALYSIS,
])(
	'keeps the same admin navigation order and one icon logout control on %s',
	(pathname) => {
		container = document.createElement('div');
		document.body.append(container);
		root = createRoot(container);
		act(() =>
			root.render(
				<MemoryRouter initialEntries={[pathname]}>
					<ThemeContext.Provider value={{ theme: 'light' }}>
						<Header
							isOpen={false}
							onToggle={() => {}}
							setTheme={() => {}}
							sidebarAnimationRef={{ current: null }}
							sidebarAnimationSrc={{}}
						/>
					</ThemeContext.Provider>
				</MemoryRouter>,
			),
		);
		expect(
			[...container.querySelectorAll('nav a')].map((link) => link.textContent),
		).toEqual(['Yönetim', 'Alış', 'Satış', 'Stok', 'Bakiye', 'Analiz']);
		expect(container.querySelectorAll('[aria-current=page]')).toHaveLength(1);
		expect(container.querySelector('header')!.children).toHaveLength(1);
		expect(
			container.querySelector('[aria-current=page]')?.getAttribute('href'),
		).toBe(pathname);
		const button = container.querySelector<HTMLButtonElement>(
			'button[aria-label="Çıkış yap"]',
		)!;
		expect(button.textContent).toBe('');
		expect(button.querySelector('svg')).not.toBeNull();
		act(() => button.click());
		expect(logout).toHaveBeenCalledOnce();
	},
);
