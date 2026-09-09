import CancelIcon from '../assets/icons/icons8-cancel.svg?react';
import '../App.css';

export type sideBarDisplayMode = 'push' | 'overlay';
interface SidebarProps {
	isOpen: boolean;
	mode: sideBarDisplayMode;
	onClose: () => void;
}

export function Sidebar({ isOpen, mode, onClose }: SidebarProps) {
	if (mode === 'push') {
		return (
			<aside
				className={`bg-sidebar-bg h-screen overflow-hidden transition-all duration-600 ease-in-out flex flex-col
          ${isOpen ? 'w-64' : 'w-0'}`}
			>
				<div className='flex justify-between p-4 items-center'>
					<a className='text-heading-text font-bold block' href='/'>
						GLOBAL ÇÖPÇÜ
					</a>
					<button className='text-text h-8 w-8 ' onClick={onClose}>
						<CancelIcon className='w-full h-full' />
					</button>
				</div>

				<nav className='flex flex-col px-4 py-2 gap-4 text-text w-64'>
					<a href='#'>Fiyatlandırma</a>
					<a href='/bilgi'>Kaynaklar</a>
					<a href='#'>Hakkımızda</a>
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
					<a className='text-heading-text font-bold block' href='/'>
						GLOBAL ÇÖPÇÜ
					</a>
					<button className='text-text h-8 w-8' onClick={onClose}>
						<CancelIcon className='w-full h-full' />
					</button>
				</div>

				<nav className='flex flex-col px-4 py-2 gap-4 text-text'>
					<a href='#'>Fiyatlandırma</a>
					<a href='/bilgi'>Kaynaklar</a>
					<a href='#'>Hakkımızda</a>
				</nav>
			</aside>
		</>
	);
}
