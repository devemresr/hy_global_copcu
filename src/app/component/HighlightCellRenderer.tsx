import { highlightSegments } from '../helpers/inventoryPageHelpers/search.helpers';

export function HighlightCellRenderer({ value, data, colDef }: any) {
	const key = colDef.field;
	const text = String(value ?? '');
	const fieldMatch = data?.matches?.find((m: any) => m.key === key);

	if (!fieldMatch || fieldMatch.indices.length === 0) {
		return <>{text}</>;
	}

	const segments = highlightSegments(text, fieldMatch.indices);
	return (
		<>
			{segments.map((seg, i) =>
				seg.isMatch ? (
					<mark className='dark:bg-gray-500 bg-' key={i}>
						{seg.text}
					</mark>
				) : (
					<span key={i}>{seg.text}</span>
				),
			)}
		</>
	);
}
