import {
	useCallback,
	useEffect,
	useState,
	type Dispatch,
	type SetStateAction,
} from 'react';

type Props = {
	value: number | '';
	onChange: Dispatch<SetStateAction<number | ''>>;
};

// matches: optional digits, optional single dot, up to 2 decimal digits
const PARTIAL_RATE_REGEX = /^\d{0,3}(\.\d{0,2})?$/;

export function InterestRateInput({ value, onChange }: Props) {
	const [display, setDisplay] = useState<string>(
		value === '' ? '' : String(value),
	);

	// keep display in sync if value changes from outside (e.g. reset button elsewhere)
	useEffect(() => {
		setDisplay(value === '' ? '' : String(value));
	}, [value]);

	const handleInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (['-', '+', 'e', 'E'].includes(e.key)) {
			e.preventDefault();
		}
	};

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const raw = e.target.value;

			if (raw === '') {
				setDisplay('');
				onChange('');
				return;
			}

			if (!PARTIAL_RATE_REGEX.test(raw)) {
				return; // reject invalid keystrokes, display unchanged
			}

			// always update display so "7.", "7.5" etc. can be typed
			setDisplay(raw);

			// don't push a numeric value up until it's parseable
			if (raw === '.' || raw.endsWith('.')) {
				return;
			}

			const num = Number(raw);
			if (Number.isNaN(num) || num > 100) {
				return;
			}

			onChange(num);
		},
		[onChange],
	);

	const handleBlur = useCallback(() => {
		if (display === '' || display === '.') {
			setDisplay('');
			onChange('');
			return;
		}
		const num = Number(display);
		if (Number.isNaN(num)) {
			setDisplay('');
			onChange('');
			return;
		}
		const clamped = Math.min(100, Math.max(0, num));
		const rounded = Math.round(clamped * 100) / 100;
		setDisplay(String(rounded));
		onChange(rounded);
	}, [display, onChange]);

	const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData('text').trim();

		if (pasted === '' || !/^\d{0,3}(\.\d{0,2})?$/.test(pasted)) {
			return;
		}

		const num = Number(pasted);
		if (Number.isNaN(num)) return;

		const clamped = Math.min(100, Math.max(0, num));
		setDisplay(String(clamped));
		onChange(clamped);
	};

	return (
		<div className='min-w-30 flex items-center justify-between py-2 px-2 rounded-2xl border-border border-2 shadow-xl bg-button-bg text-text transition-colors duration-200 hover:bg-button-hover-bg focus:bg-button-focus-bg'>
			<input
				className='field-sizing-content w-full bg-transparent outline-none [appearance:textfield]'
				type='text'
				inputMode='decimal'
				value={display}
				onKeyDown={handleInput}
				onChange={handleChange}
				onPaste={handlePaste}
				onBlur={handleBlur}
				id='rateInput'
			/>
			<span className='text-sm text-gray-500 select-none'>%</span>
		</div>
	);
}
