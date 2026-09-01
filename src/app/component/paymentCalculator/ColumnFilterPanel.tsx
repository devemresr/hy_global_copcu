import { useState } from 'react';

interface ColumnFilterPanelProps {
	label: string;
	uniqueValues: string[]; // raw display strings, already deduped case-insensitively
	selectedValues: Set<string>; // normalized (trimmed, lowercased) values
	onChange: (next: Set<string>) => void;
}

export function ColumnFilterPanel({
	label,
	uniqueValues,
	selectedValues,
	onChange,
}: ColumnFilterPanelProps) {
	const [highlighted, setHighlighted] = useState(0);
	const [isOpen, setIsOpen] = useState(getDefaultOpen);
	const items = ['__selectAll__', ...uniqueValues]; // not a real value

	function getDefaultOpen() {
		if (typeof window === 'undefined') return true; // SSR guard
		return window.innerWidth >= 1024; // lg breakpoint
	}

	const toKey = (value: string) => value.toLowerCase();

	const toggleValue = (value: string) => {
		const norm = toKey(value);
		const next = new Set(selectedValues);
		next.has(norm) ? next.delete(norm) : next.add(norm);
		onChange(next);
	};

	const allSelected = uniqueValues.every((v) => selectedValues.has(toKey(v)));

	const toggleAll = () => {
		onChange(allSelected ? new Set() : new Set(uniqueValues.map(toKey)));
	};

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === 'Escape') {
			setIsOpen(false);
			return;
		}

		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			if (!isOpen) {
				setIsOpen(true);
				return;
			}
			if (highlighted === 0) {
				toggleAll();
			} else {
				const value = uniqueValues[highlighted - 1];
				if (value !== undefined) toggleValue(value);
			}
			return;
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (!isOpen) {
				setIsOpen(true);
			} else {
				setHighlighted((i) => Math.min(i + 1, items.length - 1));
			}
			return;
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (isOpen) {
				setHighlighted((i) => Math.max(i - 1, 0));
			}
			return;
		}
	}

	return (
		<div
			className='flex flex-col shrink-0 rounded-xl'
			onKeyDown={handleKeyDown}
			tabIndex={0}
		>
			<div
				className='sticky top-0 z-10 w-full  '
				onClick={() => setIsOpen((c) => !c)}
			>
				<button
					type='button'
					className={`${isOpen ? 'bg-button-focus-bg' : 'rounded-xl bg-button-bg'} w-full flex items-center justify-between 
				hover:bg-button-hover-bg focus:outline-none cursor-pointer  p-3 bg-button-bg border-2    border-border text-text`}
				>
					{label}
					<svg
						className={`w-4 h-5 -ml-1 shrink-0 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}
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
			</div>

			{isOpen && (
				<ul>
					<li
						className={`bg-button-bg hover:bg-button-hover-bg ${highlighted === 0 ? 'bg-button-focus-bg' : ''} pl-4`}
					>
						<label className='flex gap-1'>
							<input
								type='checkbox'
								tabIndex={-1}
								checked={allSelected}
								onChange={toggleAll}
							/>
							(Select all)
						</label>
					</li>
					{uniqueValues.map((value, i) => (
						<li
							key={value}
							className={`${highlighted === i + 1 ? 'bg-button-focus-bg' : ''} bg-button-bg hover:bg-button-hover-bg pl-4 last:rounded-bl-xl last:rounded-br-xl`}
						>
							<label className='flex gap-1 align-middle'>
								<input
									type='checkbox'
									tabIndex={-1}
									checked={selectedValues.has(toKey(value))}
									onChange={() => toggleValue(value)}
								/>
								{value}
							</label>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
