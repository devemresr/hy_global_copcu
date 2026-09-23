// A bare em dash reads as if it could be real data (a currency symbol, a
// truncated value); spelling out "boş" in muted italics makes "nothing here"
// unambiguous instead.
export function DisplayValue({
	value,
}: {
	value: string | number | null | undefined;
}) {
	if (value === null || value === undefined || value === '') {
		return <span className='italic opacity-60'>boş</span>;
	}
	return <>{value}</>;
}
