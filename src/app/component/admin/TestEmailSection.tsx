import { Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { z } from '../../util/zodTurkish';
import useApiMutation from '../../hooks/api/core/useApiMutation';
import { AdminSummary } from './AdminCollapseHeading';
import {
	STOCK_BUTTON,
	STOCK_CONTROL,
} from '../../constants/stockStyles.constant';

export function TestEmailSection() {
	const [to, setTo] = useState('');
	const [error, setError] = useState('');
	const [sentTo, setSentTo] = useState('');
	const send = useApiMutation<{ success: boolean }, { to: string }>({
		url: '/admins/test-email',
		method: 'POST',
	});
	return (
		<details className='mb-3 min-w-0 rounded-xl bg-button-bg p-3 text-sm text-text'>
			<AdminSummary index={3}>
				<Mail size={16} aria-hidden />
				Test e-postası
			</AdminSummary>
			<form
				className='mt-3 space-y-3'
				aria-label='Test e-postası gönder'
				noValidate
				onSubmit={(event) => {
					event.preventDefault();
					if (send.isPending) return;
					const parsed = z
						.string()
						.trim()
						.toLowerCase()
						.max(254)
						.email()
						.safeParse(to);
					setSentTo('');
					if (!parsed.success) {
						setError('Geçerli bir e-posta adresi girin.');
						return;
					}
					setError('');
					send.mutate(
						{ to: parsed.data },
						{
							onSuccess: () => setSentTo(parsed.data),
							onError: (failure) => setError(failure.message),
						},
					);
				}}
			>
				<p className='text-xs text-text/70'>
					Baş yönetici olarak seçtiğiniz adrese bir test e-postası gönderin.
				</p>
				<div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end'>
					<label className='flex min-w-0 max-w-full flex-col gap-1 text-xs sm:w-72'>
						Alıcı e-posta adresi
						<input
							type='email'
							autoComplete='email'
							maxLength={254}
							className={STOCK_CONTROL + ' w-full!'}
							value={to}
							disabled={send.isPending}
							onChange={(event) => {
								setTo(event.target.value);
								setError('');
								setSentTo('');
							}}
						/>
					</label>
					<button
						type='submit'
						className={
							STOCK_BUTTON + ' inline-flex items-center justify-center gap-2'
						}
						disabled={send.isPending}
					>
						<Send size={14} aria-hidden />
						{send.isPending ? 'Gönderiliyor...' : 'Test e-postası gönder'}
					</button>
				</div>
				{error && (
					<p role='alert' className='text-xs text-red-500'>
						{error}
					</p>
				)}
				{sentTo && (
					<p role='status' className='break-words text-xs text-text/80'>
						{sentTo} adresi için e-posta sunucusu gönderimi kabul etti. Gelen
						kutusunu ve spam klasörünü kontrol edin.
					</p>
				)}
			</form>
		</details>
	);
}
