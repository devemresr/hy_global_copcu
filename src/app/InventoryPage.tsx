import './App.css';

import { useLayoutEffect } from 'react';
import { useInventoryRows } from './hooks/useInventoryRows';
import { InventoryBrowser } from './component/InventoryBrowser';
import { ArrowRight, Coins, Search, ShieldCheck, Truck, Wallet, ScanSearch } from 'lucide-react';
import { useGetItems } from './hooks/api/endpoints/useItems';
import { inventoryPageContent } from './constants/inventoryPageContent.constant';
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

function InventoryPage() {
	// const bellekTipiIncluded = searchParams.has('detayliData');
	const bellekTipiIncluded = true;

	const { data } = useGetItems();
	const { rows, colDef } = useInventoryRows(bellekTipiIncluded, data?.items ?? []);
	const { hero, steps, whyUs, contact } = inventoryPageContent;

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

			<ol className='mb-6 grid gap-3 sm:grid-cols-3'>
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
								<p className='text-sm text-text opacity-75'>{step.text}</p>
							</div>
						</li>
					);
				})}
			</ol>

			<InventoryBrowser rows={rows} colDef={colDef} />

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
