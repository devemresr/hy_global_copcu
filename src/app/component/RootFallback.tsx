export function RootFallback() {
	return (
		<div className='flex h-screen items-center justify-center'>
			<div className='text-center'>
				<h1 className='text-xl font-bold text-text'>
					Uygulamada beklenmedik bir hata oluştu
				</h1>
				<p className='text-sm text-muted-foreground text-text'>
					Lütfen sayfayı yenileyip tekrar deneyin.
				</p>
			</div>
		</div>
	);
}
