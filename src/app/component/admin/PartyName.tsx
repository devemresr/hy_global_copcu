export function PartyName({
	label,
	name,
	currentName,
}: {
	label?: string;
	name?: string | null;
	currentName?: string | null;
}) {
	if (!name && !currentName) return null;
	return (
		<span className='min-w-0 break-words'>
			{label && label + ': '}
			{currentName || name}
			{currentName && name && currentName !== name && (
				<span className='block text-xs font-normal text-text/65'>
					İşlem sırasında: {name}
				</span>
			)}
		</span>
	);
}
