import { Link } from 'react-router';
import {
	CalendarDays,
	ShoppingCart,
	ArrowUpFromLine,
	ExternalLink,
} from 'lucide-react';
import type {
	StockActivity,
	StockResponse,
} from '../../hooks/api/endpoints/useStock';
import { PAGE_PATHS } from '../../constants/pagePaths.constant';
import { AdminSummary } from './AdminCollapseHeading';
import { PartyName } from './PartyName';
import { StockProductTag, StockQuantity } from './StockDisplay';
import { Pagination } from './Pagination';

const money = (value: number) =>
	value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
const number = (value: number) =>
	value.toLocaleString('tr-TR', { maximumFractionDigits: 6 });
const dayOf = (date: string) =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Europe/Istanbul',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(new Date(date));
const sourcePurchaseHref = (id: string) =>
	`${PAGE_PATHS.ANALYSIS}?preset=purchases&purchaseId=${encodeURIComponent(id)}`;
export function StockMovementHistory({
	data,
	page,
	pageSize,
	onPageChange,
	onPageSizeChange,
	saleSelection,
}: {
	data: StockResponse;
	saleSelection?: { excludedIds: string[]; onToggle: (id: string) => void };
	page: number;
	pageSize: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
}) {
	const activities: StockActivity[] =
		data.activities ??
		(data.movements ?? []).map((row) => ({
			id: row.id,
			kind: row.kind,
			createdAt: row.createdAt,
			date: dayOf(row.createdAt),
			lines: [row],
		}));
	const days = new Map<string, StockActivity[]>();
	for (const activity of activities)
		days.set(activity.date, [...(days.get(activity.date) ?? []), activity]);
	return (
		<div
			className='min-w-0 max-w-full space-y-3 [overflow-wrap:anywhere] [&_svg]:shrink-0'
			aria-label='Günlere göre alış ve satış hareketleri'
		>
			{!activities.length && (
				<p className='text-sm text-text/70'>
					Filtrelere uygun stok hareketi yok.
				</p>
			)}
			{[...days].map(([date, entries], index) => {
				const full = data.dailyMovementTotals?.find((day) => day.date === date);
				const lines = entries.flatMap((entry) => entry.lines);
				const purchase =
					full?.purchaseCost ??
					lines.reduce(
						(sum, row) =>
							sum + (row.kind === 'purchase' ? row.purchaseCost : 0),
						0,
					);
				const revenue =
					full?.revenue ??
					lines.reduce((sum, row) => sum + (row.revenue ?? 0), 0);
				const profit =
					full?.profit ??
					lines.reduce((sum, row) => sum + (row.profit ?? 0), 0);
				return (
					<details
						open
						key={date}
						className='min-w-0 space-y-3 rounded-xl border border-border p-2 sm:p-3'
					>
						<AdminSummary
							index={index}
							className='flex-wrap items-start sm:items-center'
						>
							<CalendarDays size={16} aria-hidden />
							<span className='min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-auto'>
								{new Date(`${date}T12:00:00+03:00`).toLocaleDateString(
									'tr-TR',
									{ dateStyle: 'long', timeZone: 'Europe/Istanbul' },
								)}
								<span className='mt-1 block text-xs font-normal'>
									{full?.count ?? entries.length} işlem · Filtrelenen gün
									toplamı
								</span>
							</span>
							<span className='flex w-full min-w-0 flex-wrap gap-2 text-xs sm:w-auto'>
								<span className='stock-value stock-cost rounded-full px-2 py-1'>
									Alış: {money(purchase)}
								</span>
								<span className='stock-value stock-income rounded-full px-2 py-1'>
									Satış: {money(revenue)}
								</span>
								<span
									className={
										'stock-value rounded-full px-2 py-1 ' +
										(profit < 0 ? 'stock-loss' : 'stock-income')
									}
								>
									Kâr: {money(profit)}
								</span>
							</span>
						</AdminSummary>
						{entries.map((activity, entryIndex) => (
							<details
								key={activity.id}
								className='min-w-0 space-y-3 rounded-lg border border-border p-2'
							>
								<AdminSummary
									index={entryIndex}
									className='flex-wrap items-start sm:items-center'
								>
									{saleSelection && activity.kind !== 'purchase' && (
										<input
											type='checkbox'
											aria-label={'Satışı rapora dahil et ' + activity.id}
											checked={
												!saleSelection.excludedIds.includes(
													activity.lines[0]?.operationId ??
														activity.id.replace(/^sale:/, ''),
												)
											}
											onClick={(event) => event.stopPropagation()}
											onChange={() =>
												saleSelection.onToggle(
													activity.lines[0]?.operationId ??
														activity.id.replace(/^sale:/, ''),
												)
											}
										/>
									)}

									{activity.kind === 'purchase' ? (
										<ShoppingCart size={16} aria-hidden />
									) : (
										<ArrowUpFromLine size={16} aria-hidden />
									)}
									<span className='min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-auto'>
										{activity.kind === 'purchase'
											? 'Alış / stok girişi'
											: activity.kind === 'partial'
												? 'Kısmi satış'
												: 'Stok sifirlayan satış'}
										<span className='mt-1 block text-xs font-normal text-text/70 sm:ml-2 sm:mt-0 sm:inline'>
											{new Date(activity.createdAt).toLocaleTimeString(
												'tr-TR',
												{
													hour: '2-digit',
													minute: '2-digit',
													timeZone: 'Europe/Istanbul',
												},
											)}{' '}
											· {activity.lines.length} ürün satırı
										</span>
									</span>
									<span className='w-full min-w-0 break-words text-sm tabular-nums sm:w-auto'>
										{money(
											activity.lines.reduce(
												(sum, row) =>
													sum +
													(activity.kind === 'purchase'
														? row.purchaseCost
														: (row.revenue ?? 0)),
												0,
											),
										)}
									</span>
								</AdminSummary>
								{activity.lines.map((row) => (
									<div
										key={row.id}
										className='min-w-0 max-w-full space-y-2 rounded-lg border border-border p-2 text-sm sm:p-3'
									>
										<div className='flex flex-wrap items-center gap-2'>
											<StockProductTag
												type={row.type}
												memoryGb={row.memoryGb}
											/>
											<StockQuantity
												value={number(row.quantity)}
												unit={
													row.quantityUnit === 'piece'
														? 'adet'
														: row.quantityUnit
												}
											/>
											{row.bayiName && (
												<PartyName
													label='Bayi'
													name={row.bayiName}
													currentName={row.currentBayiName}
												/>
											)}
										</div>
										<div className='grid min-w-0 grid-cols-1 gap-2 text-xs sm:flex sm:flex-wrap sm:gap-3'>
											<span className='stock-value stock-cost'>
												Alış maliyeti: {money(row.purchaseCost)}
											</span>
											{row.revenue !== null && (
												<>
													<span className='stock-value stock-income'>
														Satış geliri: {money(row.revenue)}
													</span>
													<span
														className={
															'stock-value ' +
															((row.profit ?? 0) < 0
																? 'stock-loss'
																: 'stock-income')
														}
													>
														Kâr: {money(row.profit ?? 0)}
													</span>
												</>
											)}
										</div>
										{row.orderId && (
											<Link
												className='inline-flex min-w-0 max-w-full flex-wrap items-center gap-1 text-xs font-medium underline'
												to={sourcePurchaseHref(row.orderId)}
											>
												<ExternalLink size={13} aria-hidden />
												Alış kaydını aç · #{row.orderId.slice(-6)}
											</Link>
										)}
										{row.suppliers?.map((supplier, supplierIndex) => {
											const sources = new Map<string, number>();
											for (const source of supplier.sourcePurchases ?? [])
												sources.set(
													source.orderId,
													(sources.get(source.orderId) ?? 0) + source.quantity,
												);
											return (
												<details
													key={supplier.bayiId ?? supplier.bayiName}
													className='min-w-0 max-w-full space-y-2 rounded-lg border stock-value stock-dealer p-2'
												>
													<AdminSummary
														index={supplierIndex}
														className='flex-wrap items-start sm:items-center'
													>
														<span className='min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-auto'>
															<PartyName
																label='Bayi'
																name={supplier.bayiName}
																currentName={supplier.currentBayiName}
															/>
														</span>
														<StockQuantity
															value={number(supplier.quantity)}
															unit={
																row.quantityUnit === 'piece'
																	? 'adet'
																	: row.quantityUnit
															}
														/>
													</AdminSummary>
													<p className='grid min-w-0 grid-cols-1 gap-2 px-2 text-xs sm:flex sm:flex-wrap sm:gap-3'>
														<span>Gelir: {money(supplier.revenue)}</span>
														<span>Maliyet: {money(supplier.costOfGoods)}</span>
														<span>
															Kâr:{' '}
															{money(supplier.revenue - supplier.costOfGoods)}
														</span>
													</p>
													<ul className='space-y-1 px-2 text-xs'>
														{[...sources].map(([id, quantity]) => (
															<li key={id}>
																<Link
																	className='inline-flex min-w-0 max-w-full flex-wrap items-center gap-1 font-medium underline'
																	to={sourcePurchaseHref(id)}
																>
																	<ExternalLink size={13} aria-hidden />
																	Kaynak alış #{id.slice(-6)} ·{' '}
																	{number(quantity)}{' '}
																	{row.quantityUnit === 'piece'
																		? 'adet'
																		: row.quantityUnit}
																</Link>
															</li>
														))}
													</ul>
												</details>
											);
										})}
									</div>
								))}
							</details>
						))}
					</details>
				);
			})}
			<Pagination
				hideNavWhenSinglePage
				page={page}
				totalPages={data.activityPages ?? data.movementPages ?? 1}
				pageSize={pageSize}
				onPageChange={onPageChange}
				onPageSizeChange={onPageSizeChange}
				summary={`${data.activityCount ?? data.movementCount ?? 0} alış / satış işlemi`}
			/>
		</div>
	);
}
