import {
	useState,
	useRef,
	useEffect,
	type Dispatch,
	type SetStateAction,
} from 'react';
import type { Bank } from '../../PaymentCalculator';

export default function BankSelect({
	banks,
	onChange,
	selectedBank,
}: {
	banks: Bank[];
	onChange: Dispatch<SetStateAction<string>>;
	selectedBank: string;
}) {
	const [open, setOpen] = useState(false);
	const [highlighted, setHighlighted] = useState(0);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === 'Escape') setOpen(false);
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			if (open) {
				onChange(banks[highlighted].name);
				setOpen(false);
			} else {
				setOpen(true);
			}
		}
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (!open) setOpen(true);
			else setHighlighted((i) => Math.min(i + 1, banks.length - 1));
		}
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			setHighlighted((i) => Math.max(i - 1, 0));
		}
	}

	return (
		<div ref={ref} className='relative min-w-[14ch] w-fit'>
			<button
				type='button'
				onClick={() => setOpen((o) => !o)}
				onKeyDown={handleKeyDown}
				className=' w-full flex items-center justify-between gap-4 py-2 pl-3 pr-2 rounded-2xl border-border border-2 shadow-xl text-text bg-button-bg transition-colors duration-200 hover:bg-button-hover-bg  focus:bg-button-focus-bg  focus:outline-none cursor-pointer'
			>
				<span className='text-text'>{selectedBank}</span>
				<svg
					className={`w-4 h-5 -ml-1 shrink-0 transition-transform duration-500 ${open ? 'rotate-180' : ''}`}
					fill='none'
					viewBox='0 0 24 24'
					stroke='currentColor'
					strokeWidth={2}
				>
					<path
						strokeLinecap='round'
						strokeLinejoin='round'
						d='M19 9l-7 7-7-7'
					/>
				</svg>
			</button>

			{open && (
				<ul
					role='listbox'
					className='
            absolute left-0 top-full w-full z-10
            rounded-2xl border-border border-2
         overflow-hidden
            shadow-lg
          '
				>
					{banks.map((option, i) => (
						<li
							key={option.name}
							role='option'
							aria-selected={selectedBank === option.name}
							onClick={() => {
								onChange(option.name);
								setOpen(false);
							}}
							onMouseEnter={() => setHighlighted(i)}
							className={`
                px-3 py-1 cursor-pointer transition-colors duration-150 bg-button-bg  text-text
                ${highlighted === i ? 'bg-button-focus-bg' : ''}

              `}
						>
							{option.name}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
