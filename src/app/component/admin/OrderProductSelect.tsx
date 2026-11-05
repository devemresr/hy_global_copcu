import {
	ORDER_MEMORY_SIZES,
	ORDER_PRODUCT_TYPES,
	ORDER_PRODUCT_TYPE_ORDER,
} from '../../constants/orderProducts.constant';
import { formatOrderProduct } from '../../helpers/orderProduct.helper';

export type OrderProductChoice = {
	type: keyof typeof ORDER_PRODUCT_TYPES;
	memoryGb: number | null;
	requiresMemorySize: boolean;
};
export function OrderProductSelect({
	value,
	onChange,
	disabled,
	rowNumber,
	id,
	className = '',
	productTypes = ORDER_PRODUCT_TYPES,
	memorySizes = [...ORDER_MEMORY_SIZES],
}: {
	value: OrderProductChoice;
	onChange: (value: OrderProductChoice) => void;
	disabled: boolean;
	rowNumber: number;
	id?: string;
	className?: string;
	productTypes?: Record<
		OrderProductChoice['type'],
		{ label: string; requiresMemorySize: boolean }
	>;
	memorySizes?: number[];
}) {
	const choices = ORDER_PRODUCT_TYPE_ORDER.filter(
		(type) => productTypes[type],
	).flatMap<OrderProductChoice>((type) =>
		productTypes[type].requiresMemorySize
			? [...memorySizes]
					.sort((a, b) => a - b)
					.map((memoryGb) => ({ type, memoryGb, requiresMemorySize: true }))
			: [{ type, memoryGb: null, requiresMemorySize: false }],
	);
	const key = (choice: OrderProductChoice) =>
		choice.requiresMemorySize
			? `${choice.type}:${choice.memoryGb}`
			: choice.type;
	return (
		<select
			id={id ?? `type-${rowNumber - 1}`}
			aria-label={`${rowNumber}. satır ürün ve bellek`}
			value={key(value)}
			disabled={disabled}
			className={`h-9 w-full min-w-0 rounded-lg border border-border bg-button-bg px-1.5 py-1 pe-6! text-xs text-text sm:h-auto sm:px-2 sm:py-1 sm:pe-7! sm:text-xs ${className}`}
			onChange={(event) => {
				const choice = choices.find((item) => key(item) === event.target.value);
				if (choice) onChange(choice);
			}}
		>
			{choices.map((choice) => (
				<option key={key(choice)} value={key(choice)}>
					{formatOrderProduct(choice)}
				</option>
			))}
		</select>
	);
}
