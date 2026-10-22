import { useId, useState, type Dispatch, type SetStateAction } from 'react';
import { NumberInputWithSteppers } from './NumberInputWithSteppers';

export function CustomerPriceInput({ value, onChange, limit, currency, label, disabled = false }: {
	value: string;
	onChange: Dispatch<SetStateAction<string>>;
	limit: number | null;
	currency: string;
	label: string;
	disabled?: boolean;
}) {
	const inputId = useId();
	const warningId = useId();
	const [overflow, setOverflow] = useState(false);
	const [previous, setPrevious] = useState({ value, limit, currency, disabled });
	if (value !== previous.value || limit !== previous.limit || currency !== previous.currency || disabled !== previous.disabled) {
		setPrevious({ value, limit, currency, disabled });
		if (value === '' || limit !== previous.limit || currency !== previous.currency || disabled !== previous.disabled) setOverflow(false);
	}
	const showWarning = overflow && limit !== null && !disabled;
	return <div className='min-w-0 max-w-full'>
	<div className='flex min-w-0 items-center gap-1 sm:gap-2'>
	<NumberInputWithSteppers
		id={inputId}
		ariaLabel={label}
		describedBy={showWarning ? warningId : undefined}
		value={value === '' ? '' : Number(value)}
		disabled={disabled || limit === null}
		steppers={[{ amount: 10, label: '+10' }, { amount: 100, label: '+100' }]}
		onChange={(change) => {
			const current = value === '' ? '' : Number(value);
			const next = typeof change === 'function' ? change(current) : change;
			if (next === '') { setOverflow(false); onChange(''); return; }
			if (!Number.isFinite(next) || limit === null) return;
			setOverflow(next > limit);
			onChange(String(Math.min(limit, Math.max(0, next))));
		}}
		className='min-w-0 max-w-full flex-1 rounded bg-button-focus-bg p-1.5 sm:p-2 [&_input]:min-w-0 [&_input]:w-12 sm:[&_input]:w-16 [&>div]:hidden sm:[&>div]:flex'
	/>
	<span className='shrink-0 text-xs font-medium'>{currency}</span>
	</div>
	{showWarning && <p id={warningId} role='alert' className='mt-1 max-w-xs text-xs text-amber-600 dark:text-amber-400'>En fazla {limit} {currency} girebilirsiniz. Tutar üst sınıra indirildi.</p>}
	</div>;
}
