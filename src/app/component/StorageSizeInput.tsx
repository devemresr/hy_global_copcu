import { useId, useState, type Dispatch, type SetStateAction } from 'react';
import { ChevronDown, ChevronUp, ChevronsDown, ChevronsUp } from 'lucide-react';

type Props = {
	disabled?: boolean;
	describedBy?: string;
	value: number | '';
	onChange: Dispatch<SetStateAction<number | ''>>;
	id?: string;
	className?: string;
	stepperClassName?: string;
};

export function StorageSizeInput({ value, onChange, id, className, stepperClassName, disabled = false, describedBy }: Props) {
	const warningId = useId();
	const [draft, setDraft] = useState<string | null>(null);
	const warning = value !== '' && (!Number.isFinite(value) || value <= 0 || 2 ** Math.round(Math.log2(value)) !== value);
	const canScale = !disabled && value !== '' && Number.isFinite(value) && value > 0;
	const canIncrease = !disabled && (value === '' || (canScale && Number(value) < 1024));
	function scale(factor: number) {
		if (disabled) return;
		setDraft(null);
		onChange((current) => {
			if (current === '' && factor > 1) return 8;
			if (current === '' || !Number.isFinite(current) || current <= 0) return current;
			const next = current * factor;
			return Math.min(1024, Math.max(8, next));
		});
	}
	const buttonClass = `${stepperClassName ?? 'px-2 py-1 rounded-lg'} shrink-0 hover:bg-button-hover-bg disabled:opacity-30`;
	return (
		<div className='w-fit max-w-full'>
			<div style={{ width: 'max-content' }} className={`inline-flex max-w-full items-center gap-1 ${className ?? 'rounded-xl bg-button-bg px-2 py-1.5'}`}>
				<button type='button' className={buttonClass} aria-label='Depolamayı 4’e böl' title='÷4' disabled={!canScale || Number(value) <= 8} onClick={() => scale(0.25)}><ChevronsDown size={16} /></button>
				<button type='button' className={buttonClass} aria-label='Depolamayı 2’ye böl' title='÷2' disabled={!canScale || Number(value) <= 8} onClick={() => scale(0.5)}><ChevronDown size={16} /></button>
				<input
					disabled={disabled}
					id={id}
					type='text'
					inputMode='decimal'
					className='box-content w-[4ch] flex-none bg-transparent px-1 text-center tabular-nums outline-none'
					value={draft ?? value}
					onBlur={() => setDraft(null)}
					aria-describedby={[describedBy, warning ? warningId : undefined].filter(Boolean).join(' ') || undefined}
					onChange={(event) => {
						const raw = event.target.value.trim().replace(',', '.');
						if (raw === '' || raw === '.') {
							setDraft(raw);
							onChange('');
						} else if (/^\d*\.?\d*$/.test(raw) && Number.isFinite(Number(raw))) {
							setDraft(raw);
							onChange(Number(raw));
						}
					}}
				/>
				<button type='button' className={buttonClass} aria-label='Depolamayı 2 ile çarp' title='×2' disabled={!canIncrease} onClick={() => scale(2)}><ChevronUp size={16} /></button>
				<button type='button' className={buttonClass} aria-label='Depolamayı 4 ile çarp' title='×4' disabled={!canIncrease} onClick={() => scale(4)}><ChevronsUp size={16} /></button>
			</div>
			{warning && <p id={warningId} role='status' className='mt-1 text-xs text-amber-600 dark:text-amber-400'>Uyarı: Depolama değeri 2’nin kuvveti olmalıdır. Geçerli bir değer girin.</p>}
		</div>
	);
}
