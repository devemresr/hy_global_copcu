import type {
	FinanceFilters,
	FinanceCategory,
	FinanceGroup,
} from '../../hooks/api/endpoints/useFinance';
import { STOCK_CONTROL } from '../../constants/stockStyles.constant';
const groups = {
	purchase: 'Mal alış',
	other: 'Elle eklenen gider',
	sale: 'Satış',
	investment: 'Elle eklenen gelir',
};

export function FinanceReportFields({
	filters,
	categories,
	onChange,
}: {
	filters: FinanceFilters;
	categories: FinanceCategory[];
	onChange: (filters: FinanceFilters) => void;
}) {
	function change(next: FinanceFilters) {
		const group =
			next.group ??
			categories.find((category) => category._id === next.categoryId)?.group;
		const direction =
			next.direction ??
			(group
				? ['purchase', 'other'].includes(group)
					? 'expense'
					: 'income'
				: undefined);
		onChange({
			...next,
			...(direction === 'expense' ? { investorId: undefined } : {}),
			...(direction === 'income'
				? { bayiId: undefined, bayiIds: undefined, bayiName: undefined }
				: {}),
		});
	}
	return (
		<div className='flex flex-wrap items-end gap-3'>
			<label className='space-y-1 text-xs'>
				Ana tür
				<select
					aria-label='Bakiye ana tür filtresi'
					className={`${STOCK_CONTROL} w-auto!`}
					value={filters.direction ?? ''}
					onChange={(event) =>
						change({
							...filters,
							direction:
								(event.target.value as FinanceFilters['direction']) ||
								undefined,
							group: undefined,
							categoryId: undefined,
						})
					}
				>
					<option value=''>Tüm hareketler</option>
					<option value='expense'>Gider</option>
					<option value='income'>Gelir</option>
				</select>
			</label>
			<label className='space-y-1 text-xs'>
				İşlem kaynağı
				<select
					aria-label='Bakiye işlem kaynağı filtresi'
					className={`${STOCK_CONTROL} w-auto!`}
					value={filters.group ?? ''}
					onChange={(event) =>
						change({
							...filters,
							group: (event.target.value as FinanceGroup) || undefined,
							categoryId: undefined,
						})
					}
				>
					<option value=''>Tüm türler</option>
					{Object.entries(groups)
						.filter(
							([key]) =>
								!filters.direction ||
								(filters.direction === 'expense'
									? ['purchase', 'other'].includes(key)
									: ['sale', 'investment'].includes(key)),
						)
						.map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
				</select>
			</label>
			<label className='space-y-1 text-xs'>
				Alt tür
				<select
					aria-label='Bakiye alt tür filtresi'
					className={`${STOCK_CONTROL} w-auto! max-w-56`}
					value={filters.categoryId ?? ''}
					onChange={(event) =>
						change({
							...filters,
							categoryId: event.target.value || undefined,
						})
					}
				>
					<option value=''>Tüm alt türler</option>
					{categories
						.filter(
							(category) =>
								(!filters.group || category.group === filters.group) &&
								(!filters.direction ||
									(filters.direction === 'expense'
										? ['purchase', 'other'].includes(category.group)
										: ['sale', 'investment'].includes(category.group))),
						)
						.map((category) => (
							<option key={category._id} value={category._id}>
								{groups[category.group]} · {category.name}
							</option>
						))}
				</select>
			</label>
		</div>
	);
}
