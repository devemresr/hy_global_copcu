import './App.css';

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useInventoryRows } from './hooks/useInventoryRows';
import { InventoryBrowser, type InventoryBrowserHandle } from './component/InventoryBrowser';
import {
	ArrowDown,
	ArrowUp,
	ArrowRight,
	Coins,
	Search,
	ShieldCheck,
	SquareArrowOutUpRight,
	Truck,
	Wallet,
	ScanSearch,
	TriangleAlert,
} from 'lucide-react';
import { useGetItems, useItemsSnapshot } from './hooks/api/endpoints/useItems';
import { inventoryPageContent } from './constants/inventoryPageContent.constant';
import { isDisplayedBellekTipi } from './constants/bellekTipi.constant';
import { whatsappUrl } from './constants/url.constant';
import WhatsappIcon from './assets/icons/icons8-whatsapp.svg?react';

function getInitialTheme(): 'light' | 'dark' {
	const saved = localStorage.getItem('theme');
	return saved === 'light' || saved === 'dark'
		? saved
		: window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light';
}

const STEP_ICONS = [ScanSearch, Search, Coins];
const WHY_US_ICONS = [ShieldCheck, Wallet, Truck];
// Same link look as the steps on the Kaynaklar page (Explanation.tsx).
const STEP_LINK_CLASS =
	'mt-1 inline-block cursor-pointer text-left underline underline-offset-2 font-medium hover:opacity-80 transition-opacity text-text text-sm';

function SnapshotWarning({ exportedAt }: { exportedAt: string }) {
	const date = new Date(exportedAt).toLocaleDateString('tr-TR', { dateStyle: 'long' });
	return (
		<div
			role='status'
			className='mb-3 flex items-start gap-3 rounded-xl border border-border bg-button-bg p-4 text-sm text-text'
		>
			<TriangleAlert className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' aria-hidden />
			<p>
				Sunucuya şu an ulaşılamıyor. Aşağıdaki liste {date} tarihli bir kopyadır;
				ürünler ve fiyatlar güncel olmayabilir.
			</p>
		</div>
	);
}

function InventoryPage() {
	// const bellekTipiIncluded = searchParams.has('detayliData');
	const bellekTipiIncluded = true;

	const { data, failureCount } = useGetItems();
	const { data: snapshot } = useItemsSnapshot(!data && failureCount > 0);
	// Live data replaces the snapshot as soon as a later refetch succeeds.
	const showingSnapshot = !data && !!snapshot;
	const items = data?.items ?? snapshot?.items;
	const displayedItems = useMemo(
		() => (items ?? []).filter((item) => isDisplayedBellekTipi(item.bellekTipi)),
		[items],
	);
	const { rows, colDef } = useInventoryRows(bellekTipiIncluded, displayedItems);
	const { hero, stepsHeading, steps, whyUs, contact } = inventoryPageContent;
	const browserRef = useRef<InventoryBrowserHandle>(null);

	useLayoutEffect(() => {
		const theme = getInitialTheme();
		document.documentElement.classList.toggle('dark', theme === 'dark');
	}, []);

	return (
		<div className=' mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 '>
			<section className='pt-8 pb-6 md:pt-12'>
				<h1 className='text-2xl font-bold text-heading-text md:text-3xl'>
					{hero.heading}
				</h1>
				<p className='mt-3 max-w-3xl text-text opacity-80 md:text-lg'>{hero.body}</p>
				<div className='mt-5 flex flex-wrap gap-3'>
					<a
						href={hero.primaryCta.href}
						className='inline-flex items-center gap-2 rounded-xl bg-text px-4 py-2 font-medium text-bg hover:opacity-90'
					>
						{hero.primaryCta.label}
						<ArrowRight className='h-4 w-4' />
					</a>
					<a
						href={hero.secondaryCta.href}
						className='rounded-xl bg-button-bg px-4 py-2 font-medium text-text hover:bg-button-hover-bg'
					>
						{hero.secondaryCta.label}
					</a>
				</div>
			</section>

			{/* Steps sit below the grid on mobile, above it from sm up. */}
			<div className='flex flex-col'>
				<section className='order-last mt-6 sm:order-first sm:mt-0 sm:mb-6'>
					<h2 className='mb-4 text-xl font-semibold text-heading-text sm:hidden'>{stepsHeading}</h2>
					<ol className='grid gap-3 sm:grid-cols-3'>
						{steps.map((step, i) => {
							const Icon = STEP_ICONS[i];
							return (
								<li key={step.title} className='flex gap-3 rounded-xl bg-button-bg p-4'>
									<span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-button-focus-bg text-text'>
										<Icon className='h-4 w-4' aria-hidden />
									</span>
									<div>
										<p className='font-semibold text-text'>
											{i + 1}. {step.title}
										</p>
										{step.mobileText ? (
											<>
												<p className='text-sm text-text opacity-75 sm:hidden'>{step.mobileText}</p>
												<p className='hidden text-sm text-text opacity-75 sm:block'>{step.text}</p>
											</>
										) : (
											<p className='text-sm text-text opacity-75'>{step.text}</p>
										)}
										{step.link.href ? (
											<a href={step.link.href} className={STEP_LINK_CLASS}>
												{step.link.label}
												<SquareArrowOutUpRight className='inline-block w-4 h-4 ml-1 -mt-0.5' />
											</a>
										) : (
											<button
												type='button'
												onClick={() => browserRef.current?.focusSearch()}
												className={STEP_LINK_CLASS}
											>
												{step.link.label}
												{/* The search box sits above the steps on mobile, below them from sm up. */}
												<ArrowUp className='inline-block w-4 h-4 ml-1 -mt-0.5 sm:hidden' />
												<ArrowDown className='hidden w-4 h-4 ml-1 -mt-0.5 sm:inline-block' />
											</button>
										)}
									</div>
								</li>
							);
						})}
					</ol>
				</section>

				<div>
					{showingSnapshot && <SnapshotWarning exportedAt={snapshot.exportedAt} />}
					<InventoryBrowser ref={browserRef} rows={rows} colDef={colDef} />
				</div>
			</div>

			<section className='mt-12'>
				<h2 className='mb-4 text-xl font-semibold text-heading-text'>{whyUs.heading}</h2>
				<div className='grid gap-3 sm:grid-cols-3'>
					{whyUs.items.map((item, i) => {
						const Icon = WHY_US_ICONS[i];
						return (
							<div key={item.title} className='rounded-xl bg-button-bg p-4'>
								<div className='mb-1 flex items-center gap-2'>
									<Icon className='h-5 w-5 shrink-0 text-text opacity-80' aria-hidden />
									<p className='font-semibold text-text'>{item.title}</p>
								</div>
								<p className='text-sm text-text opacity-75'>{item.text}</p>
							</div>
						);
					})}
				</div>
			</section>

			<section className='mt-6 flex flex-col items-start gap-4 rounded-xl bg-button-bg p-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h2 className='text-lg font-semibold text-heading-text'>{contact.heading}</h2>
					<p className='text-sm text-text opacity-75'>{contact.body}</p>
				</div>
				<a
					href={whatsappUrl}
					data-umami-event='whatsapp-click'
					data-umami-event-location='inventory-page'
					className='inline-flex shrink-0 items-center gap-2 rounded-xl bg-button-focus-bg px-4 py-2 font-medium text-text hover:bg-button-hover-bg'
				>
					<WhatsappIcon className='h-6 w-6' />
					{contact.cta}
				</a>
			</section>
		</div>
	);
}

export default InventoryPage;
