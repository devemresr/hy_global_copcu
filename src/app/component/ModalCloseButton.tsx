import type { ButtonHTMLAttributes } from 'react';
import { X } from 'lucide-react';

type Props = Omit<
	ButtonHTMLAttributes<HTMLButtonElement>,
	'children' | 'type'
> & { label?: string; appearance?: 'default' | 'promotion' };
export function ModalCloseButton({
	label = 'Kapat',
	appearance = 'default',
	className = '',
	...props
}: Props) {
	return (
		<button
			{...props}
			type='button'
			aria-label={label}
			title={label}
			className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-30 ${appearance === 'promotion' ? 'bg-white/10 text-white hover:bg-white/20 focus-visible:outline-emerald-300' : 'bg-text/5 text-text/70 hover:bg-text/10 hover:text-text focus-visible:outline-text'} ${className}`}
		>
			<X size={20} aria-hidden />
		</button>
	);
}
