import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import {
	isScheduleActive,
	useScheduleClock,
	useSiteStatus,
	type MaintenanceDto,
} from '../hooks/api/endpoints/useSiteStatus';
import { displayPhoneNumber, whatsappUrl } from '../constants/url.constant';
import { SiteNotice } from './SiteNotice';
import { STAFF_PATH_PREFIXES } from '../constants/pagePaths.constant';

// Admins must be able to reach the switch that turns this off.
const EXEMPT_PATH_PREFIXES = STAFF_PATH_PREFIXES;

const DEFAULT_MESSAGE = 'Hizmetimiz geçici olarak kullanılamıyor.';

/**
 * Shows the holding page in place of every public route while maintenance
 * is in its scheduled window. The URL is left alone, so visitors land back
 * on the page they were on once it ends. Nothing renders until the first
 * status check answers, so the site never flashes before the holding page;
 * a failed check fails open.
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
	const { pathname } = useLocation();
	const { data, isPending } = useSiteStatus();
	const now = useScheduleClock(data?.maintenance, data?.notice);

	const exempt = EXEMPT_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
	if (exempt) return <>{children}</>;
	if (isPending) return null;
	if (data && isScheduleActive(data.maintenance, now)) {
		return <HoldingPage maintenance={data.maintenance} />;
	}
	return (
		<>
			{children}
			{data && <SiteNotice notice={data.notice} pathname={pathname} now={now} />}
		</>
	);
}

function HoldingPage({ maintenance }: { maintenance: MaintenanceDto }) {
	// Rendered outside Layout, so it applies the saved theme itself.
	useLayoutEffect(() => {
		const saved = localStorage.getItem('theme');
		document.documentElement.classList.toggle('dark', saved !== 'light');
	}, []);

	const until = maintenance.until
		? new Date(maintenance.until).toLocaleString('tr-TR', {
				dateStyle: 'long',
				timeStyle: 'short',
			})
		: null;

	return (
		<main className='flex min-h-screen items-center justify-center bg-bg px-4 text-text'>
			<div className='w-full max-w-md rounded-xl bg-button-bg p-6 text-center'>
				<Wrench className='mx-auto mb-4 h-10 w-10 opacity-70' aria-hidden />
				<h1 className='mb-2 text-xl font-semibold'>Kısa bir ara verdik</h1>
				<p className='whitespace-pre-line opacity-80'>
					{maintenance.message || DEFAULT_MESSAGE}
				</p>
				<p className='mt-4 text-sm opacity-70'>
					{until
						? `Tahmini açılış: ${until}`
						: 'En kısa sürede tekrar hizmetinizdeyiz.'}
				</p>
				<a
					href={whatsappUrl}
					target='_blank'
					rel='noreferrer'
					className='mt-6 inline-block rounded-xl bg-button-focus-bg px-4 py-2 text-sm font-medium hover:bg-button-hover-bg'
				>
					WhatsApp: {displayPhoneNumber}
				</a>
			</div>
		</main>
	);
}
