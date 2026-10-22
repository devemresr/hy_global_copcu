import type { ButtonHTMLAttributes } from 'react';
import { X } from 'lucide-react';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> & { label: string };

export function CrossButton({ label, className = '', ...props }: Props) {
	return <button {...props} type='button' aria-label={label} title={label} className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text/70 hover:bg-button-hover-bg hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-30 ${className}`}>
		<X size={16} aria-hidden='true' />
	</button>;
}
