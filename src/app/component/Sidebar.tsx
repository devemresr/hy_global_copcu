import CancelIcon from '../assets/icons/icons8-cancel.svg?react';
import '../App.css';
import { PAGE_PATHS } from '../constants/pagePaths.constant';

export type sideBarDisplayMode = 'push' | 'overlay';
interface SidebarProps {
	isOpen: boolean;
	mode: sideBarDisplayMode;
	onClose: () => void;
}

export function Sidebar({ isOpen, mode, onClose }: SidebarProps) {
	if (mode === 'push') {
		// Sticky at viewport height so it covers the screen at any scroll
		// position, instead of ending after the first screenful. Contents keep
		// a fixed w-64 so nothing reflows while the width animates to 0.
		return (
			<aside
				className={`bg-sidebar-bg sticky top-0 h-screen self-start shrink-0 overflow-hidden transition-all duration-600 ease-in-out flex flex-col
          ${isOpen ? 'w-64' : 'w-0'}`}
			>
				<div className='flex w-64 justify-between p-4 items-center'>
					<a className='text-heading-text font-bold block whitespace-nowrap' href={PAGE_PATHS.HOME}>
						GLOBAL ÇÖPÇÜ
					</a>
					<button className='text-text h-8 w-8 ' onClick={onClose}>
						<CancelIcon className='w-full h-full' />
					</button>
				</div>

				<nav className='flex flex-col px-4 py-2 gap-4 text-text w-64'>
					<a href={PAGE_PATHS.PRICING}>Fiyatlandırma</a>
					<a href={PAGE_PATHS.INFO}>Kaynaklar</a>
					<a href={PAGE_PATHS.ABOUT}>Hakkımızda</a>
				</nav>
			</aside>
		);
	}

	return (
		<>
			<div
				onClick={onClose}
				className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-600
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
			/>
			<aside
				className={`fixed top-0 left-0 h-full w-64 bg-sidebar-bg z-50 shadow-xl
          transform transition-transform duration-600 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
			>
				<div className='flex justify-between p-4 items-center'>
					<a className='text-heading-text font-bold block whitespace-nowrap' href={PAGE_PATHS.HOME}>
						GLOBAL ÇÖPÇÜ
					</a>
					<button className='text-text h-8 w-8' onClick={onClose}>
						<CancelIcon className='w-full h-full' />
					</button>
				</div>

				<nav className='flex flex-col px-4 py-2 gap-4 text-text'>
					<a href={PAGE_PATHS.PRICING}>Fiyatlandırma</a>
					<a href={PAGE_PATHS.INFO}>Kaynaklar</a>
					<a href={PAGE_PATHS.ABOUT}>Hakkımızda</a>
				</nav>
			</aside>
		</>
	);
}
