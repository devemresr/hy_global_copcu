import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { useLogin } from './hooks/api/endpoints/useAuth';

export function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const navigate = useNavigate();
	const { mutate, isPending, error } = useLogin();

	function handleSubmit(e: ChangeEvent) {
		e.preventDefault();
		mutate({ email, password }, { onSuccess: () => navigate('/admin') });
	}

	return (
		<div className='flex min-h-[70vh] items-center justify-center px-4 text-text'>
			<form
				onSubmit={handleSubmit}
				className='w-full max-w-sm flex flex-col gap-4 rounded-2xl border-2 border-border bg-button-bg p-6'
			>
				<h1 className='text-lg font-semibold'>Yönetici Girişi</h1>

				<label className='flex flex-col gap-1 text-sm'>
					E-posta
					<input
						type='email'
						required
						autoComplete='username'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className='rounded-xl border-2 border-border bg-transparent px-3 py-2 outline-none focus:bg-button-focus-bg'
					/>
				</label>

				<label className='flex flex-col gap-1 text-sm'>
					Şifre
					<input
						type='password'
						required
						autoComplete='current-password'
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className='rounded-xl border-2 border-border bg-transparent px-3 py-2 outline-none focus:bg-button-focus-bg'
					/>
				</label>

				{error && <p className='text-sm text-red-500'>{error.message}</p>}

				<button
					type='submit'
					disabled={isPending}
					className='rounded-xl border-2 border-border py-2 font-medium transition-colors hover:bg-button-hover-bg disabled:opacity-50'
				>
					{isPending ? 'Giriş yapılıyor...' : 'Giriş yap'}
				</button>
			</form>
		</div>
	);
}
