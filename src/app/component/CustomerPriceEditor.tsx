import { useEffect, useMemo, useRef, useState } from 'react';
import type { InventoryItemRecord } from '../types';
import {
	applyCustomerPrices,
	customerItemKey,
	customerPriceGroups,
	customerPriceLimit,
	parseCustomerPrice,
	pricedInventoryItems,
	validateCustomerPrice,
	downloadInventory,
	SPREADSHEET_EXPORT_FORMATS,
	type SpreadsheetExportFormat,
	type CustomerPrices,
} from '../helpers/inventoryPageHelpers/customerInventory.helper';
import { CustomerPriceInput } from './CustomerPriceInput';
import { Switch } from './admin/Switch';
import { useCustomerPriceRules } from '../hooks/useCustomerPriceRules';

export function CustomerPriceEditor({
	items,
	disabled = false,
}: {
	items: InventoryItemRecord[];
	disabled?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [includePrices, setIncludePrices] = useState(false);
	const [fileType, setFileType] = useState<'excel' | 'pdf'>('excel');
	const [extension, setExtension] = useState<SpreadsheetExportFormat>('xlsx');
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	const [exportPrices, setExportPrices] = useState<CustomerPrices>({});
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');
	const [exporting, setExporting] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const priceRules = useCustomerPriceRules(open && includePrices);
	const editingReady =
		!priceRules.isPending && !priceRules.isError && !priceRules.isFetching;
	const eligibleItems = useMemo(() => pricedInventoryItems(items), [items]);
	const groups = useMemo(
		() =>
			customerPriceGroups(eligibleItems, priceRules.data?.assignments ?? []),
		[eligibleItems, priceRules.data],
	);
	const types = [...new Set(groups.map((group) => group.type))];
	const format = fileType === 'pdf' ? 'pdf' : extension;
	const hasDrafts = Object.values(drafts).some((value) => value.trim() !== '');

	useEffect(() => {
		if (!open) return;
		const dialog = dialogRef.current;
		const trigger = triggerRef.current;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		dialog?.showModal();
		return () => {
			dialog?.close();
			document.body.style.overflow = previousOverflow;
			trigger?.focus();
		};
	}, [open]);

	function openEditor() {
		if (disabled) return;
		setDrafts({});
		setExportPrices({});
		setIncludePrices(false);
		setError('');
		setMessage('');
		setOpen(true);
	}
	function collectPrices(ids: string[]): CustomerPrices {
		const next = { ...exportPrices };
		for (const group of groups) {
			if (!ids.includes(group.id) || !drafts[group.id]?.trim()) continue;
			const price = parseCustomerPrice(drafts[group.id]);
			if (price === null) continue;
			validateCustomerPrice(price, group.items);
			for (const item of group.items) next[customerItemKey(item)] = price;
		}
		return next;
	}
	function apply(ids: string[]) {
		if (!includePrices || !editingReady) return;
		try {
			setExportPrices(collectPrices(ids));
			setDrafts((current) =>
				Object.fromEntries(
					Object.entries(current).filter(([id]) => !ids.includes(id)),
				),
			);
			setError('');
			setMessage('Fiyatlar yalnızca indirilecek dosya için hazırlandı.');
		} catch (error) {
			setError((error as Error).message);
			setMessage('');
		}
	}
	async function download() {
		if (disabled || exporting || !eligibleItems.length) return;
		setExporting(true);
		setError('');
		try {
			const prices = includePrices
				? collectPrices(groups.map((group) => group.id))
				: {};
			await downloadInventory(
				applyCustomerPrices(eligibleItems, prices),
				includePrices,
				format,
			);
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: 'Dosya oluşturulamadı. Lütfen tekrar deneyin.',
			);
		} finally {
			setExporting(false);
		}
	}

	return (
		<div className='text-text md:flex md:justify-end md:w-full'>
			<button
				ref={triggerRef}
				type='button'
				aria-haspopup='dialog'
				aria-expanded={open}
				disabled={disabled || !eligibleItems.length}
				onClick={openEditor}
				className='rounded-xl bg-button-bg px-4 py-2 text-sm font-medium hover:bg-button-hover-bg disabled:opacity-40'
			>
				Tüm envanteri indir
			</button>
			{open && (
				<dialog
					ref={dialogRef}
					aria-labelledby='customer-price-title'
					onCancel={(event) => {
						event.preventDefault();
						if (!exporting) setOpen(false);
					}}
					onClick={(event) => {
						if (event.target === event.currentTarget && !exporting)
							setOpen(false);
					}}
					className={`fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_1rem)] overflow-hidden rounded-xl bg-modal-bg p-0 text-text backdrop:bg-black/50 sm:w-[calc(100%_-_2rem)] sm:rounded-2xl ${includePrices ? 'max-w-6xl' : 'max-w-lg'}`}
				>
					<div className='flex max-h-[90dvh] min-h-0 flex-col'>
						<header className='flex shrink-0 items-center justify-between gap-2 border-b border-border p-2 sm:gap-3 sm:px-6 sm:py-4'>
							<h2
								id='customer-price-title'
								className='text-base font-semibold sm:text-lg'
							>
								Envanteri indir
							</h2>
							<button
								type='button'
								aria-label='Fiyat düzenleyiciyi kapat'
								disabled={exporting}
								onClick={() => setOpen(false)}
								className='rounded-lg bg-button-bg px-2 py-1.5 text-sm disabled:opacity-40 sm:px-3 sm:py-2'
							>
								Kapat
							</button>
						</header>
						<div className='min-h-0 space-y-3 overflow-y-auto p-2 sm:space-y-5 sm:p-6'>
							<section
								aria-label='İndirme seçenekleri'
								className='space-y-2 rounded-xl border border-border bg-button-bg/40 p-2 sm:space-y-4 sm:p-4'
							>
								<h3 className='text-sm font-semibold'>İndirme seçenekleri</h3>
								<label className='flex max-w-full flex-col gap-1 text-sm sm:max-w-xs sm:gap-2'>
									Dosya türü
									<select
										aria-label='Dosya türü'
										value={fileType}
										disabled={exporting}
										onChange={(event) =>
											setFileType(event.target.value as 'excel' | 'pdf')
										}
										className='w-full min-w-0 rounded-xl bg-button-bg px-2 py-1.5 sm:px-3 sm:py-2'
									>
										<option value='excel'>Excel</option>
										<option value='pdf'>PDF</option>
									</select>
								</label>
								{fileType === 'excel' && (
									<label className='flex max-w-full flex-col gap-1 text-sm sm:max-w-xs sm:gap-2'>
										Dosya uzantısı
										<select
											aria-label='Excel dosya uzantısı'
											value={extension}
											disabled={exporting}
											onChange={(event) =>
												setExtension(
													event.target.value as SpreadsheetExportFormat,
												)
											}
											className='w-full min-w-0 rounded-xl bg-button-bg px-2 py-1.5 sm:px-3 sm:py-2'
										>
											{SPREADSHEET_EXPORT_FORMATS.map((option) => (
												<option key={option.value} value={option.value}>
													{option.label}
												</option>
											))}
										</select>
									</label>
								)}
								<div className='space-y-1.5 border-t border-border pt-2 sm:space-y-2 sm:pt-4 [&_[role=switch][aria-checked=false]]:bg-neutral-400 dark:[&_[role=switch][aria-checked=false]]:bg-neutral-500'>
									<Switch
										checked={includePrices}
										onChange={(checked) => {
											setIncludePrices(checked);
											setError('');
										}}
										disabled={exporting}
										label='Fiyatları dahil et'
									/>
									<p className='text-xs opacity-70'>
										{includePrices
											? 'Fiyatları aşağıdan düzenleyebilir veya mevcut fiyatlarla indirebilirsiniz.'
											: 'Dosya fiyat sütunları olmadan indirilir.'}
									</p>
								</div>
							</section>
							{includePrices && priceRules.isFetching && (
								<p role='status' className='text-sm'>
									Özel fiyatlar yükleniyor...
								</p>
							)}
							{includePrices && priceRules.isError && (
								<div role='alert' className='text-sm text-red-500'>
									Özel fiyatlar yüklenemedi.{' '}
									<button
										type='button'
										onClick={() => void priceRules.refetch()}
										className='underline'
									>
										Tekrar dene
									</button>
								</div>
							)}
							{includePrices && editingReady && (
								<div className='space-y-3 sm:space-y-4'>
									<p className='text-sm opacity-75'>
										Fiyat değişiklikleri yalnızca indireceğiniz dosyada
										kullanılır; sayfadaki envanter değişmez. Boş bıraktığınız
										alanlarda mevcut fiyat korunur.
									</p>
									{(['regular', 'rules'] as const).map((kind) => (
										<section
											key={kind}
											aria-label={
												kind === 'rules' ? 'Özel fiyatlar' : 'Standart fiyatlar'
											}
											className='space-y-2 rounded-xl border border-border p-1.5 sm:space-y-3 sm:p-4'
										>
											<h3 className='font-semibold'>
												{kind === 'rules'
													? 'Özel fiyatlar'
													: 'Standart fiyatlar'}
											</h3>
											<div className='grid min-w-0 gap-2 sm:gap-4 xl:grid-cols-2'>
												{types
													.filter((type) =>
														groups.some(
															(group) =>
																group.type === type &&
																Boolean(group.ruleId) === (kind === 'rules'),
														),
													)
													.map((type) => (
														<div key={type} className='min-w-0'>
															<h4 className='mb-1 font-semibold sm:mb-2'>
																{type === 'EMMC'
																	? 'eMMC'
																	: type === 'EMCP'
																		? 'eMCP'
																		: type}
															</h4>
															<div className='overflow-x-auto'>
																<table className='w-full text-left text-xs sm:text-sm [&_td]:p-1 [&_th]:p-1 sm:[&_td]:p-2 sm:[&_th]:p-2'>
																	<thead>
																		<tr>
																			<th className='p-2'>Depolama</th>
																			<th className='p-2'>Fiyat</th>
																			<th className='p-2'>Yeni fiyat</th>
																			<th className='p-2'>İşlem</th>
																		</tr>
																	</thead>
																	<tbody>
																		{groups
																			.filter(
																				(group) =>
																					group.type === type &&
																					Boolean(group.ruleId) ===
																						(kind === 'rules'),
																			)
																			.map((group) => {
																				const current = applyCustomerPrices(
																					group.items,
																					exportPrices,
																				);
																				const common = current.every(
																					(item) =>
																						item.fiyat === current[0].fiyat,
																				);
																				return (
																					<tr
																						key={group.id}
																						className='border-t border-border'
																					>
																						<td className='p-2'>
																							{group.label}
																							{group.ruleName && (
																								<div className='text-xs font-medium text-amber-600 dark:text-amber-400'>
																									{group.ruleName}
																								</div>
																							)}
																							<div className='text-xs opacity-60'>
																								{group.items.length} ürün
																							</div>
																						</td>
																						<td className='p-2'>
																							{common
																								? current[0].fiyat
																								: 'Farklı fiyatlar'}{' '}
																							<span className='text-xs opacity-70'>
																								{group.currency}
																							</span>
																						</td>
																						<td className='p-2'>
																							<CustomerPriceInput
																								label={`${type} ${group.label} ${group.currency}${group.ruleName ? ` ${group.ruleName}` : ''} yeni fiyat`}
																								value={drafts[group.id] ?? ''}
																								limit={customerPriceLimit(
																									group.items,
																								)}
																								currency={group.currency}
																								disabled={exporting}
																								onChange={(change) => {
																									setDrafts((previous) => ({
																										...previous,
																										[group.id]:
																											typeof change ===
																											'function'
																												? change(
																														previous[
																															group.id
																														] ?? '',
																													)
																												: change,
																									}));
																									setError('');
																									setMessage('');
																								}}
																							/>
																						</td>
																						<td className='p-2'>
																							<button
																								type='button'
																								disabled={
																									exporting ||
																									!drafts[group.id]?.trim()
																								}
																								onClick={() =>
																									apply([group.id])
																								}
																								className='rounded bg-button-focus-bg px-2 py-1.5 disabled:opacity-40 sm:px-3 sm:py-2'
																							>
																								Uygula
																							</button>
																						</td>
																					</tr>
																				);
																			})}
																	</tbody>
																</table>
															</div>
														</div>
													))}
											</div>
											{!groups.some(
												(group) => Boolean(group.ruleId) === (kind === 'rules'),
											) && (
												<p className='text-xs opacity-60'>
													Bu grupta ürün yok.
												</p>
											)}
										</section>
									))}
									{message && (
										<p role='status' className='text-sm'>
											{message}
										</p>
									)}
									<div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
										<button
											type='button'
											disabled={
												exporting ||
												(!hasDrafts && !Object.keys(exportPrices).length)
											}
											onClick={() => {
												setDrafts({});
												setExportPrices({});
												setError('');
												setMessage('Dosya için orijinal fiyatlara dönüldü.');
											}}
											className='rounded bg-button-bg px-3 py-2 text-sm disabled:opacity-40'
										>
											Orijinal fiyatlara dön
										</button>
										<button
											type='button'
											disabled={exporting || !hasDrafts}
											onClick={() => apply(groups.map((group) => group.id))}
											className='rounded bg-button-focus-bg px-3 py-2 text-sm disabled:opacity-40'
										>
											Tüm fiyat değişikliklerini dosyaya uygula
										</button>
									</div>
								</div>
							)}
							{error && (
								<p role='alert' className='text-sm text-red-500'>
									{error}
								</p>
							)}
						</div>
						<footer className='flex shrink-0 flex-col gap-2 border-t border-border bg-modal-bg p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4'>
							<p className='text-xs opacity-70'>
								{eligibleItems.length} ürün · {format.toUpperCase()} ·{' '}
								{includePrices ? 'Fiyatlı' : 'Fiyatsız'}
							</p>
							<button
								type='button'
								disabled={
									disabled ||
									exporting ||
									!eligibleItems.length ||
									(includePrices && priceRules.isFetching)
								}
								onClick={() => void download()}
								className='w-full rounded-xl bg-text px-4 py-2.5 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-40 sm:w-auto sm:px-5 sm:py-3'
							>
								{exporting ? 'Dosya hazırlanıyor...' : 'Envanteri indir'}
							</button>
						</footer>
					</div>
				</dialog>
			)}
		</div>
	);
}
