import {
	useCallback,
	useEffect,
	useRef,
	type Dispatch,
	type SetStateAction,
} from 'react';

type Props = {
	value: number | '';
	onChange: Dispatch<SetStateAction<number | ''>>;
};
export function NumberInputWithSteppers({ value, onChange }: Props) {
	const inputRef = useRef<HTMLInputElement>(null);
	const handleInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (['-', '+', 'e', 'E'].includes(e.key)) {
			e.preventDefault();
		}
	};

	useEffect(() => {
		const el = inputRef.current;
		if (!el) return;

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			onChange((prev) => {
				const current = prev === '' ? 0 : Number(prev);
				const next = current + (e.deltaY < 0 ? 10 : -10);
				return Math.max(0, next);
			});
		};

		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => el.removeEventListener('wheel', handleWheel);
	}, [onChange]);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const raw = e.target.value.replace(/,/g, '');

			if (raw === '') {
				onChange('');
				return;
			}
			if (!/^\d+$/.test(raw)) {
				return; // ignore non-digit input (since type=text allows anything)
			}

			onChange((prev) => {
				if (prev === 0 && Number(raw) === 0) {
					return prev;
				}
				return Math.max(0, Number(raw));
			});
		},
		[value, onChange],
	);

	const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();

		const pasted = e.clipboardData.getData('text');
		const normalized = pasted.replace(/^0+(?=\d)/, '');

		onChange(normalized === '' ? '' : Math.max(0, Number(normalized)));
	};

	const displayValue = value === '' ? '' : value.toLocaleString('en-US');
	return (
		<div
			className='w-fit flex items-center justify-between gap-2
        py-2 pl-3 pr-2
        rounded-2xl border-border
        border-2
        shadow-xl
        bg-button-bg text-text
        transition-colors duration-200
        hover:bg-button-hover-bg
        focus:bg-button-focus-bg
        '
		>
			<input
				className='field-sizing-content min-w-10 bg-transparent outline-none 
          [appearance:textfield]'
				type='text'
				value={displayValue}
				onKeyDown={handleInput}
				onChange={handleChange}
				onPaste={handlePaste}
				inputMode='numeric'
				ref={inputRef}
				id='numInput'
			/>
			<div className='flex items-center gap-1'>
				<button
					type='button'
					onClick={() => onChange((v) => Number(v) + 100)}
					className='text-xs px-2 py-1 rounded-lg text-gray-500
            hover:bg-gray-300 dark:hover:bg-gray-300 hover:text-black
            transition-colors duration-150 select-none'
				>
					+100
				</button>
				<button
					type='button'
					onClick={() => onChange((v) => Number(v) + 1000)}
					className='text-xs px-2 py-1 rounded-lg  text-gray-500
            hover:bg-gray-300 dark:hover:bg-gray-300 hover:text-black
            transition-colors duration-150 select-none'
				>
					+1k
				</button>
			</div>
		</div>
	);
}
