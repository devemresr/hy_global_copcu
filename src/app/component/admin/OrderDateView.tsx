import { AdminSummary } from './AdminCollapseHeading';
import { formatOrderUnitTotals } from '../../helpers/orderProduct.helper';
import { useMemo, useState } from 'react';
import {
	formatOrderMoney,
	type OrderDateViewType,
} from '../../constants/orderReports.constant';
import {
	calendarDays,
	groupOrdersByDate,
	orderDateLabel,
	type DatedOrder,
} from '../../helpers/orderDateGroups.helper';
import { istanbulToday } from '../../helpers/orderPeriod.helper';
import { OrderChartTable } from './OrderChartTable';
import { Pagination } from './Pagination';

const control =
	'max-w-full rounded-lg border border-border bg-button-bg px-2 py-1.5 text-sm text-text';

export function OrderDateView({
	orders,
	value,
}: {
	orders: DatedOrder[];
	value: OrderDateViewType;
}) {
	const groups = useMemo(() => groupOrdersByDate(orders), [orders]);
	const months = [...new Set(groups.map((group) => group.date.slice(0, 7)))];
	const [chosenMonth, setChosenMonth] = useState('');
	const month = months.includes(chosenMonth)
		? chosenMonth
		: (months.at(-1) ?? istanbulToday().slice(0, 7));
	const [chosenDay, setChosenDay] = useState('');
	const day =
		chosenDay.startsWith(month) &&
		groups.some((group) => group.date === chosenDay)
			? chosenDay
			: groups.findLast((group) => group.date.startsWith(month))?.date;
	const selectedGroup = groups.find((group) => group.date === day);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const pageCount = Math.max(1, Math.ceil(groups.length / pageSize));
	const currentPage = Math.min(page, pageCount);
	const calendar = calendarDays(month);
	return (
		<div className='min-w-0 max-w-full space-y-3'>
			{value === 'calendar' && (
				<>
					<label className='flex flex-wrap items-center gap-2 text-sm'>
						Ay
						<select
							aria-label='Takvim ayı'
							value={month}
							className={control}
							onChange={(event) => setChosenMonth(event.target.value)}
						>
							{(months.length ? months : [month]).map((item) => (
								<option key={item} value={item}>
									{new Date(`${item}-01T12:00:00Z`).toLocaleDateString(
										'tr-TR',
										{
											year: 'numeric',
											month: 'long',
											timeZone: 'Europe/Istanbul',
										},
									)}
								</option>
							))}
						</select>
					</label>
					<div className='grid min-w-0 grid-cols-7 gap-1 text-center'>
						{['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((name) => (
							<span
								key={name}
								className='py-1 text-[10px] opacity-70 sm:text-xs'
							>
								{name}
							</span>
						))}
						{Array.from({ length: calendar.offset }, (_, index) => (
							<span key={`empty-${index}`} aria-hidden='true' />
						))}
						{calendar.dates.map((date) => {
							const group = groups.find((item) => item.date === date);
							return (
								<button
									key={date}
									type='button'
									disabled={!group}
									aria-pressed={day === date}
									aria-label={`${orderDateLabel(date)}: ${group?.orders.length ?? 0} alış, ${formatOrderMoney(group?.total ?? 0)}`}
									title={formatOrderMoney(group?.total ?? 0)}
									onClick={() => setChosenDay(date)}
									className={`flex min-h-20 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border px-0.5 py-2 text-[10px] sm:min-h-24 sm:text-xs ${day === date ? 'border-neutral-500 bg-neutral-900 text-white dark:bg-black' : 'border-border bg-button-bg/40 disabled:opacity-40'}`}
								>
									<span className='font-semibold'>
										{Number(date.slice(-2))}
									</span>
									<span>{group?.orders.length ?? 0} sip.</span>
									<span className='max-w-full truncate text-[9px] tabular-nums sm:text-xs'>
										{group
											? `${group.total.toLocaleString('tr-TR', { notation: 'compact', maximumFractionDigits: 1 })} ₺`
											: '—'}
									</span>
								</button>
							);
						})}
					</div>
					{selectedGroup && (
						<OrderChartTable
							title={`${orderDateLabel(selectedGroup.date)} · ${formatOrderMoney(selectedGroup.total)}`}
							headers={['Alış', 'Miktar', 'Tutar']}
							rows={selectedGroup.orders.map((order) => [
								order.name || order._id,
								formatOrderUnitTotals(order),
								formatOrderMoney(order.total),
							])}
						/>
					)}
				</>
			)}
			{value === 'list' && (
				<div className='space-y-2'>
					{groups
						.slice((currentPage - 1) * pageSize, currentPage * pageSize)
						.map((group, index) => (
							<details
								key={group.date}
								className='min-w-0 rounded-lg border border-border p-2'
							>
								<AdminSummary index={index}>
									{orderDateLabel(group.date)} · {group.orders.length} alış ·{' '}
									{formatOrderMoney(group.total)}
								</AdminSummary>
								<OrderChartTable
									title={orderDateLabel(group.date)}
									headers={['Alış', 'Miktar', 'Tutar']}
									rows={group.orders.map((order) => [
										order.name || order._id,
										formatOrderUnitTotals(order),
										formatOrderMoney(order.total),
									])}
								/>
							</details>
						))}
				</div>
			)}
			{value !== 'calendar' && (
				<Pagination
					page={currentPage}
					totalPages={pageCount}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={(size) => {
						setPageSize(size);
						setPage(1);
					}}
					hideNavWhenSinglePage
					summary={`${groups.length} tarih`}
				/>
			)}
		</div>
	);
}
