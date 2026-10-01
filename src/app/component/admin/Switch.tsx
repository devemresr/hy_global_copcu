export function Switch({
	checked,
	onChange,
	label,
	disabled = false,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: React.ReactNode;
	disabled?: boolean;
}) {
	return (
		<label className='inline-flex cursor-pointer items-center gap-2 select-none has-disabled:cursor-not-allowed has-disabled:opacity-50'>
			<button
				type='button'
				role='switch'
				aria-checked={checked}
				disabled={disabled}
				onClick={() => onChange(!checked)}
				className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
					checked ? 'bg-green-500' : 'bg-button-hover-bg'
				}`}
			>
				<span
					className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
						checked ? 'translate-x-4' : ''
					}`}
				/>
			</button>
			{label}
		</label>
	);
}
