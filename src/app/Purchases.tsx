import { AdminPageHeading } from './component/admin/AdminPageHeading';
import { TradeRows } from './component/admin/TradeRows';
import { usePurchaseDraft } from './hooks/usePurchaseDraft';
import {
	purchaseDraftKey,
	purchaseDraftSchema,
	type PurchaseDraft,
} from './helpers/purchaseDraft.helper';
import {
	purchaseChoices,
	purchaseChoiceKey,
} from './helpers/purchaseChoices.helper';
import {
	mergePurchaseInspection,
	warningInputKey,
	type WarningCache,
} from './helpers/purchaseWarnings.helper';
import {
	STOCK_BUTTON,
	STOCK_NUMBER_CONTROL,
	STOCK_STEPPER,
} from './constants/stockStyles.constant';
import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { NumberInputWithSteppers } from './component/NumberInputWithSteppers';
import { CreatedPurchasePdfModal } from './component/admin/CreatedPurchasePdfModal';
import { BayiPicker } from './component/admin/BayiPicker';
import { PurchaseProductSelect } from './component/admin/PurchaseProductSelect';
import { PURCHASE_PRODUCT_TYPES } from './constants/purchaseProducts.constant';
import { PAGE_PATHS } from './constants/pagePaths.constant';
import { usePurchaseWarnings } from './hooks/api/endpoints/useStock';
import { createPurchaseSchema } from './schemas/purchase.schema';

import {
	useCreatePurchase,
	usePurchasePricing,
	type Purchase,
	type PurchaseLine,
} from './hooks/api/endpoints/usePurchases';

type DraftLine = PurchaseDraft['lines'][number];
const money = (n: number) =>
	n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

const button = STOCK_BUTTON;
const initialLine = (
	id: number,
	type: PurchaseLine['type'] = 'EMCP',
): DraftLine => ({
	id,
	type,
	quantity: 1,
	memoryGb: PURCHASE_PRODUCT_TYPES[type].requiresMemorySize ? 8 : null,
	requiresMemorySize: PURCHASE_PRODUCT_TYPES[type].requiresMemorySize,
	quantityUnit: 'piece',
	unitPriceOverride: null,
	totalPriceOverride: null,
});

