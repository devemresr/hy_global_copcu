import { Eye, EyeOff, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useFinance } from '../../hooks/api/endpoints/useFinance';

const VISIBILITY_KEY = 'admin.header.balance.hidden.v1';

export function AdminHeaderBalance() {
	const [hidden, setHidden] = useState(() => {
		try {
			return localStorage.getItem(VISIBILITY_KEY) === 'true';
		} catch {
			return false;
		}
	});
	const balance = useFinance({}, 1, 1, !hidden);
	const amount = balance.data?.balance;
	return (
		<div className='inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-border px-2 py-1 text-xs text-text'>
			<Wallet size={15} className='shrink-0' aria-hidden />
			<span className='min-w-0 break-words tabular-nums'>
				Bakiye:{' '}
				{hidden
					? '••••••'
					: balance.isError
						? 'Alınamadı'
						: amount === undefined
							? 'Yükleniyor...'
							: amount.toLocaleString('tr-TR', {
									style: 'currency',
									currency: 'TRY',
								})}
			</span>
			<button
				type='button'
				aria-label={hidden ? 'Bakiyeyi göster' : 'Bakiyeyi gizle'}
				title={hidden ? 'Bakiyeyi göster' : 'Bakiyeyi gizle'}
				aria-pressed={hidden}
				className='inline-flex size-8 shrink-0 items-center justify-center rounded hover:bg-button-hover-bg'
				onClick={() => {
					const next = !hidden;
					setHidden(next);
					try {
						localStorage.setItem(VISIBILITY_KEY, String(next));
					} catch {
						/* Keep the toggle usable when storage is unavailable. */
					}
				}}
			>
				{hidden ? (
					<Eye size={15} aria-hidden />
				) : (
					<EyeOff size={15} aria-hidden />
				)}
			</button>
		</div>
	);
}
