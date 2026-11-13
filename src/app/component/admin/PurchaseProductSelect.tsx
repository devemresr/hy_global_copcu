import {
	PURCHASE_MEMORY_SIZES,
	PURCHASE_PRODUCT_TYPES,
} from '../../constants/purchaseProducts.constant';
import { formatPurchaseProduct } from '../../helpers/purchaseProduct.helper';
import {
	purchaseChoices,
	purchaseChoiceKey,
} from '../../helpers/purchaseChoices.helper';

export type PurchaseProductChoice = {
	type: keyof typeof PURCHASE_PRODUCT_TYPES;
	memoryGb: number | null;
	requiresMemorySize: boolean;
};
export function PurchaseProductSelect({
	value,
	onChange,
	disabled,
	rowNumber,
	id,
	className = '',
	productTypes = PURCHASE_PRODUCT_TYPES,
	memorySizes = [...PURCHASE_MEMORY_SIZES],
	excluded = [],
	requiresMemorySize,
	onSelectType,
}: {
	value: PurchaseProductChoice;
	onChange: (value: PurchaseProductChoice) => void;
	disabled: boolean;
	rowNumber: number;
	id?: string;
	className?: string;
	productTypes?: Record<
		PurchaseProductChoice['type'],
		{ label: string; requiresMemorySize: boolean }
	>;
	memorySizes?: number[];
	excluded?: PurchaseProductChoice[];
	requiresMemorySize?: boolean;
	onSelectType?: (type: 'EMMC' | 'EMCP') => void;
}) {
	const used = new Set(excluded.map(purchaseChoiceKey));
	const choices = purchaseChoices(productTypes, memorySizes).filter(
		(choice) =>
			(requiresMemorySize === undefined ||
				choice.requiresMemorySize === requiresMemorySize) &&
			(purchaseChoiceKey(choice) === purchaseChoiceKey(value) ||
				!used.has(purchaseChoiceKey(choice))),
	);
	const key = (choice: PurchaseProductChoice) =>
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
				if (
					event.target.value === 'all:EMMC' ||
					event.target.value === 'all:EMCP'
				) {
					onSelectType?.(event.target.value === 'all:EMMC' ? 'EMMC' : 'EMCP');
					return;
				}
				const choice = choices.find((item) => key(item) === event.target.value);
				if (choice) onChange(choice);
			}}
		>
			{onSelectType &&
				(['EMMC', 'EMCP'] as const)
					.filter(
						(type) =>
							productTypes[type]?.requiresMemorySize &&
							requiresMemorySize !== false,
					)
					.map((type) => (
						<option
							key={type}
							value={'all:' + type}
							disabled={
								!choices.some(
									(choice) =>
										choice.type === type &&
										!used.has(purchaseChoiceKey(choice)) &&
										purchaseChoiceKey(choice) !== purchaseChoiceKey(value),
								)
							}
						>
							Tüm {productTypes[type].label}
						</option>
					))}
			{choices.map((choice) => (
				<option key={key(choice)} value={key(choice)}>
					{formatPurchaseProduct(choice)}
				</option>
			))}
		</select>
	);
}
