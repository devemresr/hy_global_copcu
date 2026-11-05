import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { adminHeadingClass } from '../../constants/adminHeading.constant';

export function AdminCollapseIcon({ expanded }: { expanded?: boolean }) {
	return (
		<ChevronDown
			size={16}
			aria-hidden
			className={`admin-collapse-icon shrink-0 transition-transform ${expanded === undefined ? '' : expanded ? 'rotate-0' : '-rotate-90'}`}
		/>
	);
}
export function AdminCollapseButton({
	expanded,
	index = 0,
	className = '',
	children,
	...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
	expanded: boolean;
	index?: number;
}) {
	return (
		<button
			{...props}
			type='button'
			aria-expanded={expanded}
			className={`${adminHeadingClass(index)} ${className}`}
		>
			<AdminCollapseIcon expanded={expanded} />
			{children}
		</button>
	);
}
export function AdminSummary({
	index = 0,
	children,
	className = '',
	...props
}: HTMLAttributes<HTMLElement> & { index?: number }) {
	return (
		<summary
			{...props}
			className={`${adminHeadingClass(index)} cursor-pointer list-none ${className}`}
		>
			<AdminCollapseIcon />
			{children}
		</summary>
	);
}