export default function PurchasesPage() {
	// A protected request verifies the session before displaying any order UI.
	const pricing = usePurchasePricing();
	const save = useCreatePurchase();
	const preferredUnit = (
		product: { type: DraftLine['type']; memoryGb: number | null },
		fallback: DraftLine['quantityUnit'] = 'piece',
	) =>
		pricing.data?.quantityUnits?.[product.type]?.[
			String(product.memoryGb)
		]?.[0] ?? fallback;
	const freshLine = (
		id: number,
		type: DraftLine['type'] = 'EMCP',
	): DraftLine => {
		const line = initialLine(id, type);
		return { ...line, quantityUnit: preferredUnit(line) };
	};
	const [warningCache, setWarningCache] = useState<WarningCache>({});
	const purchaseWarnings = usePurchaseWarnings((response, input) =>
		setWarningCache((current) =>
			mergePurchaseInspection(current, input, response),
		),
	);
	const submittingRef = useRef(false);
	const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const draft = usePurchaseDraft<PurchaseDraft>(
		pricing.data ? purchaseDraftKey('purchase') : null,
		purchaseDraftSchema,
		() => ({ lines: [freshLine(0)], nextId: 1, bayiId: '' }),
		'alış',
		pricing.isSuccess,
	);
	const { lines, nextId, bayiId } = draft.value;
	const comparisonDays = draft.value.comparisonDays ?? 30;
	const [comparisonInput, setComparisonInput] = useState<number | ''>(
		comparisonDays,
	);
	const [syncedComparison, setSyncedComparison] = useState(comparisonDays);
	if (syncedComparison !== comparisonDays) {
		setSyncedComparison(comparisonDays);
		setComparisonInput(comparisonDays);
	}
	const comparisonValid =
		typeof comparisonInput === 'number' &&
		Number.isInteger(comparisonInput) &&
		comparisonInput >= 1 &&
		comparisonInput <= 36500;
	const setLines = (action: SetStateAction<DraftLine[]>) =>
		draft.setValue((current) => ({
			...current,
			lines: typeof action === 'function' ? action(current.lines) : action,
		}));
	const setBayiId = (value: string) =>
		draft.setValue((current) => ({ ...current, bayiId: value }));
	const [createdPurchase, setCreatedPurchase] = useState<Purchase | null>(null);
	const prices = pricing.data?.prices;
	const productTypes = pricing.data?.productTypes ?? PURCHASE_PRODUCT_TYPES;
	const choices = purchaseChoices(productTypes, pricing.data?.memorySizes);
	const unusedChoice = choices.find(
		(choice) =>
			!lines.some(
				(line) => purchaseChoiceKey(line) === purchaseChoiceKey(choice),
			),
	);
	function addLine() {
		draft.setValue((current) => {
			const choice = choices.find(
				(candidate) =>
					!current.lines.some(
						(line) => purchaseChoiceKey(line) === purchaseChoiceKey(candidate),
					),
			);
			return choice
				? {
						...current,
						nextId: current.nextId + 1,
						lines: [
							...current.lines,
							{
								...initialLine(current.nextId, choice.type),
								...choice,
								quantityUnit: preferredUnit(choice),
							},
						],
					}
				: current;
		});
	}
	function addProductType(type: 'EMMC' | 'EMCP') {
		draft.setValue((current) => {
			const used = new Set(current.lines.map(purchaseChoiceKey));
			const additions = choices
				.filter(
					(choice) =>
						choice.type === type && !used.has(purchaseChoiceKey(choice)),
				)
				.map((choice, index) => ({
					...initialLine(current.nextId + index, type),
					...choice,
					quantityUnit: preferredUnit(choice),
				}));
			return additions.length
				? {
						...current,
						nextId: current.nextId + additions.length,
						lines: [...current.lines, ...additions],
					}
				: current;
		});
	}
	function resetRows() {
		draft.clear({
			lines: [freshLine(nextId)],
			nextId: nextId + 1,
			bayiId,
			comparisonDays,
		});
	}
	const listPrice = (line: DraftLine) =>
		line.memoryGb !== null
			? (pricing.data?.unitPrices?.[line.type]?.[String(line.memoryGb)]?.[
					line.quantityUnit
				] ??
				(line.quantityUnit === 'piece'
					? prices?.[line.type]?.[String(line.memoryGb)]
					: undefined))
			: undefined;
	const effectivePrice = (line: DraftLine) =>
		line.totalPriceOverride !== null
			? typeof line.totalPriceOverride === 'number' && Number(line.quantity) > 0
				? line.totalPriceOverride / Number(line.quantity)
				: undefined
			: line.unitPriceOverride === null
				? listPrice(line)
				: line.unitPriceOverride;
	const totals = lines.map((line) => {
		const price = effectivePrice(line);
		return typeof price === 'number' &&
			Number.isFinite(price) &&
			price >= 0 &&
			price <= 1_000_000 &&
			(line.quantityUnit !== 'piece' || Number.isSafeInteger(line.quantity)) &&
			Number.isFinite(Number(line.quantity)) &&
			Number(line.quantity) > 0 &&
			Number(line.quantity) <= 1_000_000
			? typeof line.totalPriceOverride === 'number'
				? line.totalPriceOverride
				: Math.round(price * Number(line.quantity) * 100) / 100
			: null;
	});
	const complete = lines.length > 0 && totals.every((n) => n !== null);
	const warningPayload = JSON.stringify({
		comparisonDays,
		bayiId,
		lines: lines.flatMap((line) => {
			const unitPrice = effectivePrice(line);
			return typeof unitPrice === 'number' &&
				Number.isFinite(unitPrice) &&
				unitPrice >= 0 &&
				unitPrice <= 1_000_000 &&
				Number(line.quantity) > 0
				? [
						{
							type: line.type,
							memoryGb: line.memoryGb,
							quantityUnit: line.quantityUnit,
							unitPrice: Math.round(unitPrice * 1000000) / 1000000,
							quantity: Number(line.quantity),
						},
					]
				: [];
		}),
	});
	const checkWarnings = purchaseWarnings.mutate;
	const warningEntries = (
		JSON.parse(warningPayload).lines as Parameters<typeof warningInputKey>[1][]
	).map((line) => warningCache[warningInputKey(bayiId, line, comparisonDays)]);
	const warningStatus = {
		risks: warningEntries.flatMap((entry) => (entry?.risk ? [entry.risk] : [])),
		missingPrices: warningEntries.flatMap((entry) =>
			entry?.missingPrice ? [entry.missingPrice] : [],
		),
	};
	useEffect(() => {
		if (
			!comparisonValid ||
			!/^[a-f\d]{24}$/i.test(bayiId) ||
			!JSON.parse(warningPayload).lines.length
		)
			return;
		const timer = setTimeout(
			() => checkWarnings(JSON.parse(warningPayload)),
			600,
		);
		warningTimerRef.current = timer;
		return () => clearTimeout(timer);
	}, [bayiId, warningPayload, checkWarnings, comparisonValid]);
	const total =
		Math.round(totals.reduce<number>((s, n) => s + (n ?? 0), 0) * 100) / 100;
	async function savePurchase() {
		if (submittingRef.current) return;
		if (!comparisonValid) {
			toast.error(
				'Karşılaştırma süresi 1–36500 gün arasında tam sayı olmalıdır.',
			);
			return;
		}
		const parsed = createPurchaseSchema.safeParse({
			comparisonDays,
			bayiId,
			lines: lines.map((line) => ({
				type: line.type,
				memoryGb: line.memoryGb,
				quantityUnit: line.quantityUnit,
				quantity: Number(line.quantity),
				...(typeof line.totalPriceOverride === 'number'
					? { totalPriceOverride: line.totalPriceOverride }
					: {}),
				...(line.totalPriceOverride === null &&
				typeof line.unitPriceOverride === 'number'
					? { unitPriceOverride: line.unitPriceOverride }
					: {}),
			})),
		});
		if (!parsed.success) {
			toast.error(parsed.error.issues[0].message);
			return;
		}
		submittingRef.current = true;
		if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
		try {
			await purchaseWarnings.mutateAsync(JSON.parse(warningPayload));
		} catch (failure) {
			submittingRef.current = false;
			toast.error('Alım fiyatı kontrol edilemedi', {
				description: (failure as Error).message,
			});
			return;
		}
		save.mutate(parsed.data, {
			onSettled: () => {
				submittingRef.current = false;
			},
			onSuccess: ({ order }) => {
				setCreatedPurchase(order);
				draft.clear({
					lines: [freshLine(nextId)],
					nextId: nextId + 1,
					comparisonDays,
					bayiId,
				});
				setWarningCache({});
				toast.success('Alış kaydedildi');
			},
			onError: (error) =>
				toast.error('Alış kaydedilemedi', { description: error.message }),
		});
	}
	if (pricing.isPending)
		return (
			<p className='p-6 text-text' role='status'>
				Oturum kontrol ediliyor...
			</p>
		);
	if (pricing.isError)
		return (
			<div className='p-6 text-text' role='alert'>
				<p>
					{pricing.error.status === 401
						? 'Devam etmek için giriş yapın.'
						: `Fiyatlar yüklenemedi: ${pricing.error.message}`}
				</p>
				<Link to={PAGE_PATHS.LOGIN} className='underline'>
					Giriş yap
				</Link>{' '}
				<button className={button} onClick={() => void pricing.refetch()}>
					Tekrar dene
				</button>
			</div>
		);
	return (
		<div className='mx-auto w-full min-w-0 max-w-7xl space-y-4 px-3 py-4 text-text sm:space-y-6 sm:px-6 sm:py-6'>
			{createdPurchase && (
				<CreatedPurchasePdfModal
					order={createdPurchase}
					onClose={() => setCreatedPurchase(null)}
				/>
			)}
			<AdminPageHeading title='Alış' />
			<section
				className='min-w-0 rounded-2xl border border-border p-3 sm:p-6'
				aria-labelledby='new-order'
			>
				<h2 id='new-order' className='mb-4 text-lg font-semibold'>
					Yeni alış
				</h2>
				<BayiPicker
					allowCreate
					value={bayiId}
					onChange={setBayiId}
					disabled={save.isPending}
				/>
				<label className='mb-3 flex flex-wrap items-center gap-2 text-xs'>
					Zarar kontrolü · son kaç günün satışları?
					<NumberInputWithSteppers
						id='purchase-comparison-days'
						ariaLabel='Satış karşılaştırma süresi (gün)'
						disableWheel
						value={comparisonInput}
						steppers={[
							{ amount: 1, label: '+1' },
							{ amount: 7, label: '+7' },
						]}
						onChange={(change) => {
							const next =
								typeof change === 'function' ? change(comparisonInput) : change;
							setComparisonInput(next);
							if (
								typeof next === 'number' &&
								Number.isInteger(next) &&
								next >= 1 &&
								next <= 36500
							)
								draft.setValue((current) => ({
									...current,
									comparisonDays: next,
								}));
						}}
						className={STOCK_NUMBER_CONTROL}
						stepperClassName={STOCK_STEPPER}
					/>
					<span>gün (1–36500)</span>
				</label>
				{!comparisonValid && (
					<p role='alert' className='mb-3 text-xs text-red-500'>
						1–36500 arasında tam gün sayısı girin.
					</p>
				)}

				{Boolean(warningStatus?.missingPrices?.length) && (
					<p role='status' className='mb-3 text-xs text-text/70'>
						Son {comparisonDays} günde satış olmadığı için zarar kontrolü
						yapılamıyor: {warningStatus!.missingPrices!.join(', ')}. Yalnızca bu
						dönemdeki satışların ağırlıklı ortalama fiyatı kullanılır.
					</p>
				)}
				{purchaseWarnings.isError && (
					<p role='alert' className='mb-3 text-sm text-red-500'>
						Alış fiyatı kontrol edilemedi: {purchaseWarnings.error.message}.
						Kaydederken tekrar kontrol edilecek.
					</p>
				)}
				<TradeRows
					lines={lines}
					disabled={save.isPending}
					onRemove={(id) =>
						setLines((current) => current.filter((row) => row.id !== id))
					}
					onAdd={addLine}
					canAdd={Boolean(unusedChoice)}
					totals={totals}
					listPrice={listPrice}
					effectivePrice={effectivePrice}
					onUpdate={(id, patch) =>
						setLines((current) =>
							current.map((row) =>
								row.id === id
									? {
											...row,
											...patch,
											...(patch.quantityUnit
												? {
														unitPriceOverride: null,
														totalPriceOverride: null,
														quantity:
															patch.quantityUnit === 'piece' &&
															!Number.isInteger(row.quantity)
																? 1
																: row.quantity,
													}
												: {}),
										}
									: row,
							),
						)
					}
					productInput={(line, index) => (
						<PurchaseProductSelect
							onSelectType={addProductType}
							className='h-9!'
							value={line}
							rowNumber={index + 1}
							id={'type-' + line.id}
							disabled={save.isPending}
							productTypes={productTypes}
							memorySizes={pricing.data?.memorySizes}
							excluded={lines.filter((row) => row.id !== line.id)}
							onChange={(product) =>
								setLines((current) =>
									current.map((row) =>
										row.id === line.id
											? {
													...row,
													...product,
													quantityUnit: preferredUnit(
														product,
														product.requiresMemorySize
															? 'piece'
															: row.quantityUnit,
													),
													quantity:
														preferredUnit(
															product,
															product.requiresMemorySize
																? 'piece'
																: row.quantityUnit,
														) === 'piece' && !Number.isInteger(row.quantity)
															? 1
															: row.quantity,
													unitPriceOverride: null,
													totalPriceOverride: null,
												}
											: row,
									),
								)
							}
						/>
					)}
				/>
				{Boolean(warningStatus?.risks?.length) && (
					<div
						role='status'
						className='mb-3 space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
					>
						<p className='font-medium'>Alış fiyatında zarar riski</p>
						{warningStatus!.risks!.map((risk) => (
							<p key={risk.productKey}>{risk.message}</p>
						))}
						<p className='text-xs'>
							Bildirim bu alım döngüsünde bir kez gösterilir. Risk, fiyatlar
							düzeltilene kadar burada görünür.
						</p>
					</div>
				)}

				<div className='mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-button-bg p-3 font-semibold text-text'>
					<span>Genel toplam</span>
					<span aria-live='polite' className='break-all text-lg tabular-nums'>
						{complete ? money(total) : 'Eksik bilgi'}
					</span>
				</div>

				<div className='mt-4 flex flex-wrap items-center gap-3'>
					<button
						className={`${button} font-semibold`}
						disabled={
							!comparisonValid ||
							!complete ||
							!bayiId ||
							save.isPending ||
							purchaseWarnings.isPending
						}
						onClick={savePurchase}
					>
						{save.isPending ? 'Kaydediliyor...' : 'Alışı kaydet'}
					</button>
					<button
						type='button'
						className={`${button} ml-auto`}
						disabled={save.isPending}
						onClick={resetRows}
					>
						Satırları sıfırla
					</button>
				</div>
				{save.error && (
					<p role='alert' className='mt-3 text-red-500'>
						{save.error.message}
					</p>
				)}
			</section>
			<Link className={button} to={PAGE_PATHS.ANALYSIS + '?preset=purchases'}>
				Alış geçmişi ve raporlar · Analiz
			</Link>
		</div>
	);
}
