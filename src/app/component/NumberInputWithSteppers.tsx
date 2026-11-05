import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type SetStateAction,
} from 'react';
import { StorageSizeInput } from './StorageSizeInput';

export type Stepper = { amount: number; label: string };

// Exactly two - a third stepper button has nowhere to go in this layout.
export type Steppers = [Stepper, Stepper];

const DEFAULT_STEPPERS: Steppers = [
	{ amount: 100, label: '+100' },
	{ amount: 1000, label: '+1k' },
];

// Styling: each caller passes its own look via className/stepperClassName
// (replacing the defaults below, not merged - no tailwind-merge here), so the
// input can match whatever controls sit next to it. Layout and the stepper
// buttons' colors stay fixed in here.
type Props = {
	ariaLabel?: string;
	storage?: boolean;
	decimalPlaces?: number;
	disableWheel?: boolean;
	disabled?: boolean;
	describedBy?: string;
	value: number | '';
	onChange: Dispatch<SetStateAction<number | ''>>;
	id?: string;
	steppers?: Steppers;
	// Box look: width, padding, radius, background, border.
	className?: string;
	// Stepper buttons' padding/line-height/radius.
	stepperClassName?: string;
};

const DEFAULT_CLASS_NAME = `w-fit py-2 pl-3 pr-2
        rounded-2xl border-border
        border-2
        shadow-xl
        bg-button-bg text-text
        transition-colors duration-200
        hover:bg-button-hover-bg
        focus:bg-button-focus-bg`;

const DEFAULT_STEPPER_CLASS_NAME = 'px-2 py-1 rounded-lg';

export function NumberInputWithSteppers({ storage, ...props }: Props) {
	return storage ? (
		<StorageSizeInput {...props} />
	) : (
		<AdditiveNumberInput {...props} />
	);
}

function AdditiveNumberInput({
	ariaLabel,
	disabled = false,
	describedBy,
	value,
	onChange,
	id = 'numInput',
	steppers = DEFAULT_STEPPERS,
	className = DEFAULT_CLASS_NAME,
	stepperClassName = DEFAULT_STEPPER_CLASS_NAME,
	decimalPlaces = 0,
	disableWheel = false,
}: Props) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [draft, setDraft] = useState<string | null>(null);
	if (
		draft !== null &&
		(!decimalPlaces || Number(draft.replace(',', '.')) !== value)
	)
		setDraft(null);
	const handleInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (['-', '+', 'e', 'E'].includes(e.key)) {
			e.preventDefault();
		}
	};

	useEffect(() => {
		const el = inputRef.current;
		if (!el || disableWheel) return;

		const handleWheel = (e: WheelEvent) => {
			if (disabled) return;
			e.preventDefault();
			onChange((prev) => {
				const current = prev === '' ? 0 : Number(prev);
				const next = current + (e.deltaY < 0 ? 10 : -10);
				return Math.max(0, next);
			});
		};

		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => el.removeEventListener('wheel', handleWheel);
	}, [onChange, disabled, disableWheel]);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const raw = decimalPlaces
				? e.target.value.replace(',', '.')
				: e.target.value.replace(/,/g, '');

			if (raw === '') {
				setDraft(null);
				onChange('');
				return;
			}
			if (
				!(
					decimalPlaces
						? new RegExp(`^\\d+(?:\\.\\d{0,${decimalPlaces}})?$`)
						: /^\d+$/
				).test(raw)
			) {
				return; // ignore non-digit input (since type=text allows anything)
			}
			if (decimalPlaces) setDraft(e.target.value);

			onChange((prev) => {
				if (prev === 0 && Number(raw) === 0) {
					return prev;
				}
				return Math.max(0, Number(raw));
			});
		},
		[onChange, decimalPlaces],
	);

	const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();

		const pasted = e.clipboardData.getData('text');
		if (decimalPlaces) {
			const number = Number(pasted.trim().replace(',', '.'));
			if (Number.isFinite(number) && number >= 0) {
				setDraft(null);
				onChange(
					Math.round(number * 10 ** decimalPlaces) / 10 ** decimalPlaces,
				);
			}
			return;
		}
		const normalized = pasted.replace(/^0+(?=\d)/, '');

		onChange(normalized === '' ? '' : Math.max(0, Number(normalized)));
	};

	const displayValue =
		draft ??
		(value === ''
			? ''
			: decimalPlaces
				? value.toLocaleString('tr-TR', {
						useGrouping: false,
						maximumFractionDigits: decimalPlaces,
					})
				: value.toLocaleString('en-US'));
	return (
		<div className={`flex items-center justify-between gap-2 ${className}`}>
			<input
				aria-label={ariaLabel}
				disabled={disabled}
				aria-describedby={describedBy}
				className='field-sizing-content min-w-10 bg-transparent outline-none [appearance:textfield]'
				type='text'
				value={displayValue}
				onKeyDown={handleInput}
				onChange={handleChange}
				onPaste={handlePaste}
				onBlur={() => setDraft(null)}
				inputMode={decimalPlaces ? 'decimal' : 'numeric'}
				ref={inputRef}
				id={id}
			/>
			<div className='flex items-center gap-1'>
				{steppers.map((stepper) => (
					<button
						disabled={disabled}
						key={stepper.label}
						type='button'
						onClick={() => {
							setDraft(null);
							onChange(
								(v) =>
									Math.round(
										(Number(v) + stepper.amount) * 10 ** (decimalPlaces || 3),
									) /
									10 ** (decimalPlaces || 3),
							);
						}}
						className={`${stepperClassName} text-xs text-gray-500
            hover:bg-gray-300 dark:hover:bg-gray-300 hover:text-black
            transition-colors duration-150 select-none`}
					>
						{stepper.label}
					</button>
				))}
			</div>
		</div>
	);
}
