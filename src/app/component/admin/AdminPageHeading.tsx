export function AdminPageHeading({ title }: { title: string }) {
	return (
		<header className='mb-4'>
			<h1 className='text-2xl font-semibold text-text'>{title}</h1>
		</header>
	);
}
