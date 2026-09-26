import './App.css';

import { useLayoutEffect } from 'react';
import { useInventoryRows } from './hooks/useInventoryRows';
import { InventoryBrowser } from './component/InventoryBrowser';
import { SquareArrowOutUpRight } from 'lucide-react';
import { useGetItems } from './hooks/api/endpoints/useItems';

function getInitialTheme(): 'light' | 'dark' {
	const saved = localStorage.getItem('theme');
	return saved === 'light' || saved === 'dark'
		? saved
		: window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light';
}

function InventoryPage() {
	// const bellekTipiIncluded = searchParams.has('detayliData');
	const bellekTipiIncluded = true;

	const { data } = useGetItems();
	const { rows, colDef } = useInventoryRows(bellekTipiIncluded, data?.items ?? []);

	useLayoutEffect(() => {
		const theme = getInitialTheme();
		document.documentElement.classList.toggle('dark', theme === 'dark');
	}, []);

	return (
		<div className=' mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 '>
			<div className='bg-button-bg p-4 rounded-xl my-4'>
				<div className='flex items-start gap-3'>
					<p className='text-text flex-1'>
						Anankart alımında anakartın modeli depoloma kapasitesini belirler,
						anakartın modelini nasıl öğrenebileceğinizi öğrenmek için{' '}
						<a
							href='/bilgi'
							className='underline underline-offset-2 font-medium hover:opacity-80 transition-opacity'
						>
							bilgilendirme sayfasını ziyaret edebilirsiniz
							<SquareArrowOutUpRight className='w-5  h-5 inline-block ml-1 -mt-0.5' />
						</a>
					</p>
				</div>
			</div>

			<InventoryBrowser rows={rows} colDef={colDef} />
		</div>
	);
}

export default InventoryPage;
